import {World} from "./World.js";

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

                {
                    this.frameTexture = this.gl.createTexture();
                    this.gl.bindTexture(this.gl.TEXTURE_2D, this.frameTexture);
                    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.canvas.width, this.canvas.height, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
                    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
                    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
                    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
                    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
                }
                
                {
                    this.rayCountTexture = this.gl.createTexture();
                    this.gl.bindTexture(this.gl.TEXTURE_2D, this.rayCountTexture);
                    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.canvas.width, this.canvas.height, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
                    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
                    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
                    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
                    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
                }

                {
                    this.sceneTexture = this.gl.createTexture();
                    this.gl.bindTexture(this.gl.TEXTURE_2D, this.sceneTexture);
                    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, 0, 0, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
                    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
                    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
                    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
                    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
                }

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
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.frameTexture);

        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.canvas.width, this.canvas.height, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.canvas);
        this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);

        let location = this.gl.getUniformLocation(this.program, "texture0");
        this.gl.uniform1i(location, 0);

        this.gl.activeTexture(this.gl.TEXTURE0);
    }

    _loadFragOuptutIntoTexture()
    {
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.rayCountBuffer);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.rayCountTexture);
        this.gl.activeTexture(this.gl.TEXTURE1);
    }

    _loadSceneIntoTexture(world)
    {
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.sceneTexture);

        let sphereContent = new Array();
        // sphere
        world.content.forEach(function(sphere)
        {
            for (let i = 0; i < 4; i++)
            {
                sphereContent.push(sphere.position.x);
            }

            for (let i = 0; i < 4; i++)
            {
                sphereContent.push(sphere.position.y);
            }

            for (let i = 0; i < 4; i++)
            {
                sphereContent.push(sphere.position.z);
            }

            for (let i = 0; i < 4; i++)
            {
                sphereContent.push(sphere.radius);
            }

            for (let i = 0; i < 4; i++)
            {
                sphereContent.push(sphere.reflectance);
            }

            for (let i = 0; i < 4; i++)
            {
                sphereContent.push(sphere.refractance);
            }
        });

        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, world.content.lenght * 6 * 4, world.content.lenght * 6 * 4, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, new Uint8Array(sphereContent));
        
        let location = this.gl.getUniformLocation(this.program, "texture2");
        this.gl.uniform1i(location, 2);

        this.gl.activeTexture(this.gl.TEXTURE2);
    }

    resetFrameBuffer()
    {
        this._renderTime = 0;
    }

    render(world)
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
            //this._loadSceneIntoTexture(world);
        }

        parameters.call(this);
        
        this.gl.drawArrays(this.gl.TRIANGLE_FAN, 0, 4);

        this._loadFrameIntoTexture();

        this._renderTime ++;
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