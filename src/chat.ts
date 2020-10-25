import { global } from "./index";
import { ToServerMsg } from "./codec";

export function ChatInit() {
    console.log("chat pog");
}

let message_button = (document.querySelector("#message_button") as HTMLInputElement);
let message_box = (document.querySelector("#message_box") as HTMLInputElement);
let message_root = (document.querySelector("#messages") as HTMLDivElement);
let root = (document.querySelector("#chat_root") as HTMLDivElement);

document.addEventListener("keydown", key => {
    if(key.keyCode == 13) {
        if(message_box == document.activeElement) {
            global.chat.SendMessage(message_box.value);
        }
    }
});

message_button.onclick = function() { global.chat.SendMessage(message_box.value); }

export class Chat {
    is_open = false

    Open() {
        if(this.is_open) return;
    }

    Close() {
        if(!this.is_open) return;
    }

    ReceiveMessage(content: string, username: string, color: string) {
        let temp = (document.querySelector("#message_template") as HTMLTemplateElement);
        let clone = (temp.content.cloneNode(true) as HTMLDivElement);
        let message = (clone.firstElementChild as HTMLParagraphElement);
        message.innerHTML = `${username}: ${content}`;
        message.style.color = color;
        message_root.appendChild(clone);
        message_root.scrollTop = message_root.offsetTop + message_root.scrollHeight;
    }

    SendMessage(content: string) {
        if(message_box.value.replace(/\s/g, '').length) {
            if(message_box.value.length <= 255) {
                global.socket.send(new ToServerMsg.SendChatMessage(content).serialize());
                message_box.value = "";
            } else {
                alert("you cannot send a message over 255 characters");
            }
        }
    }
}
