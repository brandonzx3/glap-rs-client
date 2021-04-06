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
		loader.onComplete.add(resolve);
		loader.onError.add(reject);
		loader.load();
	});
	return fonts_loader;
}

interface GuiComponent {
	type: string;
	clamp: Clamp;
	offset: number;
}
