import * as PIXI from 'pixi.js';
import { ToClientMsg, ToServerMsg, Box } from "./codec";

function commit_die(error: any) {
    (document.querySelector("#connecting_msg") as HTMLDivElement).style.display = "flex";
    document.querySelector("#connecting_msg span").innerHTML = "Server commited die or something";
    console.error(error);
    socket.close();
}

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
    scale_up = Math.max(window_size * (0.035545023696682464), 30);
    scaling.scale.set(scale_up, scale_up);
}
resize();

//ws%3A%2F%2Flocalhost%3A8081 for localhost 8081
const socket = new WebSocket(decodeURIComponent(window.location.hash.slice(1)));
socket.binaryType = "arraybuffer";
socket.onopen = () => {
    socket.send(new Uint8Array(new ToServerMsg.Handshake("glap.rs-0.1.0", null).serialize()));
};
socket.onmessage = (e) => {
    try {
        const message = ToClientMsg.deserialize(new Uint8Array(e.data), new Box(0));
        if (message instanceof ToClientMsg.HandshakeAccepted) {
            alert("Accepted");
            socket.onmessage = on_message;
        } else throw new Error();
    } catch(e) { commit_die(e); }
}

function on_message(e: MessageEvent<ArrayBuffer>) {
    try {
        const msg = ToClientMsg.deserialize(new Uint8Array(e.data), new Box(0));

        if (msg instanceof ToClientMsg.AddCelestialObject) {
            
        }

    } catch(e) { commit_die(e); }
}