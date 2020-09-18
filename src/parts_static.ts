import * as PIXI from "pixi.js";
import { PartKind } from "./codec";


export function update_part_sprite(sprite: PIXI.Sprite, is_connected: boolean, spritesheet: PIXI.Spritesheet) {
	switch (this.kind) {
		case PartKind.Core: this.sprite.texture = global.spritesheet.textures["core.png"]; break;
		case PartKind.Cargo: this.sprite.texture = global.spritesheet.textures[this.owning_player !== null ? "cargo.png" : "cargo_off.png"]; break;
		case PartKind.LandingThruster: this.sprite.texture = global.spritesheet.textures[this.owning_player !== null ? "landing_thruster.png" : "landing_thruster_off.png"]; break;
		case PartKind.Hub: this.sprite.texture = global.spritesheet.textures[this.owning_player !== null ? "hub.png" : "hub_off.png"]; break;
		case PartKind.SolarPanel: this.sprite.texture = global.spritesheet.textures[this.owning_player !== null ? "solar_panel.png" : "solar_panel_off.png"]; break;
		default: this.sprite.texture = global.spritesheet.textures["core.png"]; break;
	}
	global.connector_sprites.removeChild(this.connector_sprite);
	if (this.owning_player !== null && this.kind !== PartKind.Core) global.connector_sprites.addChild(this.connector_sprite);
}
