import * as PIXI from "pixi.js";
import { global, SaveDataProviderRecursivePartDescription } from "./ship_editor";
import { PartKind } from "./codec";

export class RecursivePart {
	kind: PartKind;
	attachments: RecursivePart[];
	private attachments_inner: PIXI.DisplayObject[] = [];
	
	container = new PIXI.Container();
	sprite = new PIXI.Sprite();
	connector_sprite = new PIXI.Sprite();
	connected = false;

	constructor(kind: PartKind, attachments: RecursivePart[], connected: boolean) {
		this.kind = kind;
		this.attachments = attachments;
		this.connected = connected && this.kind !== PartKind.Core;

		this.sprite.width = 1; this.sprite.height = 1;
		if (kind === PartKind.Core) this.sprite.anchor.set(0.5, 0.5);
		else this.sprite.anchor.set(0.5, 1);
		this.container.addChild(this.sprite);

		this.connector_sprite.texture = global.spritesheet.textures["connector.png"];
        this.connector_sprite.width = 0.333; this.connector_sprite.height = 0.15;
		this.connector_sprite.anchor.set(0.5,0);
		this.connector_sprite.position.set(0,0);
		//this.connector_sprite.rotation = Math.PI;
		this.container.addChild(this.connector_sprite);

		this.update_sprites();
		this.update_attachments();
	}

	static sprites = new Map([
		[PartKind.Core, "core.png"],
		[PartKind.Cargo, "cargo.png"],
		[PartKind.LandingThruster, "landing_thruster.png"],
		[PartKind.Hub, "hub.png"],
		[PartKind.SolarPanel, "solar_panel.png"],
		[PartKind.PowerHub, "power_hub.png"],
		[PartKind.EcoThruster, "eco_thruster.png"],
		[PartKind.SuperThruster, "super_thruster.png"],
		[PartKind.Thruster, "thruster.png"],
		[PartKind.HubThruster, "hub_thruster.png"],
	]);

	update_sprites() {
		switch (this.kind) {
			default:
				this.sprite.texture = global.spritesheet.textures[RecursivePart.sprites.get(this.kind)]; break;
		}
		this.connector_sprite.visible = this.connected;
		//this.connector_sprite.visible = false;
	}
	update_attachments() {
		for (let i = 0; i < this.attachments.length; i++) {
			if (this.attachments[i] == null || this.attachments_inner[i] != null) {
				this.container.removeChild(this.attachments_inner[i]);
				this.attachments_inner[i] = null;
			} else if (this.attachments[i] != null && this.attachments_inner[i] == null) {
				this.attachments_inner[i] = this.attachments[i].container;
				const kind_info = part_kind_info.get(this.kind);
				this.attachments_inner[i].position.set(kind_info.attachments[i].dx, -kind_info.attachments[i].dy);
				this.attachments_inner[i].rotation = AttachedPartFacing_PartRotation(kind_info.attachments[i].facing) - Math.PI;
				this.container.addChild(this.attachments_inner[i]);
			}
		}
	}

	update_position(x: number, y: number) {
		this.container.position.set(x, y);
	}
	update_rotation(rads: number) {
		this.container.rotation = rads;
	}

	depower() {

	}


	static inflate(source: SaveDataProviderRecursivePartDescription): RecursivePart {
		if (!Array.isArray(source.attachments)) throw new Error("Attachments was not an array");
		const attachments = source.attachments.map(attachment => {
			if (typeof attachment !== "object") throw new Error("Attachment wasn't an object");
			if (attachment === null) return null;
			else return RecursivePart.inflate(attachment);
		});
		if (typeof source.kind !== "number") throw new Error("Invalid part kind");
		return new RecursivePart(source.kind, attachments, true);
	}
}

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
		case AttachedPartFacing.Up: return Math.PI;
		case AttachedPartFacing.Right: return 0.5 * Math.PI;
		case AttachedPartFacing.Down: return 0;
		case AttachedPartFacing.Left: return -0.5 * Math.PI;
	}
}
export function AttachedPartFacing_GetActualRotation(my_attached_as: AttachedPartFacing, parent_actual_rotation: AttachedPartFacing): AttachedPartFacing {
	let num_parent_actual_rotation = parent_actual_rotation as number;
	let num_my_rotation = my_attached_as as number;
	let num = num_parent_actual_rotation + num_my_rotation;
	if (num > 3) return (num - 4) as AttachedPartFacing;
	else return num as AttachedPartFacing;
}

export const part_kind_info: Map<PartKind, PartKindInfo> = new Map();
{
	const no_attachments: PartKindAttachmentInfoType = [null, null, null, null];
	part_kind_info.set(PartKind.Core, new PartKindInfo(2000, 0, [
		new AttachmentInfo(0.0, 0.6, AttachedPartFacing.Up),
		new AttachmentInfo(-0.6, 0.0, AttachedPartFacing.Right),
		new AttachmentInfo(0.0, -0.6, AttachedPartFacing.Down),
		new AttachmentInfo(0.6, 0.0, AttachedPartFacing.Left),
	]));

	part_kind_info.set(PartKind.Cargo, new PartKindInfo(200, 0, no_attachments));
	part_kind_info.set(PartKind.LandingThruster, new PartKindInfo(400, 0, no_attachments));

	const hub_attachments: PartKindAttachmentInfoType = [
		null,
		new AttachmentInfo(0.6, 0.5, AttachedPartFacing.Left),
		new AttachmentInfo(0.0, 1.1, AttachedPartFacing.Up),
		new AttachmentInfo(-0.6, 0.5, AttachedPartFacing.Right),
	];
	part_kind_info.set(PartKind.Hub, new PartKindInfo(666, 0, hub_attachments));

	part_kind_info.set(PartKind.SolarPanel, new PartKindInfo(0, 2, no_attachments));
	part_kind_info.set(PartKind.Thruster, new PartKindInfo(500, 0, no_attachments));
	part_kind_info.set(PartKind.SuperThruster, new PartKindInfo(500, 0, no_attachments));
	part_kind_info.set(PartKind.EcoThruster, new PartKindInfo(0, 0, no_attachments));
	part_kind_info.set(PartKind.PowerHub, new PartKindInfo(1332, 0, hub_attachments));
}
