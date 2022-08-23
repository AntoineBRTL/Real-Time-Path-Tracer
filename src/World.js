export class World
{
    content;

    constructor()
    {
        this.content = new Array();
    }

    add(...obj)
    {
        this.content.push(...obj);
    }
}