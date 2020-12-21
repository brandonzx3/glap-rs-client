import { global } from "./index";
import { ToServerMsg } from "./codec";
import * as PIXI from 'pixi.js';

export function ChatInit() {
    console.log("chat pog");
}

let message_button = (document.querySelector("#message_button") as HTMLInputElement);
let message_box = (document.querySelector("#message_box") as HTMLInputElement);
let message_root = (document.querySelector("#messages") as HTMLDivElement);
let root = (document.querySelector("#chat_root") as HTMLDivElement);
const root_root = document.querySelector("#chat_root_root") as HTMLDivElement;
let notification_root = (document.querySelector("#notification_root") as HTMLDivElement);
let animation_time = 500;
//notification_root.style.visibility = "hidden";

const button_to_open = document.querySelector("#chat_open_button") as HTMLImageElement;
const button_to_close = document.querySelector("#chat_close_button") as HTMLImageElement;

document.addEventListener("keydown", key => {
    if(key.keyCode == 13) {
        if(message_box == document.activeElement) {
            global.chat.SendMessage(message_box.value);
        }
    }
});

function clear_notification(anim_time: Number) {
	(notification_root.children[1] as HTMLDivElement).style.opacity = "0%";
    setTimeout(() => notification_root.removeChild(notification_root.children[1]), animation_time);
	global.chat.notification_count -= 1;
}

message_button.onclick = function() { global.chat.SendMessage(message_box.value); }

export class Chat {
	constructor() {
		button_to_open.onclick = () => {
			this.Open();
		};
		button_to_close.onclick = () => {
			this.Close();
		};
	}

    is_open = false;
    notification_count = 0;

    Open() {
        if(this.is_open) return;

        this.is_open = true;
		button_to_open.style.display = "none";
		button_to_close.style.display = "initial";
        root_root.style.bottom = "0px";
        notification_root.style.visibility = "hidden";
        for(var i = 1; i < this.notification_count + 1; i++) {
            clear_notification(animation_time);
        }
    }

    Close() {
        if(!this.is_open) return;

        this.is_open = false;
		button_to_close.style.display = "none";
		button_to_open.style.display = "initial";
        root_root.style.bottom = "-17em";
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
            notification.style.opacity = "0%";
            notification.style.transitionDuration = "0.5s";
            notification.style.backgroundColor = "#5e007870";
            notification.style.padding = "5px";
            notification.style.margin = "10px";
            notification.style.borderRadius = "15px";
	        setTimeout(() => notification.style.opacity = "100%", 50); //wait for transitionDuration because its bad
            message.innerHTML = `${username}: ${content}`;
            message.style.color = color;
            notification_root.appendChild(clone);
            if(this.notification_count > 3) {
		        clear_notification(animation_time);
            }
            setTimeout(() => {
		        clear_notification(animation_time);
            }, 9500);
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

