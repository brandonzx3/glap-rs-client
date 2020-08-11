import * as PIXI from 'pixi.js';
import { ToClientMsg, ToServerMsg, Box } from "./codec";

const pixi = new PIXI.Application({ width: window.innerWidth, height: window.innerHeight, antialias: false, transparent: false, backgroundColor: 0 });
document.body.appendChild(pixi.view);

const scaling = new PIXI.Container();
const world = new PIXI.Container();
scaling.addChild(world);
let scale_up;
function resize() {
    const window_size = Math.min(window.innerWidth, window.innerHeight);
    pixi.view.width = window.innerWidth;
    pixi.view.height = window.innerHeight;
    pixi.renderer.resize(window.innerWidth, window.innerHeight);
    scale_up = Math.max(window_size * (0.035545023696682464), 30);
    scaling.scale.set(scale_up, scale_up);
}
resize();

let spritesheet: PIXI.Spritesheet;
(async () => {
    const image_promise: Promise<HTMLImageElement> = new Promise((resolve, reject) => {
        const image = document.createElement("img");
        image.src = "/spritesheet.png";
        image.onload = () => { resolve(image); }
        image.onerror = err => reject(err);
    });
    const dat_promise: Promise<Object> = fetch("/spritesheet.json").then(res => res.json());
    const image = await image_promise;
    const dat = await dat_promise;
    const texture = PIXI.Texture.from(image);
    spritesheet = new PIXI.Spritesheet(texture, dat);
    console.log(spritesheet);
})().then(() => {

    //ws%3A%2F%2Flocalhost%3A8081 for localhost 8081
    const socket = new WebSocket(decodeURIComponent(window.location.hash.slice(1)));
    socket.binaryType = "arraybuffer";
    socket.onopen = () => {
        socket.send(new Uint8Array(new ToServerMsg.Handshake("glap.rs-0.1.0", null).serialize()));
    };
    socket.onmessage = (e) => {
        const message = ToClientMsg.deserialize(new Uint8Array(e.data), new Box(0));
        console.log(message);
        if (message instanceof ToClientMsg.HandshakeAccepted) {
            alert("Accepted");
            //socket.onmessage = on_message;
        }// else throw new Error();
    }
    socket.onerror = err => { throw err; };



    function on_message(e: MessageEvent) {
        const msg = ToClientMsg.deserialize(new Uint8Array(e.data), new Box(0));

        if (msg instanceof ToClientMsg.AddCelestialObject) {
            
        }
    }

});