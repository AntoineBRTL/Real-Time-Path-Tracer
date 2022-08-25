export class Plane
{
    position;

    orientation;

    size;

    color;

    emissive;

    reflectance;

    refractance;

    constructor(position, orientation, size, color, emissive, reflectance, refractance)
    {
        this.position = position;
        this.orientation = orientation;
        this.size = size;
        this.color = color;
        this.emissive = emissive;
        this.reflectance = reflectance;
        this.refractance = refractance;
    }
}