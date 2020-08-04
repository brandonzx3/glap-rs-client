import * as PIXI from 'pixi.js';
import { flatbuffers } from "flatbuffers";
import { ToClient, ToServer } from "./codec";

const pixi = new PIXI.Application({ width: window.innerWidth, height: window.innerHeight, antialias: false, transparent: false});
document.body.appendChild(pixi.view);

//ws%3A%2F%2Flocalhost%3A8081 for localhost 8081
const socket = new WebSocket(decodeURIComponent(window.location.hash.slice(1)));
socket.binaryType = "arraybuffer";
socket.onopen = () => {
    const builder = new flatbuffers.Builder();
    const client = builder.createString("glap.rs-0.1.0");
    ToServer.Handshake.startHandshake(builder);
    ToServer.Handshake.addClient(builder, client);
    //ToServer.Handshake.addSession(builder, null);
    const handshake = ToServer.Handshake.endHandshake(builder);
    ToServer.Msg.startMsg(builder);
    ToServer.Msg.addMsgType(builder, ToServer.ToServerMsg.Handshake);
    ToServer.Msg.addMsg(builder, handshake);
    const msg = ToServer.Msg.endMsg(builder);
    builder.finish(msg);
    socket.send(builder.asUint8Array());
};
socket.onmessage = (e) => {
    try {
        const buf = new flatbuffers.ByteBuffer(new Uint8Array(e.data));
        const acceptance = ToClient.Msg.getRootAsMsg(buf);
        if (acceptance === null || acceptance === undefined) throw new Error();
        console.log(acceptance.msgType());
        (document.querySelector("#connecting_msg") as HTMLDivElement).style.display = "none";
        alert("Accepted");
    } catch(e) {
        document.querySelector("#connecting_msg span").innerHTML = "Server commited die or something";
        console.error(e);
        socket.close();
    }
}