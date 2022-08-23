import { PathTracerRenderer } from "../src/PathTracerRenderer.js";
import { World } from "../src/World.js";
import { Sphere } from "../src/Sphere.js";

export class Main
{
    constructor()
    {
        let canvas = this.createCanvas();
        this.stylizeBody().appendChild(canvas);

        let world = new World();
        let sphere = new Sphere({x: 0, y: 2, z: 0}, 0.5, 0.0, 0.0);

        world.add(sphere);

        let renderer = new PathTracerRenderer(canvas, "../src/shader/PathTracer.vert", "../src/shader/PathTracer.frag", function()
        {
            renderer.camera.position.y = 1.0;
            renderer.camera.position.z = 5.0;

            function loop() 
            {
                renderer.render(world);
                window.requestAnimationFrame(loop);
            }

            loop();
        });
    }

    createCanvas()
    {
        let canvas = document.createElement("canvas");
        resize();
        // resize event
        window.addEventListener("resize", resize);
        function resize()
        {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        return canvas;
    }

    stylizeBody()
    {
        document.body.style.margin = "0px";
        return document.body;
    }
}

window.onload = function()
{
    new Main();
}