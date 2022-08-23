import { PathTracerRenderer } from "../src/PathTracerRenderer.js";
import { Sphere } from "../src/Sphere.js";

export class Main
{
    constructor()
    {
        let canvas = this.createCanvas();
        this.stylizeBody().appendChild(canvas);

        let sphere = new Sphere({x: -0.5, y: -0.2, z: 1.0}, 0.3, 0.0, 0.0);
        let sphere2 = new Sphere({x: 1.0, y: 0.0, z: -0.5}, 0.5, 1.0, 0.0);

        let renderer = new PathTracerRenderer(canvas);
        renderer.camera.position.y = 1.0;
        renderer.camera.position.z = 5.0;

        renderer.addToScene(sphere, sphere2);

        function loop() 
        {
            renderer.render();
            window.requestAnimationFrame(loop);
        }

        loop();
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
    (new FPSMeter({ui: true})).start();
}