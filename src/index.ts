import * as PIXI from 'pixi.js';
import { FromServer, ToServer } from "./codec"
import { encode as serialize, decode as deserialize } from "msgpack-lite";

const pixi = new PIXI.Application({ width: window.innerWidth, height: window.innerHeight, antialias: false, transparent: false});
document.body.appendChild(pixi.view);

//ws%3A%2F%2Flocalhost%3A8081 for localhost 8081
const socket = new WebSocket(decodeURIComponent(window.location.hash.slice(1)));
socket.binaryType = "arraybuffer";
socket.onopen = () => {
    let handshake = { "client": "glap.rs-0.1.0", "session": null as null };
    let msg: any = {};
    msg[ToServer.to_id.get(ToServer.Handshake)] = handshake;
    socket.send(serialize(msg));
};
socket.onmessage = (e) => {
    try {
        const msg = deserialize(new Uint8Array(e.data));
        if (FromServer.from_id.get(Object.keys(msg)[0]) !== FromServer.HandshakeAccepted) throw new Error();
        (document.querySelector("#connecting_msg") as HTMLDivElement).style.display = "none";
        alert("Connected!");
    } catch(e) {
        document.querySelector("#connecting_msg span").innerHTML = "Server commited die or something";
        console.error(e);
        socket.close();
    }
}