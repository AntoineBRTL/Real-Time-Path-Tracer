/**
 * 
 * Small test with a little scene and camera controlls
 * 
 */

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

            // controlls
            let speed = 0.1;

            if(Input.getKeyPress("d")){
                renderer.camera.position.x += Math.cos(renderer.camera.rotation.y * Math.PI / 180) * speed / 2
                renderer.camera.position.y += 0 * speed / 2
                renderer.camera.position.z += -Math.sin(renderer.camera.rotation.y * Math.PI / 180) * speed / 2
                renderer.resetRenderChain();
            }

            if(Input.getKeyPress("q")){
                renderer.camera.position.x -= Math.cos(renderer.camera.rotation.y * Math.PI / 180) * speed / 2
                renderer.camera.position.y -= 0 * speed / 2
                renderer.camera.position.z -= -Math.sin(renderer.camera.rotation.y * Math.PI / 180) * speed / 2
                renderer.resetRenderChain();
            }

            if(Input.getKeyPress("z")){
                renderer.camera.position.x -= Math.cos(renderer.camera.rotation.z * Math.PI / 180) * Math.sin(renderer.camera.rotation.y * Math.PI / 180) * speed
                renderer.camera.position.y -= -Math.sin(renderer.camera.rotation.z * Math.PI / 180) * speed
                renderer.camera.position.z -= Math.cos(renderer.camera.rotation.z * Math.PI / 180) * Math.cos(renderer.camera.rotation.y * Math.PI / 180) * speed
                renderer.resetRenderChain();
            }

            if(Input.getKeyPress("s")){
                renderer.camera.position.x += Math.cos(renderer.camera.rotation.z * Math.PI / 180) * Math.sin(renderer.camera.rotation.y * Math.PI / 180) * speed
                renderer.camera.position.y += -Math.sin(renderer.camera.rotation.z * Math.PI / 180) * speed
                renderer.camera.position.z += Math.cos(renderer.camera.rotation.z * Math.PI / 180) * Math.cos(renderer.camera.rotation.y * Math.PI / 180) * speed
                renderer.resetRenderChain();
            }

            if(Input.getKeyPress(" ")){
                renderer.camera.position.y += speed
                renderer.resetRenderChain();
            }

            if(Input.getKeyPress("Shift")){
                renderer.camera.position.y -= speed
                renderer.resetRenderChain();
            }
        }

        loop();

        // mouse
        window.addEventListener("mousemove", function(e) {
            renderer.camera.rotation.x -= e.movementY * 0.1;
            renderer.camera.rotation.y -= e.movementX * 0.1;

            renderer.resetRenderChain();
        });

        canvas.addEventListener("mousedown", function(e){
            canvas.requestPointerLock();
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
    (new FPSMeter({ui: true})).start();
}

class Input{

    /**
     * @type {Array}
     */
    static KEY_PRESSED = new Array();

    /**
     * @type {Array}
     */
    static KEY_DOWN = new Array();

    /**
     * @type {Array}
     */
    static KEY_UP = new Array();

    static getKeyPress(keyValue){
        return hasValue(Input.KEY_PRESSED, keyValue);
    }

    static getKeyDown(keyValue){
        return hasValue(Input.KEY_DOWN, keyValue);
    }

    static getKeyUp(keyValue){
        return hasValue(Input.KEY_UP, keyValue);
    }

    /**
     * @param {String} axisName 
     */
    static getAxis(axisName){
        if(axisName == "MouseX"){
            return Input.MOUSE_MOVEMENT.x;
        }

        if(axisName == "MouseY"){
            return Input.MOUSE_MOVEMENT.y;
        }
    }

    /**
     * 
     * @param {Array} array 
     * @param {String} key 
     */
    static add(array, keyValue){
        if(hasValue(array, keyValue)){
            return false;
        }

        array.push(keyValue);

        return true;
    }

    /**
     * 
     * @param {Array} array 
     * @param {String} key 
     */
    static remove(array, keyValue){
        if(!hasValue(array, keyValue)){
            return false;
        }

        array.splice(getValueIndex(array, keyValue), 1);

        return true;
    }

    /**
     * 
     * @param {Array} array 
     * @param {String} key 
     */
    static removeAll(array){

        if(array.length <= 0){
            return false;
        }

        array.splice(0, array.length);

        return true;
    }

    static removeFromAllInput(keyValue){
        Input.remove(Input.KEY_DOWN, keyValue);
        Input.remove(Input.KEY_PRESSED, keyValue);
        Input.removeAll(Input.KEY_UP);
    }
}

initEvent();

function hasValue(array, value){
    for(let i = 0; i < array.length; i++){
        if(array[i] == value){
            return true;
        }
    }

    return false;
}

function getValueIndex(array, value){
    for(let i = 0; i < array.length; i++){
        if(array[i] == value){
            return i;
        }
    }

    return;
}

function initEvent(){

    window.addEventListener("keydown", function(event){
        if(!event.repeat){
            Input.add(Input.KEY_DOWN, event.key);
        }else{
            Input.remove(Input.KEY_DOWN, event.key);
        }

        Input.add(Input.KEY_PRESSED, event.key);
    
        return;
    });

    window.addEventListener("keyup", function(event){
        Input.removeFromAllInput(event.key);

        Input.add(Input.KEY_UP, event.key);
        

        return;
    });
}