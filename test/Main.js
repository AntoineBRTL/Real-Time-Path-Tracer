import { PathTracerRenderer } from "../src/PathTracerRenderer.js";

export class Main
{
    constructor()
    {
        // Create a canvas & scale it
        let canvas = this.createCanvas();
        this.stylizeBody().appendChild(canvas);

        // Init a renderer
        let renderer = new PathTracerRenderer(canvas, "../src/shader/PathTracer.vert", "../src/shader/PathTracer.frag", function()
        {

            // Positionate the camera
            renderer.camera.position.y = 1.0;
            renderer.camera.position.z = 5.0;

            // Start the render loop
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