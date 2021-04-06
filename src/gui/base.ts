import { Container, BitmapFont, Loader } from "pixi.js";

export class BlurBase {
	root =  new Container();
	background =  new Container();
	foreground =  new Container();

	constructor() {
		this.root.addChild(this.background);
		this.root.addChild(this.foreground);
	}
}

export enum Clamp {
	Top,
	TopRight,
	Right,
	BottomRight,
	Bottom,
	BottomLeft,
	Left,
	TopLeft
}


let fonts_loader: Promise<void> = null;
export function load_fonts(): Promise<void> {
	if (fonts_loader != null) return fonts_loader;
	fonts_loader = new Promise((resolve, reject) => {
		const loader = new Loader();
		loader.add("Hack53", "./Hack-Regular-53.fnt");
		loader.onComplete.add(function () { console.log(arguments); });
		loader.onComplete.add(resolve);
		loader.onError.add(reject);
		loader.load();
	});
	return fonts_loader;
}

import FuelGague from "./fuel";

interface GuiComponent {
	kind: string;
	clamp: Clamp;
	offset: number;
	is_vertical: boolean;
}

export class RuntimeGui {
	container = new Container();
	fuel_gague: FuelGague = null;
}

export function load(components: GuiComponent[], gui_scale: number): RuntimeGui {
	const gui = new RuntimeGui();
	for (const component of components) {
		switch (component.kind) {
			case "fuel_gague":
				gui.fuel_gague = new FuelGague(component.clamp, component.is_vertical, gui_scale);
				gui.container.addChild(gui.fuel_gague.root);
				if (component.is_vertical) gui.fuel_gague.root.position.y = component.offset;
				else gui.fuel_gague.root.position.x = component.offset;
				break;

			default:
				throw new Error("Unknown component type");
		}
	}
	return gui;
}
