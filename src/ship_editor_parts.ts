import * as PIXI from "pixi.js";
import { global } from "./ship_editor";
import { PartKind } from "./codec";

export class Part {
	kind: PartKind;
	sprite = new PIXI.Sprite();
	connector_sprite = new PIXI.Sprite();
	connected = false;

	constructor(kind: PartKind, connected: boolean) {
		this.kind = kind;
		this.sprite.width = 1; this.sprite.height = 1;
		if (kind === PartKind.Core) this.sprite.anchor.set(0.5, 0.5);
		else this.sprite.anchor.set(0.5,1);
		this.connected = connected;
        this.connector_sprite = new PIXI.Sprite(global.spritesheet.textures["connector.png"]);
        this.connector_sprite.width = 0.333; this.connector_sprite.height = 0.15;
        this.connector_sprite.anchor.set(0.5,0);
		global.part_sprites.addChild(this.sprite);
		this.update_sprites();
	}

    update_sprites() {
        switch (this.kind) {
            case PartKind.Core: this.sprite.texture = global.spritesheet.textures["core.png"]; break;
            case PartKind.Cargo: this.sprite.texture = global.spritesheet.textures[this.connected ? "cargo.png" : "cargo_off.png"]; break;
            case PartKind.LandingThruster: this.sprite.texture = global.spritesheet.textures[this.connected ? "landing_thruster.png" : "landing_thruster_off.png"]; break;
            case PartKind.Hub: this.sprite.texture = global.spritesheet.textures[this.connected ? "hub.png" : "hub_off.png"]; break;
            case PartKind.SolarPanel: this.sprite.texture = global.spritesheet.textures[this.connected ? "solar_panel.png" : "solar_panel_off.png"]; break;
            default: this.sprite.texture = global.spritesheet.textures["core.png"]; break;
        }
        global.connector_sprites.removeChild(this.connector_sprite);
        if (this.connected && this.kind !== PartKind.Core) global.connector_sprites.addChild(this.connector_sprite);
    }

	x = 0;
	y = 0;
	set_position(x: number, y: number) {
		this.x = x; this.y = y;
		this.sprite.position.set(x,y);
		this.connector_sprite.position.copyFrom(this.sprite);
	}
	set_rotation(rot: number) {
		const actual_rot = rot + Math.PI;
		this.sprite.rotation = actual_rot;
		this.connector_sprite.rotation = actual_rot;
	}

	depower() {
		global.part_sprites.removeChild(this.sprite);
		global.connector_sprites.removeChild(this.connector_sprite);
	}
}

export const part_kind_info: Map<PartKind, PartKindInfo> = new Map();
export type PartKindAttachmentInfoType = [AttachmentInfo, AttachmentInfo, AttachmentInfo, AttachmentInfo];
export class PartKindInfo {
	power_storage: number;
	power_regen_per_5_ticks: number;
	attachments: PartKindAttachmentInfoType;
	constructor(power_storage: number, power_regen_per_5_ticks: number, attachments: PartKindAttachmentInfoType) {
		this.power_storage = power_storage;
		this.power_regen_per_5_ticks = power_regen_per_5_ticks;
		this.attachments = attachments;
	}
}
export class AttachmentInfo {
	dx: number;
	dy: number;
	facing: AttachedPartFacing;
	constructor(dx: number, dy: number, facing: AttachedPartFacing) {
		this.dx = dx; this.dy = dy; this.facing = facing;
	}
}
export enum AttachedPartFacing { Up, Right, Down, Left }
export function AttachedPartFacing_PartRotation(facing: AttachedPartFacing): number {
	switch (facing) {
		case AttachedPartFacing.Up: return 0;
		case AttachedPartFacing.Right: return PIXI.PI_2;
		case AttachedPartFacing.Down: return Math.PI;
		case AttachedPartFacing.Left: return -PIXI.PI_2;
	}
}
export function AttachedPartFacing_GetActualRotation(my_attached_as: AttachedPartFacing, parent_actual_rotation: AttachedPartFacing): AttachedPartFacing {
	let num_parent_actual_rotation = parent_actual_rotation as number;
	let num_my_rotation = my_attached_as as number;
	let num = num_parent_actual_rotation + num_my_rotation;
	if (num > 3) return (num - 4) as AttachedPartFacing;
	else return num as AttachedPartFacing;
}

export class RecursivePartDescription {
	kind: PartKind;
	dx: number;
	dy: number;
	drot: number;
	attachments: RecursivePartDescription[];

	constructor(kind: PartKind, dx: number, dy: number, drot: number, attachments: RecursivePartDescription[]) {
		this.kind = kind;
		this.dx = dx;
		this.dy = dy;
		this.drot = drot;
		this.attachments = attachments;
	}
	static upgrade(source: any): RecursivePartDescription {
		const attachments = (source.attachments as object[]).map(obj => obj === null ? null : RecursivePartDescription.upgrade(obj));
		return new RecursivePartDescription(source.kind, source.dx, source.dy, source.drot, attachments);
	}
}
