export class Sphere
{
    position;

    radius;

    color;

    emissive;

    reflectance;

    refractance;

    constructor(position, radius, color, emissive, reflectance, refractance)
    {
        this.position = position;
        this.radius = radius;
        this.color = color;
        this.emissive = emissive;
        this.reflectance = reflectance;
        this.refractance = refractance;
    }
}