export class PathTracerRenderer
{

    /**
     * @type {HTMLCanvasElement}
     */
    canvas;

    /**
     * @type {WebGL2RenderingContext}
     */
    gl;

    /**
     * 
     */
    program;

    /**
     * 
     */
    frameTexture;

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
            this.canvas = canvas;
            this.gl = PathTracerRenderer.initOpenGL(this.canvas);
        }
        
        {
            this._renderTime = 0;
        }

        {
            this._shaderConstants = new Object();
            this._shaderConstants.MAX_BOUNCES = 5;
            this._shaderConstants.SCENE_DATA_COUNT = 0;
            this._shaderConstants.SPHERE_COUNT = 0;
            this._shaderConstants.PLANE_COUNT = 0;
        }
        
        {
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
const float EPSILON = 1e-6;
const int MAX_BOUNCE = ` + this._shaderConstants.MAX_BOUNCES + `;

Sphere spheres[SPHERE_COUNT];
Plane planes[PLANE_COUNT];

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
    bool hit;
    float hitT;
    vec3 hitPoint;
    vec3 hitNormal;
    Material hitMaterial;

    hit = false;
    hitT = 1000.0;

    for(int i = 0; i < SPHERE_COUNT; i++)
    {
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

    /*// Volumes -> uniform
    float density = abs(volumeDensity);
    float t = (-1.0/density * (random()));

    // TODO: check range
    if(t > 0.0)
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

vec3 rayColor(Ray ray)
{
    vec3 color;
    color = vec3(1.0);

    for(int i = 0; i < MAX_BOUNCE; i++)
    {
        Hit hit = rayHit(ray);

        // intersection info 
        rayPass = float(i) + 1.0;

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

        color *= hit.material.color;

        // change ray direction & origin
        ray.origin = hit.point;
        ray.direction = getScatteredDirection(ray.direction, hit.normal, hit.material.reflection, hit.material.refraction, 0.5);
    }

    return color;
}

vec3 averageColor(vec3 color)
{
    vec4 data = texture(texture0, vec2(gl_FragCoord.x / width, gl_FragCoord.y / height));
    vec3 previousPixel = data.xyz;

    float averageDensity = 2.0;

    /*return 
    (sqrt(color) + previousPixel * (float(renderTime) * (1.0/averageDensity))) 
    / 
    (1.0         +                 (float(renderTime) * (1.0/averageDensity)));*/

    return 
    (sqrt(color) + previousPixel * length(previousPixel) * (float(renderTime) * (1.0/averageDensity))) 
    / 
    (1.0         +                 length(previousPixel) * (float(renderTime) * (1.0/averageDensity)));
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
    
    vec3 color = rayColor(ray);

    if(renderTime > 0)
    {
        out1 = vec4(averageColor(color), 1.0);
        return;
    }

    out1 = vec4(sqrt(color), 1.0);
}
        `
    }

    addToScene(...data)
    {

        let sphereCount = 0;
        let planeCount = 0;

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
        }, this);

        this._shaderConstants.SCENE_DATA_COUNT = sphereCount * 13 + planeCount * 16;
        this._shaderConstants.SPHERE_COUNT = sphereCount;
        this._shaderConstants.PLANE_COUNT = planeCount;

        this.recompileShaders();
        this.resetRenderChain();
    }

    recompileShaders()
    {

        let vertexShader = this.gl.createShader(this.gl.VERTEX_SHADER);
        let fragmentShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);

        this.gl.shaderSource(vertexShader, this.getVertexSource());
        this.gl.shaderSource(fragmentShader, this.getFragmentSource());

        this.gl.compileShader(vertexShader);
        this.gl.compileShader(fragmentShader);

        // logs
        if(!this.gl.getShaderParameter(vertexShader, this.gl.COMPILE_STATUS))
        {
            throw new Error(this.gl.getShaderInfoLog(vertexShader));
        }

        if(!this.gl.getShaderParameter(fragmentShader, this.gl.COMPILE_STATUS))
        {
            throw new Error(this.gl.getShaderInfoLog(fragmentShader));
        }

        // program
        this.program = this.gl.createProgram();
        this.gl.attachShader(this.program, vertexShader);
        this.gl.attachShader(this.program, fragmentShader);

        this.gl.linkProgram(this.program);
        this.gl.useProgram(this.program);

        return {vertexShader: vertexShader, fragmentShader: fragmentShader}
    }

    initRenderer()
    {
        // create vertex & fragment shader, & compile them
        this.recompileShaders();

        // create a quad
        let vertices = new Array();
        vertices.push(-1.0,  1.0, 0.0);
        vertices.push(-1.0, -1.0, 0.0);
        vertices.push( 1.0, -1.0, 0.0);
        vertices.push( 1.0,  1.0, 0.0);

        // convert in into a float array for Open-GL
        vertices = new Float32Array(vertices);

        // link the vertices to the vertex shader
        let buffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);

        let location = this.gl.getAttribLocation(this.program, 'vertexPosition');
        this.gl.vertexAttribPointer(location, 3, this.gl.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 0);
        this.gl.enableVertexAttribArray(location);

        {
            this.frameTexture = this.gl.createTexture();
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.frameTexture);
            this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.canvas.width, this.canvas.height, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
            this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
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
    }

    _loadFrameIntoTexture()
    {
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.frameTexture);

        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.canvas.width, this.canvas.height, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.canvas);
        this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);

        let location = this.gl.getUniformLocation(this.program, "texture0");
        this.gl.uniform1i(location, 0);

        this.gl.activeTexture(this.gl.TEXTURE0);
    }

    resetRenderChain()
    {
        this._renderTime = 0;
    }

    render()
    {   
        this.clear();

        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);

        function parameters()
        {
            this.fillMemory("width", this.canvas.width);
            this.fillMemory("height", this.canvas.height);
            this.fillMemory("random1", Math.random() * (1 + 1) - 1);
            this.fillMemory("random2", Math.random() * (1 + 1) - 1);
            this.fillMemory("random3", Math.random() * (1 + 1) - 1);
            this.fillMemory("renderTime", this._renderTime, false);

            this.fillMemory("cameraRotationX", this.camera.rotation.x);
            this.fillMemory("cameraRotationY", this.camera.rotation.y);
            this.fillMemory("cameraRotationZ", this.camera.rotation.z);

            this.fillMemory("cameraPositionX", this.camera.position.x);
            this.fillMemory("cameraPositionY", this.camera.position.y);
            this.fillMemory("cameraPositionZ", this.camera.position.z);

            this.fillMemory("backgrounColorR", this._backgroundColor.r);
            this.fillMemory("backgrounColorG", this._backgroundColor.g);
            this.fillMemory("backgrounColorB", this._backgroundColor.b);
        }

        parameters.call(this);
        
        this.gl.drawArrays(this.gl.TRIANGLE_FAN, 0, 4);

        this._loadFrameIntoTexture();
        this._renderTime ++;
    }

    fillMemory(uniformName, value, float = true)
    {
        let location = this.gl.getUniformLocation(this.program, uniformName);

        if(!float)
        {
            this.gl.uniform1i(location, value);
            return;
        }

        // make sure it's a floating number
        this.gl.uniform1f(location, new Float32Array([value])[0]);
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