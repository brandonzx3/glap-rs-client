import { BlurBase, Clamp } from "./base";
import { Container, Graphics, BitmapText, Point } from "pixi.js";

export default class Fuel extends BlurBase {
	clamp: Clamp;
	is_vertical: boolean;
	gui_scale: number;

	bar_size: number;

	hue: Graphics;
	no_fuel_backplate: Graphics;
	fuel: Graphics;
	text: BitmapText;

	constructor(clamp: Clamp, is_vertical: boolean, gui_scale: number) {
		super();

		this.clamp = clamp;
		this.is_vertical = is_vertical;
		this.gui_scale = gui_scale;

		let width;
		let height;
		const padding = 10 * gui_scale;
		const paddingx2 = padding * 2;
		let bar_width;
		let bar_height;
		let bar_x;
		let bar_y;
		let text_cx;
		let text_cy;

		if (!is_vertical) {
			height = 70 * gui_scale;
			width = height * 6;
			bar_width = width - paddingx2 - paddingx2;
			bar_height = padding;
			this.bar_size = bar_width;
			bar_x = paddingx2;
			text_cx = width * 0.5;

			switch (clamp) {
				case Clamp.Top:
				case Clamp.TopRight:
				case Clamp.TopLeft:
					bar_y = paddingx2;
					text_cy = paddingx2 * 1.75;
					break;
				case Clamp.Bottom:
				case Clamp.BottomRight:
				case Clamp.BottomLeft:
					bar_y = paddingx2 * 1.75;
					text_cy = paddingx2;
					break;
				default:
					throw new Error("`clamp` and `is_vertical` don't match");
			}
		} else {
			width = 70 * gui_scale;
			height = width * 6;
			bar_height = height - paddingx2 - paddingx2;
			bar_width = padding;
			this.bar_size = bar_height;
			bar_y = paddingx2;
			text_cy = height * 0.5;

			switch (clamp) {
				case Clamp.TopRight:
				case Clamp.Right:
				case Clamp.BottomRight:
					bar_x = paddingx2 * 1.75;
					text_cx = paddingx2;
					break;
				case Clamp.TopLeft:
				case Clamp.Left:
				case Clamp.BottomLeft:
					bar_x = paddingx2;
					text_cx = paddingx2 * 1.75;
					break;
				default:
					throw new Error("`clamp` and `is_vertical` don't match");
			}
		}

		this.hue = new Graphics()
			.beginFill(0x001a86, 0.71)
			.drawRect(padding, padding, width - paddingx2, height - paddingx2)
			.endFill();
		const outline = new Graphics()
			.lineStyle(2 * gui_scale, 0xffffff, 1, 0.5, false)
			.drawRect(padding, padding, width - paddingx2, height - paddingx2);


		const gague_backplate = new Graphics()
			.beginFill(0xffffff, 0.5)
			.drawRect(bar_x, bar_y, bar_width, bar_height)
			.endFill();
		this.no_fuel_backplate = new Graphics()
			.beginFill(0xffcccc, 0.5)
			.drawRect(bar_x, bar_y, bar_width, bar_height)
			.endFill();
		this.no_fuel_backplate.visible = false;

		this.text = new BitmapText(is_vertical ? "F u e l" : "Fuel", { fontName: "Hack53", fontSize: 53, maxWidth: is_vertical ? 10 : undefined, align: "center", });
		this.text.position.set(text_cx, text_cy);
		(this.text.anchor as Point).set(0.5);

		this.background.addChild(this.hue);
		this.foreground.addChild(outline);
		this.foreground.addChild(gague_backplate);
		this.foreground.addChild(this.no_fuel_backplate);
		this.fuel = new PIXI.Graphics()
			.beginFill(0xffffff, 1)
			.drawRect(0, 0, 1, 1)
			.endFill();
		this.fuel.position.set(bar_x, bar_y);
	}

	last_fuel: number = null;
	last_max_fuel: number = null;
	update(fuel: number, max_fuel: number) {
		if (fuel === this.last_fuel && max_fuel === this.last_max_fuel) return;
		this.last_fuel = fuel; this.last_max_fuel = max_fuel;
		const size = fuel / max_fuel * this.bar_size;
		if (this.is_vertical) this.fuel.scale.y = size;
		else this.fuel.scale.x = size;
		let text =`Fuel: ${fuel}/${max_fuel}`;
		if (this.is_vertical) text = text.split("").join(" ");
		this.text.text = text;
	}
}
