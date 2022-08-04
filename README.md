# Real-Time-Path-Tracer
Fast high fidelity ray-tracing rendering program.

This program is written in Javascript and GLSL, and can be run from a browser or any browser-like libraries from Node-JS like [Electron](https://www.electronjs.org/).

No external libraries are needed to run this program.

## How to test
1. Run `git clone git@github.com:AntoineBRTL/Real-Time-Path-Tracer.git .`
2. Make sure your browser uses your main graphics card, see [here](https://superuser.com/questions/645918/how-to-run-google-chrome-with-nvidia-card-optimus)
3. Open the [HTML](https://github.com/AntoineBRTL/Real-Time-Path-Tracer/blob/main/test/index.html) in your browser

## How to use
1. Import the renderer
```javascript
import { PathTracerRenderer } from "../src/PathTracerRenderer.js";
```