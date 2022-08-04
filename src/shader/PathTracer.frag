#version 300 es
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

out vec4 fragColor;

in mat4 cameraRotationMatrix;
uniform float cameraPositionX;
uniform float cameraPositionY;
uniform float cameraPositionZ;

vec2 rand;

uniform float width;
uniform float height;

uniform float random1;
uniform float random2;

uniform sampler2D previousFrame;
uniform int renderTime;

const int SPHERE_COUNT = 2;
const int PLANE_COUNT = 8;
const float EPSILON = 1e-6;
const int MAX_BOUNCE = 500;

Sphere spheres[SPHERE_COUNT];
Plane planes[PLANE_COUNT];

float random(){

    float random1 = fract(sin(dot(rand.xy * random2, vec2(12.9898,78.233))) * 43758.5453123);

    random1 = (random1 * 2.0) - 1.0; // range [-1, 1]

    rand.x = dot(vec2(random2), rand * random1);
    rand.y = dot(vec2(random2), rand / random1);

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

        if(delta <= 0.0)
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

        if(t <= -EPSILON && t >= EPSILON)
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
                        hitNormal = planes[i].normal;
                    }  
                }
            }
        }
    }

    // Volumes -> uniform
    float density = 0.0;
    float t = (-1.0/density * log(random())) / length(ray.direction);
    if(t < hitT)
    {
        // nearest intersection
        hit = true;
        hitT = t;
        hitMaterial = Material(vec3(1.0, 1.0, 1.0), vec3(0.0, 0.0, 0.0), 0.0, 0.0);
        vec3 point = rayAt(ray, t);
        hitPoint = point;
        hitNormal = randomVec3();
    }

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
        if(reflectance(cosTheta, ir) >= (random1 + 1.0) / 2.0)
        {
            refracted = reflection > 0.0 ? reflected : reflect(i, n);
        }
        else
        {
            refracted = refract(i, n, ir);
        }
    }

    return normalize(diffuse * (1.0 - min(reflection + refraction, 1.0)) + reflected * reflection + refracted * refraction);
}

vec3 rayColor(Ray ray)
{
    vec3 color;
    color = vec3(1.0);

    for(int i = 0; i < MAX_BOUNCE; i++)
    {
        Hit hit = rayHit(ray);

        if(!hit.hit)
        {
            // color *= vec3(0.5, 0.7, 1.0);
            color *= vec3(0.01);
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
    vec3 previousPixel = texture(previousFrame, vec2(gl_FragCoord.x / width, gl_FragCoord.y / height)).xyz;
    float averageDensity = 1.0;

    return (sqrt(color) + previousPixel * length(previousPixel) * (float(renderTime) * 1.0/averageDensity)) / (1.0 + length(previousPixel) * (float(renderTime) * 1.0/averageDensity));
    /*float maxRGB = max(previousPixel.x, max(previousPixel.y, previousPixel.z));
    float minRGB = min(previousPixel.x, min(previousPixel.y, previousPixel.z));
    float luminosity = (1.0/2.0 * (maxRGB + minRGB)) / 100.0;
    float saturation = (maxRGB - minRGB) / (1.0 - abs(2.0 * luminosity - 1.0));
    float factor = exp(saturation * 0.7) - 1.0;
    return (sqrt(color) + previousPixel * factor * float(renderTime)) / (1.0 + factor * float(renderTime));*/
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

    spheres[0] = Sphere(vec3(0.0, 0.0, 0.0), 0.5, Material(vec3(0.5, 0.5, 0.5), vec3(0.0, 0.0, 0.0), 0.0, 0.0));
    //spheres[1] = Sphere(vec3(0.0, 0.05, 0.0), 0.45, Material(vec3(0.2, 0.2, 0.8), vec3(0.0, 0.0, 5.0), 0.0, 0.0));
    planes[0] = Plane(vec3(0.0, -0.5, 0.0), vec3(0.0, 1.0, 0.0), 2.0, Material(vec3(0.5, 0.5, 0.5), vec3(0.0, 0.0, 0.0), 0.0, 0.0));
    planes[1] = Plane(vec3(0.0, 1.5, -2.0), vec3(0.0, 0.0, 1.0), 2.0, Material(vec3(0.5, 0.5, 0.5), vec3(0.0, 0.0, 0.0), 0.0, 0.0));
    planes[2] = Plane(vec3(2.0, 1.5, 0.0), vec3(-1.0, 0.0, 0.0), 2.0, Material(vec3(0.5, 0.5, 0.5), vec3(0.0, 0.0, 0.0), 0.0, 0.0));
    planes[3] = Plane(vec3(1.99, 0.5, 0.0), vec3(-1.0, 0.0, 0.0), 1.0, Material(vec3(0.5, 0.5, 0.5), vec3(0.2, 0.2, 4.0), 0.0, 0.0));
    planes[4] = Plane(vec3(-2.0, 1.5, 0.0), vec3(1.0, 0.0, 0.0), 2.0, Material(vec3(0.5, 0.5, 0.5), vec3(0.0, 0.0, 0.0), 0.0, 0.0));
    planes[5] = Plane(vec3(-1.99, 0.5, 0.0), vec3(1.0, 0.0, 0.0), 1.0, Material(vec3(0.5, 0.5, 0.5), vec3(4.0, 0.2, 2.0), 0.0, 0.0));
    planes[6] = Plane(vec3(0.0, 3.5, 0.0), vec3(0.0, -1.0, 0.0), 2.0, Material(vec3(0.5, 0.5, 0.5), vec3(0.0, 0.0, 0.0), 0.0, 0.0));
    // planes[7] = Plane(vec3(0.0, 3.49, 0.0), vec3(0.0, -1.0, 0.0), 1.0, Material(vec3(0.5, 0.5, 0.5), vec3(2.0, 2.0, 2.0), 0.0, 0.0));
    //planes[5] = Plane(vec3(0.0, 3.49, 0.0), vec3(0.0, -1.0, 0.0), 1.0, Material(vec3(1.0, 1.0, 1.0), vec3(30.0, 30.0, 30.0)));

    vec3 color = rayColor(ray);

    if(renderTime > 0)
    {
        fragColor = vec4(averageColor(color), 1.0);
        return;
    }

    fragColor = vec4(sqrt(color), 1.0);
}