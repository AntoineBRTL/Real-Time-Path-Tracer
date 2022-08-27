# Real-Time Path-Tracer
Fast high fidelity ray-tracing rendering program.

This program is written in Javascript and GLSL, and can be run in a browser or any browser-like libraries from Node-JS like [Electron](https://www.electronjs.org/).

No external libraries are needed to run this program.

## Try the demo
1. Run `git clone git@github.com:AntoineBRTL/Real-Time-Path-Tracer.git .`.
2. Make sure your browser uses your main graphics card, see [here](https://superuser.com/questions/645918/how-to-run-google-chrome-with-nvidia-card-optimus).
3. Open the [HTML](https://github.com/AntoineBRTL/Real-Time-Path-Tracer/blob/main/test/index.html) file in your browser.
4. You may have to run a small server, see [here](https://www.npmjs.com/package/live-server).

What we get: ![alt text](./demo.PNG)

## Run informations

Tested on a 75 Hz screen using a [NVIDIA GeForce GTX 970M](https://www.techpowerup.com/gpu-specs/geforce-gtx-970m.c2623) without any rendering hierarchy.

| Object count | 10 | 120 |
| --- | --- | --- |
| FPS Average | 75 | 75 |

On the demo scene, I got one frame rendered at an average of 0.3 ms.

## How to use

Methods you may have to use :

- `PathTracerRenderer.render()` renders one frame - note that multiple frames are needed to get a clear image.
- `PathTracerRenderer.resetRenderChain()` breaks the rendering chain which also break the averaging chain.
- `PathTracerRenderer.addToScene(objects:object[])` adds objects to render - note that it's better to add a list of objects than calling this method multiple times with only one object per call - note that this method automatically recompiles the shaders.
- `PathTracerRenderer.setBackgroundColor(color:object)` changes the sky/background color of the renderer - note that this method automatically recompiles the shaders.
- `PathTracerRenderer.setMaxBounces(x:number)` changes the maximum bounce(s) per rays - note that this method automatically recompiles the shaders.