export class PathTracerRenderer
{

    /**
     * @type {HTMLCanvasElement}
     */
    canvas;

    /**
     * @type {WebGL2RenderingContext}
     */
    gl;

    /**
     * 
     */
    program;

    /**
     * 
     */
    frameTexture;

    /**
     * @type {number}
     */
    _renderTime;

    /**
     * @type {Object}
     */
    camera;

    constructor(canvas, vertexShaderPath, fragmentShaderPath, callback)
    {
        this.canvas = canvas;
        this.gl = PathTracerRenderer.initOpenGL(this.canvas);

        this._renderTime = 0;

        this.camera = {rotation: {x: 0.0, y: 0.0, z: 0.0}, position: {x: 0.0, y: 0.0, z: 0.0}};

        console.log(this.camera.rotation);

        this.initRenderer(vertexShaderPath, fragmentShaderPath, callback);
    }

    initRenderer(vertexShaderPath, fragmentShaderPath, callback)
    {
        let fragShaderCode;
        let vertShaderCode;

        fetch(vertexShaderPath).then(function(result) 
        {
            return result.text();
        }).then(function(result) 
        {
            vertShaderCode = result;
        }).then(function()
        {
            fetch(fragmentShaderPath).then(function(result2) 
            {
                return result2.text();
            }).then(function(result2) 
            {
                fragShaderCode = result2;
            }).then(function()
            {

                // create vertex & fragment shader, & compile them
                let vertexShader = this.gl.createShader(this.gl.VERTEX_SHADER);
                let fragmentShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);

                this.gl.shaderSource(vertexShader, vertShaderCode);
                this.gl.shaderSource(fragmentShader, fragShaderCode);

                this.gl.compileShader(vertexShader);
                this.gl.compileShader(fragmentShader);

                // logs
                if(!this.gl.getShaderParameter(vertexShader, this.gl.COMPILE_STATUS))
                {
                    throw new Error(this.gl.getShaderInfoLog(vertexShader));
                }

                if(!this.gl.getShaderParameter(fragmentShader, this.gl.COMPILE_STATUS))
                {
                    throw new Error(this.gl.getShaderInfoLog(fragmentShader));
                }

                // program
                this.program = this.gl.createProgram();
                this.gl.attachShader(this.program, vertexShader);
                this.gl.attachShader(this.program, fragmentShader);

                this.gl.linkProgram(this.program);

                // create a quad
                let vertices = new Array();
                vertices.push(-1.0,  1.0, 0.0);
                vertices.push(-1.0, -1.0, 0.0);
                vertices.push( 1.0, -1.0, 0.0);
                vertices.push( 1.0,  1.0, 0.0);

                // convert in into a float array for Open-GL
                vertices = new Float32Array(vertices);

                // link the vertices to the vertex shader
                let buffer = this.gl.createBuffer();
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
                this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);

                let location = this.gl.getAttribLocation(this.program, 'vertexPosition');
                this.gl.vertexAttribPointer(location, 3, this.gl.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 0);
                this.gl.enableVertexAttribArray(location);

                this.gl.useProgram(this.program);

                // generate a texture
                this.frameTexture = this.gl.createTexture();
                this.gl.bindTexture(this.gl.TEXTURE_2D, this.frameTexture);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);

                this.rayTexture = this.gl.createTexture();
                this.gl.bindTexture(this.gl.TEXTURE_2D, this.rayTexture);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);

                this._loadFrameIntoTexture();

                window.addEventListener("resize", function() 
                {
                    this.resetFrameBuffer();
                }.bind(this));

                callback();
            }.bind(this));
        }.bind(this));
    }

    clear()
    {
        this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    }

    _loadFrameIntoTexture()
    {
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.canvas.width, this.canvas.height, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.canvas);
        this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);
        this.gl.activeTexture(this.gl.TEXTURE0);
    }

    _loadFragOuptutIntoTexture()
    {
        let frameBuffer = this.gl.createFramebuffer();
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, frameBuffer);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.canvas.width, this.canvas.height, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
        this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);
        this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT1, this.gl.TEXTURE_2D, this.rayTexture, 0);
        this.gl.activeTexture(this.gl.TEXTURE0);
    }

    _loadSceneIntoTexture()
    {
        
    }

    resetFrameBuffer()
    {
        this._renderTime = 0;
    }

    render()
    {
        this.clear();
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);

        function parameters()
        {
            this.fillMemory("width", this.canvas.width);
            this.fillMemory("height", this.canvas.height);
            this.fillMemory("random1", Math.random() * (1 + 1) - 1);
            this.fillMemory("random2", Math.random() * (1 + 1) - 1);
            this.fillMemory("renderTime", this._renderTime, false);

            this.fillMemory("cameraRotationX", this.camera.rotation.x);
            this.fillMemory("cameraRotationY", this.camera.rotation.y);
            this.fillMemory("cameraRotationZ", this.camera.rotation.z);

            this.fillMemory("cameraPositionX", this.camera.position.x);
            this.fillMemory("cameraPositionY", this.camera.position.y);
            this.fillMemory("cameraPositionZ", this.camera.position.z);
        }

        parameters.call(this);
        
        this.gl.drawArrays(this.gl.TRIANGLE_FAN, 0, 4);

        this._renderTime ++;
        this._loadFrameIntoTexture();
        // this._loadFragOuptutIntoTexture();
    }

    fillMemory(uniformName, value, float = true)
    {
        let location = this.gl.getUniformLocation(this.program, uniformName);

        if(!float)
        {
            this.gl.uniform1i(location, value);
            return;
        }

        // make sure it's a floating number
        this.gl.uniform1f(location, new Float32Array([value])[0]);
    }

    static initOpenGL(canvas)
    {
        let gl = canvas.getContext('webgl2');

        if(!gl)
        {
            throw new Error("Can't init OpenGL");
        }

        return gl;
    }
}