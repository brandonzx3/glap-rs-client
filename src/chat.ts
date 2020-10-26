import { global } from "./index";
import { ToServerMsg } from "./codec";

export function ChatInit() {
    console.log("chat pog");
}

let message_button = (document.querySelector("#message_button") as HTMLInputElement);
let message_box = (document.querySelector("#message_box") as HTMLInputElement);
let message_root = (document.querySelector("#messages") as HTMLDivElement);
let root = (document.querySelector("#chat_root") as HTMLDivElement);
let notification_root = (document.querySelector("#notification_root") as HTMLDivElement);
notification_root.style.visibility = "hidden";

document.addEventListener("keydown", key => {
    if(key.keyCode == 13) {
        if(message_box == document.activeElement) {
            global.chat.SendMessage(message_box.value);
        }
    }
});

message_button.onclick = function() { global.chat.SendMessage(message_box.value); }

export class Chat {
    is_open = true;
    notification_count = 0;

    Open() {
        if(this.is_open) return;
        this.is_open = true;
        root.style.position = "fixed";
        root.style.bottom = "0px";
        notification_root.style.visibility = "hidden";
    }

    Close() {
        if(!this.is_open) return;
        this.is_open = false;
        root.style.position = "fixed";
        root.style.bottom = "-17em";
        notification_root.style.visibility = "visible";
    }

    ReceiveMessage(content: string, username: string, color: string) {
        let temp = (document.querySelector("#message_template") as HTMLTemplateElement);
        let clone = (temp.content.cloneNode(true) as HTMLDivElement);
        let message = (clone.firstElementChild as HTMLParagraphElement);
        message.innerHTML = `${username}: ${content}`;
        message.style.color = color;
        message_root.appendChild(clone);
        message_root.scrollTop = message_root.offsetTop + message_root.scrollHeight;
        if(!this.is_open) {
            this.notification_count += 1;
            let temp = (document.querySelector("#notification_template") as HTMLTemplateElement);
            let clone = (temp.content.cloneNode(true) as HTMLDivElement);
            let notification = (clone.firstElementChild as HTMLDivElement);
            let message = (notification.lastElementChild as HTMLParagraphElement);
            notification.style.backgroundColor = "#5e007870";
            notification.style.padding = "5px";
            notification.style.margin = "10px";
            notification.style.borderRadius = "15px";
            message.innerHTML = `${username}: ${content}`;
            message.style.color = color;
            notification_root.appendChild(clone);
            if(this.notification_count > 3) {
                notification_root.removeChild(notification_root.children[1]);
            }
            setTimeout(() => {
                notification_root.removeChild(notification_root.children[1]);
                this.notification_count -= 1;
            }, 10000);
        }
    }

    SendMessage(content: string) {
        if(message_box.value.replace(/\s/g, '').length) {
            if(message_box.value.length <= 200) {
                global.socket.send(new ToServerMsg.SendChatMessage(content).serialize());
                message_box.value = "";
            } else {
                alert("you cannot send a message over 200 characters");
            }
        }
    }
}

export class ChatButton {
    //stuff
}
