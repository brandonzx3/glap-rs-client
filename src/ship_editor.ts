import * as PIXI from "pixi.js";
import { PartKind } from "./codec";
import { parse as qs_parse } from "query-string";
import { RecursivePartDescription, Part } from "./ship_editor_parts";

export const params = window.location.href.indexOf("?") > -1 ? qs_parse(window.location.href.substr(window.location.href.indexOf("?") + 1)) : {};
console.log("RE");
console.log(params);
export const never_promise = new Promise(() => {});

export interface GlobalData {
	scaling: PIXI.Container;
	world: PIXI.Container;
	part_sprites: PIXI.Container;
	connector_sprites: PIXI.Container;
	spritesheet: PIXI.Spritesheet;

	sidebar: PIXI.Container;
	pane_background: PIXI.Graphics;
	pane_border: PIXI.TilingSprite;

	ship_dat: ShipDat;
	pane_size: number;
	zoom: number;
	raw_scale_up: number;
	scale_up: number;
}

export const global: GlobalData = {
	scaling: new PIXI.Container(),
	world: new PIXI.Container(),
 	part_sprites: new PIXI.Container(),
	connector_sprites: new PIXI.Container(),
	spritesheet: null,

	sidebar: new PIXI.Container(),
	pane_background: new PIXI.Graphics().beginFill(0xaba9b7).drawRect(0,0,1,1).endFill(),
	pane_border: null,

	ship_dat: null,
	pane_size: 0,
	zoom: 1,
	raw_scale_up: 0,
	scale_up: 0,
};
(window as any)["dev"] = global;

const app = new PIXI.Application({ autoStart: false, width: window.innerWidth, height: window.innerHeight, antialias: true, });
document.body.appendChild(app.view);

const blueprint = new PIXI.TilingSprite(PIXI.Texture.from("./blueprint.png"), 150, 150);
blueprint.anchor.set(0.5,0.5);

app.stage.addChild(global.scaling);
global.scaling.addChild(blueprint);
global.scaling.addChild(global.world);
global.world.addChild(global.part_sprites);
global.world.addChild(global.connector_sprites);

app.stage.addChild(global.sidebar);
global.sidebar.addChild(global.pane_background);

if (typeof params["ship"] !== "string") { alert("Invalid ship url"); throw new Error("Invalid ship url"); }
const ship_url = params["ship"] as string;
if (typeof params["spritesheet"] !== "string") { alert("Invalid spritesheet url"); throw new Error("Invalid spritesheet url"); }
const spritesheet_url_base = params["spritesheet"] as string;

export function resize() {
    const window_size = Math.min(window.innerWidth, window.innerHeight);
	app.view.width = window.innerWidth;
	app.view.height = window.innerHeight;
    app.renderer.resize(window.innerWidth, window.innerHeight);
	global.pane_size = Math.max(window.innerWidth * 0.07, 100);
	const pane_border_size = global.pane_size * 0.1;
    global.scaling.position.set(app.view.width / 2 + global.pane_size + pane_border_size, app.view.height / 2);
    global.raw_scale_up = Math.max(window_size * (0.045545023696682464), 30);
    global.scale_up = global.raw_scale_up * global.zoom;
    global.scaling.scale.set(global.scale_up, global.scale_up);

	blueprint.tileScale.set(2 / global.scale_up);
	global.pane_background.width = global.pane_size;
	global.pane_background.height = window.innerHeight;
	global.pane_border.height = pane_border_size;
	global.pane_border.width = window.innerHeight;
	global.pane_border.x = global.pane_size;
	global.pane_border.tileScale.y = 0.75 / pane_border_size;
	global.pane_border.tileScale.x = global.pane_border.tileScale.y / global.pane_border.texture.height * global.pane_border.texture.width;
}

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
	global.spritesheet = spritesheet;
    spritesheet.parse(resolve);
}).then(() => fetch(ship_url).then(res => res.json()), err => { alert("Failed to load spritesheet"); console.error(err); return never_promise; })
.then(save_data => {
	if (!("layout_current" in save_data && 'inventory' in save_data)) throw new Error("Save data invalid");
	const inventory: Map<PartKind, Box<number>> = new Map();
	for (const [kind, count] of save_data.inventory) inventory.set(kind, new Box(count));
	global.ship_dat = new ShipDat(inventory, RecursivePartDescription.upgrade(save_data.layout_current));
	if ("layout_1" in save_data) global.ship_dat.layout_1 = RecursivePartDescription.upgrade(save_data.layout_1);
	if ("layout_2" in save_data) global.ship_dat.layout_2 = RecursivePartDescription.upgrade(save_data.layout_2);
	if ("layout_3" in save_data) global.ship_dat.layout_3 = RecursivePartDescription.upgrade(save_data.layout_3);
	if ("layout_4" in save_data) global.ship_dat.layout_4 = RecursivePartDescription.upgrade(save_data.layout_4);

	empower_layout(global.ship_dat.inventory, global.ship_dat.layout_current);
}).catch(err => { alert("Failed to load save data"); console.error(err); return never_promise; })
.then(() => {
	global.pane_border = new PIXI.TilingSprite(global.spritesheet.textures["tiling_caution_border.png"], 1, 1);
	global.sidebar.addChild(global.pane_border);
	global.pane_border.rotation = Math.PI / 2;

	resize();
	window.addEventListener("resize", resize);
	
	function render() {
		app.render();	
		requestAnimationFrame(render);
	}
	requestAnimationFrame(render);
});

export class Box<T> { v: T; constructor(v: T) { this.v = v; } }
export class ShipDat {
	layout_current: RecursivePartDescription;
	layout_1: RecursivePartDescription = null;
	layout_2: RecursivePartDescription = null;
	layout_3: RecursivePartDescription = null;
	layout_4: RecursivePartDescription = null;
	inventory: Map<PartKind, Box<number>>; 
	constructor(inventory: Map<PartKind, Box<number>>, current_layout: RecursivePartDescription) {
		this.inventory = inventory;
		this.layout_current = current_layout;
	}
}

export function empower_layout(inventory: Map<PartKind, Box<number>>, layout: RecursivePartDescription) {
	const my_inventory: Map<PartKind, Box<number>> = new Map();
	for (const [kind, count] of inventory.entries()) my_inventory.set(kind, new Box(count.v));
	const parts: Part[] = [];
	function empower_part(part: RecursivePartDescription) {
		let has_the_part = false;
		if (part.kind === PartKind.Core) has_the_part = true;
		else {
			const part_count = my_inventory.get(part.kind);
			if (part_count !== null && part_count.v > 0) {
				has_the_part = true;
				part_count.v--;
			}
		}

		const new_part = new Part(part.kind, has_the_part);
		//new_part.set_position(part.dx, part.dy);
		//new_part.set_rotation(part.drot);
		parts.push(new_part);

		part.attachments.forEach(part => { if (part !== null) empower_part(part) } );
	}
	empower_part(layout);
}
