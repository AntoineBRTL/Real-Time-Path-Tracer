export class Sphere
{
    position;

    radius;

    reflectance;

    refractance;

    constructor(position, radius, reflectance, refractance)
    {
        this.position = position;
        this.radius = radius;
        this.reflectance = reflectance;
        this.refractance = refractance;
    }
}