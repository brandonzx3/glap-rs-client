import * as PIXI from 'pixi.js';
import { flatbuffers } from "flatbuffers";
import { ToClientMsg, ToServerMsg, Box } from "./codec";

const pixi = new PIXI.Application({ width: window.innerWidth, height: window.innerHeight, antialias: false, transparent: false});
document.body.appendChild(pixi.view);

//ws%3A%2F%2Flocalhost%3A8081 for localhost 8081
const socket = new WebSocket(decodeURIComponent(window.location.hash.slice(1)));
socket.binaryType = "arraybuffer";
socket.onopen = () => {
    socket.send(new Uint8Array(new ToServerMsg.Handshake("glap.rs-0.1.0", null).serialize()))
};
socket.onmessage = (e) => {
    try {
        const message = ToClientMsg.deserialize(new Uint8Array(e.data), new Box(0));
        console.log(message);
        if (message instanceof ToClientMsg.HandshakeAccepted) {
            alert("Accepted");
        } else throw new Error();
    } catch(e) {
        document.querySelector("#connecting_msg span").innerHTML = "Server commited die or something";
        console.error(e);
        socket.close();
    }
}