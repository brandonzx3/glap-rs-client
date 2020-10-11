import { global } from "./index";
import { ToServerMsg } from "./codec";

export function ChatInit() {
    console.log("chat pog");
}

let message_button = (document.querySelector("#message_button") as HTMLInputElement);
let message_box = (document.querySelector("#message_box") as HTMLInputElement);
let message_root = (document.querySelector("#messages") as HTMLDivElement);


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
        message_box.value = "";
    }
}

export function ReceiveMessage(content: string, username: string) {
    let temp = (document.querySelector("#message_template") as HTMLTemplateElement);
    let clone = (temp.content.cloneNode(true) as HTMLDivElement);
    let message = (clone.firstElementChild as HTMLParagraphElement);
    message.innerHTML = `${username}: ${content}`;
    message_root.appendChild(clone);
    message_root.scrollTop = message_root.offsetTop + message_root.scrollHeight;
}