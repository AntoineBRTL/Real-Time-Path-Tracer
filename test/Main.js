import { PathTracerRenderer } from "../src/PathTracerRenderer.js";

export class Main
{
    constructor()
    {
        let canvas = this.createCanvas();
        this.stylizeBody().appendChild(canvas);

        let renderer = new PathTracerRenderer(canvas, "../src/shader/PathTracer.vert", "../src/shader/PathTracer.frag", function()
        {
            renderer.camera.position.y = 1.0;
            renderer.camera.position.z = 5.0;

            function loop() 
            {
                renderer.render();
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