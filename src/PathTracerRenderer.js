export class PathTracerRenderer
{

    /**
     * @type {HTMLCanvasElement}
     */
    postprocessingCanvas;

    /**
     * @type {HTMLCanvasElement}
     */
    renderingCanvas;

    /**
     * @type {WebGL2RenderingContext}
     */
    gl;

    /**
     * @type {WebGLProgram}
     */
    program;

    /**
     * @type {WebGLTexture}
     */
    frameTexture;

    /**
     * @type {WebGL2RenderingContext}
     */
    postprocessingGl;

    /**
     * @type {WebGLProgram}
     */
    postprocessinProgram;

    /**
     * @type {WebGLTexture}
     */
    postprocessingFrameTexture;

    /**
     * @type {number}
     */
    _renderTime;

    /**
     * @type {Object}
     */
    camera;

    /**
     * @type {Object}
     */
    _backgroundColor;

    /**
     * @type {String}
     */
    _scene;

    /**
     * @type {Object}
     */
    _shaderConstants;

    constructor(canvas, vertexShaderPath, fragmentShaderPath, callback)
    {
        {
            this.postprocessingCanvas = canvas;

            // clone the canvas 
            this.renderingCanvas = document.createElement('canvas');

            this.renderingCanvas.width = this.postprocessingCanvas.width;
            this.renderingCanvas.height = this.postprocessingCanvas.height;

            window.addEventListener("resize", function(){
                this.renderingCanvas.width = this.postprocessingCanvas.width;
                this.renderingCanvas.height = this.postprocessingCanvas.height;
            }.bind(this));

            this.gl = PathTracerRenderer.initOpenGL(this.renderingCanvas);
            this.postprocessingGl = PathTracerRenderer.initOpenGL(this.postprocessingCanvas);
        }

        {
            this._shaderConstants = new Object();
            this._shaderConstants.MAX_BOUNCES = 5;
            this._shaderConstants.SCENE_DATA_COUNT = 0;
            this._shaderConstants.SPHERE_COUNT = 0;
            this._shaderConstants.PLANE_COUNT = 0;
            this._shaderConstants.LASER_COUNT = 0;
        }
        
        {
            this._renderTime = 0;
            this._backgroundColor = {r:0.01, g:0.01, b:0.01};
            this.volumeDensity = 0.0;
            this._scene = "// wrote by the program \n";
        }

        {
            this.camera = {rotation: {x: 0.0, y: 0.0, z: 0.0}, position: {x: 0.0, y: 0.0, z: 0.0}};
        }

        this.initRenderer(vertexShaderPath, fragmentShaderPath, callback);
    }

    setBackgroundColor(color)
    {
        this._backgroundColor = color;
        this.resetRenderChain();
    }

    setMaxBounces(x)
    {
        this._shaderConstants.MAX_BOUNCES = x;
        this.recompileShaders();
        this.resetRenderChain();
    }

    getVertexSource()
    {
        return`#version 300 es
precision mediump float;

in vec3 vertexPosition;

out mat4 cameraRotationMatrix;
uniform float cameraRotationX;
uniform float cameraRotationY;
uniform float cameraRotationZ;

mat4 rotationMatrix(vec3 axis, float angle)
{
    axis = normalize(axis);
    float s = sin(angle);
    float c = cos(angle);
    float oc = 1.0 - c;
    
    return mat4(oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,  0.0,
                oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,  0.0,
                oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c,           0.0,
                0.0,                                0.0,                                0.0,                                1.0);
}

void main(){

    cameraRotationMatrix = rotationMatrix(vec3(1.0, 0.0, 0.0), cameraRotationX * 3.14/180.0) * rotationMatrix(vec3(0.0, 1.0, 0.0), cameraRotationY * 3.14/180.0) * rotationMatrix(vec3(0.0, 0.0, 1.0), cameraRotationZ * 3.14/180.0);
    gl_Position = vec4(vertexPosition, 1.0);
}
`
    }

    getFragmentSource()
    {
        return `#version 300 es
precision mediump float;

struct Material
{
    vec3 color;
    vec3 emissive;
    float reflection;
    float refraction;
};

struct Hit
{
    bool hit;
    vec3 point;
    vec3 normal;
    Material material;
};

struct Sphere 
{
    vec3 center;
    float radius;
    Material material;
};

struct Plane
{
    vec3 center;
    vec3 normal;
    float size;
    Material material;
};

struct Laser
{
    vec3 center;
    vec3 normal;
    Material material;
};

struct Ray
{
    vec3 origin;
    vec3 direction;
};

struct Camera
{
    vec3 position;
    float focalLength;
};

// output buffer
layout(location = 0) out vec4 out1;

in mat4 cameraRotationMatrix;
uniform float cameraPositionX;
uniform float cameraPositionY;
uniform float cameraPositionZ;

vec2 rand;
float rayPass;

uniform float width;
uniform float height;

uniform float random1;
uniform float random2;
uniform float random3;

uniform sampler2D texture0;
uniform sampler2D texture1;
uniform sampler2D texture2;
uniform int renderTime;

uniform float backgrounColorR;
uniform float backgrounColorG;
uniform float backgrounColorB;

const int SPHERE_COUNT = ` + Math.max(1, this._shaderConstants.SPHERE_COUNT) + `;
const int PLANE_COUNT = ` + Math.max(1, this._shaderConstants.PLANE_COUNT) + `;
const int LASER_COUNT = ` + Math.max(1, this._shaderConstants.LASER_COUNT) + `;
const float EPSILON = 1e-5;
const int MAX_BOUNCE = ` + this._shaderConstants.MAX_BOUNCES + `;
const int LIGHT_MAX_BOUNCE = 5;

Sphere spheres[SPHERE_COUNT];
Plane planes[PLANE_COUNT];
Laser lasers[LASER_COUNT];

vec3 nearestEmissivePosition;
vec3 nearestEmissiveNormal;
vec3 nearestEmissiveEmission;
float nearestEmissiveDistance;

float random(){

    float random1 = fract(sin(dot(rand.xy * random2, vec2(12.9898,78.233))) * 43758.5453123);

    random1 = (random1 * 2.0) - 1.0; // range [-1, 1]

    rand.x = dot(vec2(random2), rand * random1);
    rand.y = dot(vec2(random3), rand / random1);

    rand = normalize(rand);

    return random1;
}

float random(vec2 st){

    float random1 = fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);

    random1 = (random1 * 2.0) - 1.0; // range [-1, 1]

    return random1;
}

vec3 randomVec3()
{
    return vec3(random(), random(), random());
}

// schlick approximation
float reflectance(float cosine, float ref_idx) {
    // Use Schlick's approximation for reflectance.
    float r0 = (1.0 - ref_idx) / (1.0 + ref_idx);
    r0 = pow(r0, 2.0);
    return r0 + (1.0 - r0) * pow((1.0 - cosine), 5.0);
}

Ray getRay(Camera camera)
{
    vec3 origin = camera.position;

    float denom = min(width, height);
    vec3 direction = vec3(
        (gl_FragCoord.x + (random1 * 0.5) - width / 2.0) / denom,
        (gl_FragCoord.y + (random2 * 0.5) - height / 2.0) / denom,
        -camera.focalLength
    );

    return Ray(origin, normalize(direction * mat3(cameraRotationMatrix)));
}

vec3 rayAt(Ray ray, float t)
{
    return ray.origin + ray.direction * t;
}

// TODO: Optimize time execution
Hit rayHit(Ray ray)
{

    nearestEmissiveDistance = random();

    vec3 cameraPosition = vec3(cameraPositionX, cameraPositionY, cameraPositionZ);

    bool hit;
    float hitT;
    vec3 hitPoint;
    vec3 hitNormal;
    Material hitMaterial;

    hit = false;
    hitT = 1000.0;

    for(int i = 0; i < SPHERE_COUNT; i++)
    {
        //nearest emissive
        if(length(spheres[i].material.emissive) > 0.0)
        {
            if(random() < nearestEmissiveDistance)
            {
                nearestEmissiveDistance = random();
                nearestEmissivePosition = spheres[i].center;
                nearestEmissiveNormal = randomVec3();
                nearestEmissiveEmission = spheres[i].material.emissive;
            }
        }

        vec3 distanceFromCenter = ray.origin - spheres[i].center;

        float b = 2.0 * dot(ray.direction, distanceFromCenter);
        float c = dot(distanceFromCenter, distanceFromCenter) - pow(spheres[i].radius, 2.0);

        float delta = pow(b, 2.0) - 4.0 * c;

        if(delta < 0.0)
        {
            // no intersection at all 
            continue;
        }

        float t = (- b - sqrt(delta)) / 2.0;

        if(t <= EPSILON)
        {
            // intersection behind the camera or too near
            continue;
        }

        hit = true;

        if(t < hitT)
        {
            // nearest intersection
            hitT = t;
            hitMaterial = spheres[i].material;
            hitPoint = rayAt(ray, t);
            hitNormal = normalize(hitPoint - spheres[i].center);
        }
    }

    for(int i = 0; i < PLANE_COUNT; i++)
    {
        //nearest emissive
        if(length(planes[i].material.emissive) > 0.0)
        {
            if(random() < nearestEmissiveDistance)
            {
                nearestEmissiveDistance = random();
                nearestEmissivePosition = planes[i].center;
                nearestEmissiveNormal = planes[i].normal;
                nearestEmissiveEmission = planes[i].material.emissive;
            }
        }

        vec3 normal = normalize(planes[i].normal);

        float denom = dot(-normal, ray.direction);
        if(denom <= 0.0)
        {
            continue;
        }

        float t = dot(planes[i].center - ray.origin, -normal) / denom;

        if(t <= -EPSILON)
        {
            // intersection behind the camera or too near
            continue;
        }

        if(t < hitT)
        {

            vec3 point = rayAt(ray, t);

            vec3 comp = planes[i].center;

            if(
                point.x <= comp.x + planes[i].size && 
                point.x >= comp.x - planes[i].size
            )
            {
                if(
                point.y <= comp.y + planes[i].size && 
                point.y >= comp.y - planes[i].size
                )
                {
                    if(
                        point.z <= comp.z + planes[i].size && 
                        point.z >= comp.z - planes[i].size
                    )
                    {
                        // nearest intersection
                        hit = true;
                        hitT = t;
                        hitMaterial = planes[i].material;
                        hitPoint = point;
                        hitNormal = normalize(planes[i].normal);
                    }  
                }
            }
        }
    }

    for(int i = 0; i < LASER_COUNT; i++)
    {
        //nearest emissive
        if(length(lasers[i].material.emissive) > 0.0)
        {
            if(random() < nearestEmissiveDistance)
            {
                nearestEmissiveDistance = random();
                nearestEmissivePosition = lasers[i].center;
                nearestEmissiveNormal = lasers[i].normal;
                nearestEmissiveEmission = lasers[i].material.emissive;
            }
        }

        vec3 normal = normalize(lasers[i].normal);

        float co = length(cross(normal, normalize(ray.direction)));
        if(!(co < 1e-2 && co > -1e-2))
        {
            continue;
        }


        float denom = dot(-normal, ray.direction);
        if(denom <= 0.0)
        {
            continue;
        }

        float t = dot(lasers[i].center - ray.origin, -normal) / denom;

        if(t <= -EPSILON)
        {
            // intersection behind the camera or too near
            continue;
        }

        if(t < hitT)
        {

            vec3 point = rayAt(ray, t);

            vec3 comp = lasers[i].center;

            float radius = 0.01;

            if(length(point - lasers[i].center) <= radius)
            {
                // nearest intersection
                hit = true;
                hitT = t;
                hitMaterial = lasers[i].material;
                hitPoint = point;
                hitNormal = normalize(lasers[i].normal);
            }
        }
    }

    // Volumes -> uniform
    float density = 10.0;
    //float t = (-1.0/density * (random()));
    float t = abs(random() * density);

    // TODO: check range
    /*if(t > 0.0)
    {
        if(t < hitT)
        {
            // nearest intersection
            hit = true;
            hitT = t;
            hitMaterial = Material(vec3(0.0, 0.0, 0.0), vec3(0.0, 0.0, 0.0), 0.0, 0.0);
            vec3 point = rayAt(ray, t);
            hitPoint = point;
            hitNormal = vec3(0.0);
        }
    }*/

    return Hit(hit, hitPoint, hitNormal, hitMaterial);
}

vec3 getScatteredDirection(vec3 i, vec3 n, float reflection, float refraction, float ir)
{
    float cosTheta = min(dot(-i, n), 1.0);

    vec3 diffuse = n + randomVec3();
    vec3 reflected = vec3(0.0);
    vec3 refracted = vec3(0.0);

    if(reflection > 0.0)
    {
        reflected = reflect(i, n);
    }

    if(refraction > 0.0)
    {
        if(reflectance(cosTheta, ir) >= (random() + 1.0) / 2.0)
        {
            refracted = reflection > 0.0 ? reflected : reflect(i, n);
        }
        else
        {
            refracted = refract(i, n, ir);
        }
    }

    return normalize(
        diffuse * (1.0 - min(reflection + refraction, 1.0)) + (reflected * reflection) + (refracted * refraction)
    );
}

vec3 rayColor(Ray ray, float ir)
{
    vec3 color;
    color = vec3(1.0);

    vec3 point;

    for(int i = 0; i < MAX_BOUNCE; i++)
    {
        Hit hit = rayHit(ray);

        if(!hit.hit)
        {
            // color *= vec3(0.5, 0.7, 1.0);
            color *= vec3(backgrounColorR, backgrounColorG, backgrounColorB);
            break;
        }

        if(length(hit.material.emissive) > 0.0)
        {
            // light source
            color += hit.material.emissive;
            break;
        }

        if(i == MAX_BOUNCE - 1)
        {
            color = vec3(0.0, 0.0, 0.0);
        }

        color *= hit.material.color;

        point = hit.point;

        // change ray direction & origin
        ray.origin = point;
        ray.direction = getScatteredDirection(ray.direction, hit.normal, hit.material.reflection, hit.material.refraction, ir);
    }

    // bidirectional
    ray.origin = nearestEmissivePosition;
    ray.direction = nearestEmissiveNormal;
    vec3 emissive = nearestEmissiveEmission;

    for(int i = 0; i < LIGHT_MAX_BOUNCE; i++)
    {
        if(i == LIGHT_MAX_BOUNCE - 1)
        {
            // last ray
            ray.direction = normalize(point - ray.origin);

            Hit hit = rayHit(ray);

            if(abs(distance(hit.point, point)) > 1e-16)
            {
                return color;
            }

            color += emissive;
            return color;
        }

        Hit hit = rayHit(ray);

        if(!hit.hit)
        {
            return color;
        }

        ray.origin = hit.point;
        ray.direction = getScatteredDirection(ray.direction, hit.normal, hit.material.reflection, hit.material.refraction, ir);
    }

    return color;
}

float spectralRayColor(Ray ray, vec3 sc)
{
    vec3 table = vec3(
        600.0 * 10e-3,
        550.0 * 10e-3,
        450.0 * 10e-3
    );

    vec3 irs = vec3(
        0.5,
        1.0,
        1.5
    );

    float a = 1.4580;
    float b = 0.00354;
    float ir = a + (b / pow(dot(table, sc), 2.0));

    vec3 color = rayColor(ray, 1.0 / ir);

    return dot(color, sc);
}

vec3 averageColor(vec3 color)
{
    /*vec4 data = texture(texture0, vec2(gl_FragCoord.x / width, gl_FragCoord.y / height));
    vec3 previousPixel = data.xyz;

    float averageDensity = 2.0;*/

    float averagingIndex = 1.0;

    vec3 averagedPixel = texture(texture0, vec2(gl_FragCoord.x / width, gl_FragCoord.y / height)).xyz;
    return (sqrt(color) + averagedPixel * (float(renderTime) - 1.0) / averagingIndex) / (1.0 + (float(renderTime) - 1.0) / averagingIndex);

    /*return 
    (sqrt(color) + previousPixel * (float(renderTime) * (1.0/averageDensity))) 
    / 
    (1.0         +                 (float(renderTime) * (1.0/averageDensity)));

    return 
    (sqrt(color) + previousPixel * length(previousPixel) * (float(renderTime) * (1.0/averageDensity))) 
    / 
    (1.0         +                 length(previousPixel) * (float(renderTime) * (1.0/averageDensity)));*/
}

void main()
{
    rand = normalize(
        vec2(
            random(
                gl_FragCoord.xy + vec2(3.75 * random1, 6.98)
            ),
            random(
                gl_FragCoord.xy + vec2(7.53, 9.38 * random2)
            )
        )
    );

    Camera camera = Camera(vec3(cameraPositionX, cameraPositionY, cameraPositionZ), 1.0);
    Ray ray = getRay(camera);

    `
    
    + this._scene +
    
    `
    
    /*vec3 color = vec3(
        spectralRayColor(ray, vec3(1.0, 0.0, 0.0)),
        spectralRayColor(ray, vec3(0.0, 1.0, 0.0)),
        spectralRayColor(ray, vec3(0.0, 0.0, 1.0))
    );*/

    vec3 color = rayColor(ray, 0.5);

    if(renderTime > 0)
    {
        out1 = vec4(averageColor(color), 1.0);
        return;
    }

    out1 = vec4(sqrt(color), 1.0);
}
        `
    }

    getPostProcessingVertexSource()
    {
        return `#version 300 es
precision mediump float;

in vec3 vertexPosition;

void main()
{
    gl_Position = vec4(vertexPosition, 1.0);
}
`;
    }

    getPostProcessingFragmentSource()
    {
        return `#version 300 es
precision mediump float;

uniform float width;
uniform float height;
uniform sampler2D texture0;

layout(location = 0) out vec4 out1;

void main()
{
    vec2 uv = gl_FragCoord.xy / vec2(width, height);

    // TODO: add a denoising system
    out1 = texture(texture0, uv);
}
`;
    }

    addToScene(...data)
    {

        let sphereCount = 0;
        let planeCount = 0;
        let laserCount = 0;

        let floatPrecision = 5;

        data.forEach(function(d){

            if(d.constructor.name == "Sphere")
            {
                let position = "vec3(" + d.position.x.toFixed(floatPrecision) + "," + d.position.y.toFixed(floatPrecision) + "," + d.position.z.toFixed(floatPrecision) + ")";

                let color = "vec3(" + d.color.r.toFixed(floatPrecision) + "," + d.color.g.toFixed(floatPrecision) + "," + d.color.b.toFixed(floatPrecision) + ")";
                let emissive = "vec3(" + d.emissive.r.toFixed(floatPrecision) + "," + d.emissive.g.toFixed(floatPrecision) + "," + d.emissive.b.toFixed(floatPrecision) + ")";

                let material = "Material(" + color + ", " + emissive + ", " + d.reflectance.toFixed(floatPrecision) + ", " + d.refractance.toFixed(floatPrecision) +")";

                this._scene += "spheres[" + sphereCount + "] = Sphere(" + position + ", " + d.radius.toFixed(floatPrecision) + ", " + material +");\n";

                sphereCount ++;
            }

            if(d.constructor.name == "Plane")
            {
                let position = "vec3(" + d.position.x.toFixed(floatPrecision) + "," + d.position.y.toFixed(floatPrecision) + "," + d.position.z.toFixed(floatPrecision) + ")";
                let normal = "vec3(" + d.orientation.x.toFixed(floatPrecision) + "," + d.orientation.y.toFixed(floatPrecision) + "," + d.orientation.z.toFixed(floatPrecision) + ")";

                let color = "vec3(" + d.color.r.toFixed(floatPrecision) + "," + d.color.g.toFixed(floatPrecision) + "," + d.color.b.toFixed(floatPrecision) + ")";
                let emissive = "vec3(" + d.emissive.r.toFixed(floatPrecision) + "," + d.emissive.g.toFixed(floatPrecision) + "," + d.emissive.b.toFixed(floatPrecision) + ")";

                let material = "Material(" + color + ", " + emissive + ", " + d.reflectance.toFixed(floatPrecision) + ", " + d.refractance.toFixed(floatPrecision) +")";

                this._scene += "planes[" + planeCount + "] = Plane(" + position + ", " + normal + ", " + d.size.toFixed(floatPrecision) + ", " + material +");\n";

                planeCount ++;
            }

            if(d.constructor.name == "Laser")
            {
                let position = "vec3(" + d.position.x.toFixed(floatPrecision) + "," + d.position.y.toFixed(floatPrecision) + "," + d.position.z.toFixed(floatPrecision) + ")";
                let normal = "vec3(" + d.orientation.x.toFixed(floatPrecision) + "," + d.orientation.y.toFixed(floatPrecision) + "," + d.orientation.z.toFixed(floatPrecision) + ")";

                let color = "vec3(1.0, 1.0, 1.0)";
                let emissive = "vec3(" + d.emissive.r.toFixed(floatPrecision) + "," + d.emissive.g.toFixed(floatPrecision) + "," + d.emissive.b.toFixed(floatPrecision) + ")";

                let material = "Material(" + color + ", " + emissive + ", 0.0, 0.0)";

                this._scene += "lasers[" + laserCount + "] = Laser(" + position + ", " + normal + ", " + material +");\n";

                laserCount ++;
            }
        }, this);

        this._shaderConstants.SCENE_DATA_COUNT = sphereCount * 13 + planeCount * 16;
        this._shaderConstants.SPHERE_COUNT = sphereCount;
        this._shaderConstants.PLANE_COUNT = planeCount;
        this._shaderConstants.LASER_COUNT = laserCount;

        this.recompileShaders();
        this.resetRenderChain();
    }

    recompileShaders()
    {
        this.compileShader(this.gl, this.getVertexSource(), this.getFragmentSource(), false);
    }

    compileShader(gl, v, f, denoiser)
    {
        let vertexShader = gl.createShader(gl.VERTEX_SHADER);
        let fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);

        gl.shaderSource(vertexShader, v);
        gl.shaderSource(fragmentShader, f);

        gl.compileShader(vertexShader);
        gl.compileShader(fragmentShader);

        // logs
        if(!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS))
        {
            throw new Error(gl.getShaderInfoLog(vertexShader));
        }

        if(!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS))
        {
            throw new Error(gl.getShaderInfoLog(fragmentShader));
        }

        // program
        let program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);

        gl.linkProgram(program);
        gl.useProgram(program);

        if(denoiser)
        {
            this.postprocessinProgram = program;
        }
        else
        {
            this.program = program;
        }

        return {vertexShader: vertexShader, fragmentShader: fragmentShader}
    }

    initRenderer()
    {
        // create vertex & fragment shader, & compile them
        this.compileShader(this.gl, this.getVertexSource(), this.getFragmentSource(), false);

        // create a quad
        let vertices = new Array();
        vertices.push(-1.0,  1.0, 0.0);
        vertices.push(-1.0, -1.0, 0.0);
        vertices.push( 1.0, -1.0, 0.0);
        vertices.push( 1.0,  1.0, 0.0);

        // convert in into a float array for Open-GL
        vertices = new Float32Array(vertices);

        {
            // link the vertices to the vertex shader
            let buffer = this.gl.createBuffer();
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);

            let location = this.gl.getAttribLocation(this.program, 'vertexPosition');
            this.gl.vertexAttribPointer(location, 3, this.gl.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 0);
            this.gl.enableVertexAttribArray(location);
        }
        
        {
            this.frameTexture = this.gl.createTexture();
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.frameTexture);
            this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.postprocessingCanvas.width, this.postprocessingCanvas.height, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
            this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
        }

        // POST PROCESSING

        this.compileShader(this.postprocessingGl, this.getPostProcessingVertexSource(), this.getPostProcessingFragmentSource(), true);

        {
            // link the vertices to the vertex shader
            let buffer = this.postprocessingGl.createBuffer();
            this.postprocessingGl.bindBuffer(this.postprocessingGl.ARRAY_BUFFER, buffer);
            this.postprocessingGl.bufferData(this.postprocessingGl.ARRAY_BUFFER, vertices, this.postprocessingGl.STATIC_DRAW);

            let location = this.postprocessingGl.getAttribLocation(this.postprocessinProgram, 'vertexPosition');
            this.postprocessingGl.vertexAttribPointer(location, 3, this.postprocessingGl.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 0);
            this.postprocessingGl.enableVertexAttribArray(location);
        }

        {
            this.postprocessingFrameTexture = this.postprocessingGl.createTexture();
            this.postprocessingGl.bindTexture(this.postprocessingGl.TEXTURE_2D, this.postprocessingFrameTexture);
            this.postprocessingGl.texImage2D(this.postprocessingGl.TEXTURE_2D, 0, this.postprocessingGl.RGBA, this.postprocessingCanvas.width, this.postprocessingCanvas.height, 0, this.postprocessingGl.RGBA, this.postprocessingGl.UNSIGNED_BYTE, null);
            this.postprocessingGl.pixelStorei(this.postprocessingGl.UNPACK_FLIP_Y_WEBGL, true);
            this.postprocessingGl.texParameteri(this.postprocessingGl.TEXTURE_2D, this.postprocessingGl.TEXTURE_WRAP_S, this.postprocessingGl.CLAMP_TO_EDGE);
            this.postprocessingGl.texParameteri(this.postprocessingGl.TEXTURE_2D, this.postprocessingGl.TEXTURE_WRAP_S, this.postprocessingGl.CLAMP_TO_EDGE);
            this.postprocessingGl.texParameteri(this.postprocessingGl.TEXTURE_2D, this.postprocessingGl.TEXTURE_MIN_FILTER, this.postprocessingGl.LINEAR);
            this.postprocessingGl.texParameteri(this.postprocessingGl.TEXTURE_2D, this.postprocessingGl.TEXTURE_MAG_FILTER, this.postprocessingGl.LINEAR);
        }

        this.resetRenderChain();

        window.addEventListener("resize", function() 
        {
            this.resetRenderChain();
        }.bind(this));
    }

    clear()
    {
        this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        this.postprocessingGl.clearColor(0.0, 0.0, 0.0, 1.0);
        this.postprocessingGl.clear(this.gl.COLOR_BUFFER_BIT);

        this.gl.viewport(0, 0, this.postprocessingCanvas.width, this.postprocessingCanvas.height);
        this.postprocessingGl.viewport(0, 0, this.postprocessingCanvas.width, this.postprocessingCanvas.height);
    }

    _loadFrameIntoTexture()
    {
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.frameTexture);

        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.renderingCanvas.width, this.renderingCanvas.height, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.renderingCanvas);
        this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);

        let location = this.gl.getUniformLocation(this.program, "texture0");
        this.gl.uniform1i(location, 0);

        this.gl.activeTexture(this.gl.TEXTURE0);

        // post processing

        this.postprocessingGl.bindTexture(this.postprocessingGl.TEXTURE_2D, this.postprocessingFrameTexture);

        this.postprocessingGl.texImage2D(this.postprocessingGl.TEXTURE_2D, 0, this.postprocessingGl.RGBA, this.renderingCanvas.width, this.renderingCanvas.height, 0, this.postprocessingGl.RGBA, this.postprocessingGl.UNSIGNED_BYTE, this.renderingCanvas);
        this.postprocessingGl.pixelStorei(this.postprocessingGl.UNPACK_FLIP_Y_WEBGL, true);

        let locationd = this.postprocessingGl.getUniformLocation(this.postprocessinProgram, "texture0");
        this.postprocessingGl.uniform1i(locationd, 0);

        this.postprocessingGl.activeTexture(this.postprocessingGl.TEXTURE0);
    }

    resetRenderChain()
    {
        this._renderTime = 0;
    }

    render()
    {   
        this.clear();

        {
            this.fillMemory(this.gl, this.program, "width", this.postprocessingCanvas.width);
            this.fillMemory(this.gl, this.program, "height", this.postprocessingCanvas.height);
            this.fillMemory(this.postprocessingGl, this.postprocessinProgram, "width", this.postprocessingCanvas.width);
            this.fillMemory(this.postprocessingGl, this.postprocessinProgram, "height", this.postprocessingCanvas.height);
            this.fillMemory(this.gl, this.program, "random1", Math.random() * (1 + 1) - 1);
            this.fillMemory(this.gl, this.program, "random2", Math.random() * (1 + 1) - 1);
            this.fillMemory(this.gl, this.program, "random3", Math.random() * (1 + 1) - 1);
            this.fillMemory(this.gl, this.program, "renderTime", this._renderTime, false);

            this.fillMemory(this.gl, this.program, "cameraRotationX", this.camera.rotation.x);
            this.fillMemory(this.gl, this.program, "cameraRotationY", this.camera.rotation.y);
            this.fillMemory(this.gl, this.program, "cameraRotationZ", this.camera.rotation.z);

            this.fillMemory(this.gl, this.program, "cameraPositionX", this.camera.position.x);
            this.fillMemory(this.gl, this.program, "cameraPositionY", this.camera.position.y);
            this.fillMemory(this.gl, this.program, "cameraPositionZ", this.camera.position.z);

            this.fillMemory(this.gl, this.program, "backgrounColorR", this._backgroundColor.r);
            this.fillMemory(this.gl, this.program, "backgrounColorG", this._backgroundColor.g);
            this.fillMemory(this.gl, this.program, "backgrounColorB", this._backgroundColor.b);
        }
        
        {
            this.gl.drawArrays(this.gl.TRIANGLE_FAN, 0, 4);
            this.postprocessingGl.drawArrays(this.gl.TRIANGLE_FAN, 0, 4);
        }
        
        {
            this._loadFrameIntoTexture();
            this._renderTime ++;
        }
    }

    fillMemory(gl, program, uniformName, value, float = true)
    {
        let location = gl.getUniformLocation(program, uniformName);

        if(!float)
        {
            gl.uniform1i(location, value);
            return;
        }

        // make sure it's a floating number
        gl.uniform1f(location, value);
    }

    static initOpenGL(canvas)
    {
        let gl = canvas.getContext('webgl2');

        if(!gl)
        {
            throw new Error("Can't init OpenGL");
        }

        return gl;
    }
}