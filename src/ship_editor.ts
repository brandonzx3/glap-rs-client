import * as PIXI from "pixi.js";
import { PartKind } from "./codec";
import { parse as qs_parse } from "query-string";

export const params = window.location.href.indexOf("?") > -1 ? qs_parse(window.location.href.substr(window.location.href.indexOf("?") + 1)) : {};
console.log("RE");
console.log(params);
export const never_promise = new Promise(() => {});

export interface GlobalData {
	scaling: PIXI.Container;
	world: PIXI.Container;
	part_sprites: PIXI.Container;
	connector_sprites: PIXI.Container;
	sidebar: PIXI.Container;
	spritesheet: PIXI.Spritesheet;
}

export const global: GlobalData = {
	scaling: new PIXI.Container(),
	world: new PIXI.Container(),
 	part_sprites: new PIXI.Container(),
	connector_sprites: new PIXI.Container(),
	sidebar: new PIXI.Container(),
	spritesheet: null
};
(window as any)["dev"] = global;

const app = new PIXI.Application({ autoStart: false, width: window.innerWidth, height: window.innerHeight, antialias: true, });
document.body.appendChild(app.view);
app.view.style.display = "none";

const blueprint = new PIXI.TilingSprite(PIXI.Texture.from("./blueprint.png"), 150, 150);

app.stage.addChild(global.scaling);
global.scaling.addChild(blueprint);
global.scaling.addChild(global.world);
global.world.addChild(global.part_sprites);
global.world.addChild(global.connector_sprites);
app.stage.addChild(global.sidebar);

if (typeof params["ship"] !== "string") { alert("Invalid ship url"); throw new Error("Invalid ship url"); }
const ship_url = params["ship"] as string;
if (typeof params["spritesheet"] !== "string") { alert("Invalid spritesheet url"); throw new Error("Invalid spritesheet url"); }
const spritesheet_url_base = params["spritesheet"] as string;

let spritesheet: PIXI.Spritesheet = null;
new Promise(async (resolve, reject) => {
    const image_promise: Promise<HTMLImageElement> = new Promise((resolve, reject) => {
        const image = document.createElement("img");
        image.src = `${spritesheet_url_base}.png`;
        image.onload = () => { resolve(image); }
        image.onerror = err => reject(err);
    });
    const dat_promise: Promise<Object> = fetch(`${spritesheet_url_base}.json`).then(res => res.json());
    const image = await image_promise;
    const dat = await dat_promise;
    const texture = PIXI.Texture.from(image);
    spritesheet = new PIXI.Spritesheet(texture, dat);
    spritesheet.parse(resolve);
}).then(() => {
	
}, err => { alert("Failed to load spritesheet"); console.error(err); return never_promise; });

