import { global } from "./index";
import { ToServerMsg } from "./codec";

export function ChatInit() {
    console.log("chat pog");
}

let message_button = (document.querySelector("#message_button") as HTMLInputElement);
let message_box = (document.querySelector("#message_box") as HTMLInputElement);

document.addEventListener("keydown", key => {
    if(key.keyCode == 13) {
        if(message_box == document.activeElement) {
            SendMessage(message_box.value);
        }
    }
});

message_button.onclick = function() { SendMessage(message_box.value); }

function SendMessage(content: string) {
    if(message_box.value != "") {
        global.socket.send(new ToServerMsg.SendChatMessage(content).serialize());
    }
}

export function RecieveMessage() {

}