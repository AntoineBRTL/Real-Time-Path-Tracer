/**
 * 
 * Small test with a little scene and camera controlls
 * 
 * Note that in the demo, the program does not allows spectral rays
 * 
 */

import { PathTracerRenderer } from "../src/PathTracerRenderer.js";
import { Sphere } from "../src/Sphere.js";
import { Plane } from "../src/Plane.js";
import { Laser } from "../src/Laser.js";

export class Main
{
    constructor()
    {
        let canvas = this.createCanvas();
        this.stylizeBody().appendChild(canvas);
        
        let renderer = new PathTracerRenderer(canvas);

        function kernelBoxScene() {
            let s1 = new Sphere({x: -0.5, y: -0.2, z: 1.0}, 0.3, {r: 0.5, g: 0.5, b: 0.5}, {r: 0.0, g: 0.0, b: 0.0}, 0.0, 0.0);
            let s2 = new Sphere({x: 1.0, y: 0.0, z: -0.5}, 0.5, {r: 0.5, g: 0.5, b: 0.5}, {r: 0.0, g: 0.0, b: 0.0}, 1.0, 0.0);
    
            let b1 = new Plane({x: 0.0, y: -0.5, z: 0.0}, {x: 0.0, y: 1.0, z: 0.0}, 4.0, {r: 0.5, g: 0.5, b: 0.5}, {r: 0.0, g: 0.0, b: 0.0}, 0.0, 0.0);
            let b2 = new Plane({x: 0.0, y: 1.5, z: -2.0}, {x: 0.0, y: 0.0, z: 1.0}, 4.0, {r: 0.5, g: 0.5, b: 0.5}, {r: 0.0, g: 0.0, b: 0.0}, 0.0, 0.0);
            let b3 = new Plane({x: 2.0, y: 1.5, z: 0.0}, {x: -1.0, y: 0.0, z: 0.0}, 4.0, {r: 0.5, g: 0.5, b: 0.5}, {r: 0.0, g: 0.0, b: 0.0}, 0.0, 0.0);
            let l1 = new Plane({x: 1.99, y: 0.5, z: 0.0}, {x: -1.0, y: 0.0, z: 0.0}, 1.0, {r: 0.5, g: 0.5, b: 0.5}, {r: 0.09, g: 0.09, b: 1.7}, 0.0, 0.0);
            let b4 = new Plane({x: -2.0, y: 1.5, z: 0.0}, {x: 1.0, y: 0.0, z: 0.0}, 4.0, {r: 0.5, g: 0.5, b: 0.5}, {r: 0.0, g: 0.0, b: 0.0}, 0.0, 0.0);
            let l2 = new Plane({x: -1.99, y: 0.5, z: 0.0}, {x: 1.0, y: 0.0, z: 0.0}, 1.0, {r: 0.5, g: 0.5, b: 0.5}, {r: 1.7, g: 0.09, b: 0.09}, 0.0, 0.0);
            let b5 = new Plane({x: 0.0, y: 3.5, z: 0.0}, {x: 0.0, y: -1.0, z: 0.0}, 4.0, {r: 0.5, g: 0.5, b: 0.5}, {r: 0.0, g: 0.0, b: 0.0}, 0.0, 0.0);
            let b6 = new Plane({x: 0.0, y: 1.5, z: 4.0}, {x: 0.0, y: 0.0, z: -1.0}, 4.0, {r: 0.5, g: 0.5, b: 0.5}, {r: 0.0, g: 0.0, b: 0.0}, 0.0, 0.0);

            renderer.camera.position.y = 1.0;
            renderer.camera.position.z = 5.0;

            renderer.setBackgroundColor({r: 0.01, g: 0.01, b: 0.01});

            renderer.addToScene(b1, b2, b3, b4, b5, b6, l1, l2, s1, s2);
        }

        function basicScene() {
            let s1 = new Sphere({x: 0.0, y: 0.0, z: 0.0}, 0.5, {r: 0.7, g: 0.5, b: 0.5}, {r: 0.0, g: 0.0, b: 0.0}, 0.0, 1.0);
            let s2 = new Sphere({x: 0.0, y: -100.5, z: 0.5}, 100.0, {r: 0.5, g: 0.7, b: 0.5}, {r: 0.0, g: 0.0, b: 0.0}, 0.0, 0.0);

            renderer.camera.position.z = 2.0;
            renderer.camera.position.y = 1.0;
            renderer.camera.rotation.x = -35.0;

            renderer.setBackgroundColor({r: 0.5, g: 0.7, b: 1.0});

            renderer.addToScene(s1, s2);
        }

        function refractionScene() {
            let b1 = new Plane({x: 0.0, y: -0.5, z: 0.0}, {x: 0.0, y: 1.0, z: 0.0}, 4.0, {r: 0.5, g: 0.5, b: 0.5}, {r: 0.0, g: 0.0, b: 0.0}, 0.0, 0.0);
            //let l1 = new Laser({x: -1.99, y: -0.5, z: 0.0}, {x: 1.0, y: 0.0, z: 0.0}, {r: 0.0, g: 1.0, b: 0.0});
            let l1 = new Plane({x: -1.0, y: -0.5, z: 0.0}, {x: 0.0, y: 0.0, z: 1.0}, 0.5, {r: 0.5, g: 0.5, b: 0.5}, {r: 10.0, g: 10.0, b: 10.0}, 0.0, 0.0);
            let s1 = new Sphere({x: 0.0, y: -0.5, z: -0.30}, 0.5, {r: 0.7, g: 0.5, b: 0.5}, {r: 0.0, g: 0.0, b: 0.0}, 0.0, 1.0);

            let b2 = new Plane({x: 0.0, y: 1.5, z: -2.0}, {x: 0.0, y: 0.0, z: 1.0}, 4.0, {r: 0.5, g: 0.5, b: 0.5}, {r: 0.0, g: 0.0, b: 0.0}, 0.0, 0.0);
            let b3 = new Plane({x: 2.0, y: 1.5, z: 0.0}, {x: -1.0, y: 0.0, z: 0.0}, 4.0, {r: 0.5, g: 0.5, b: 0.5}, {r: 0.0, g: 0.0, b: 0.0}, 0.0, 0.0); 
            let b4 = new Plane({x: -2.0, y: 1.5, z: 0.0}, {x: 1.0, y: 0.0, z: 0.0}, 4.0, {r: 0.5, g: 0.5, b: 0.5}, {r: 0.0, g: 0.0, b: 0.0}, 0.0, 0.0);
            let b5 = new Plane({x: 0.0, y: 3.5, z: 0.0}, {x: 0.0, y: -1.0, z: 0.0}, 4.0, {r: 0.5, g: 0.5, b: 0.5}, {r: 0.0, g: 0.0, b: 0.0}, 0.0, 0.0);
            let b6 = new Plane({x: 0.0, y: 1.5, z: 4.0}, {x: 0.0, y: 0.0, z: -1.0}, 4.0, {r: 0.5, g: 0.5, b: 0.5}, {r: 0.0, g: 0.0, b: 0.0}, 0.0, 0.0);

            renderer.camera.position.z = 2.0;
            renderer.camera.position.y = 1.0;
            renderer.camera.rotation.x = -35.0;

            renderer.setBackgroundColor({r: 0.01, g: 0.01, b: 0.01});

            renderer.addToScene(b1, l1, s1);
            // renderer.setMaxBounces(100);
        }

        kernelBoxScene();
        
        function loop() 
        {
            renderer.render();
            //renderer.resetRenderChain();
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

/**
 * 
 * Little input system I've made for an old project.
 * 
 * It's not that hard to understand, I was really proud of me !
 * But you can find way better libs on npm.
 * 
 */

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