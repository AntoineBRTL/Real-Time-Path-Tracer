# Real-Time-Path-Tracer
Fast high fidelity ray-tracing rendering program.

This program is written in Javascript and GLSL, and can be run in a browser or any browser-like libraries from Node-JS like [Electron](https://www.electronjs.org/).

No external libraries are needed to run this program.

## Try the demo
1. Run `git clone git@github.com:AntoineBRTL/Real-Time-Path-Tracer.git .`.
2. Make sure your browser uses your main graphics card, see [here](https://superuser.com/questions/645918/how-to-run-google-chrome-with-nvidia-card-optimus).
3. Open the [HTML](https://github.com/AntoineBRTL/Real-Time-Path-Tracer/blob/main/test/index.html) file in your browser.
4. You may have to run a small server, see [here](https://www.npmjs.com/package/live-server).

What we get: ![alt text](./demo.PNG)

As you can see the image is rendered using small lights source.

## Run informations

Tested on a 60 Hz screen with a NVIDIA GeForce GTX 970M without any rendering hierarchy.

| Object count | 1 000 | 100 000
| --- | --- | --- |
| FPS Average | 60 | 60 |
