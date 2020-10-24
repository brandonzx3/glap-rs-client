import { PartKind } from "./codec";
import { PlayerMeta, global } from "./index";
import * as PIXI from 'pixi.js';

export class PartMeta {
    id: number;
    sprite: PIXI.Sprite;
    connector_sprite: PIXI.Sprite = null;
    kind: PartKind;
    thrust_sprites = new PIXI.Container();
    constructor(id: number, kind: PartKind) {
        this.id = id;
        this.kind = kind;
        this.sprite = new PIXI.Sprite();
        this.sprite.width = 1; this.sprite.height = 1;
        this.init_thruster_sprites();
        this.update_sprites();
        if (kind === PartKind.Core) this.sprite.anchor.set(0.5,0.5);
        else this.sprite.anchor.set(0.5,1);
        global.part_sprites.addChild(this.sprite);
        global.thrust_sprites.addChild(this.thrust_sprites);

        this.connector_sprite = new PIXI.Sprite(global.spritesheet.textures["connector.png"]);
        this.connector_sprite.width = 0.333; this.connector_sprite.height = 0.15;
        this.connector_sprite.anchor.set(0.5,0);
    }
    owning_player: PlayerMeta = null;
    thrust_mode = new CompactThrustMode(0);

    x = 0;
    y = 0;
    rot = 0;
    inter_x_delta = 0;
    inter_x_positive = true;
    inter_x_dest = 0;
    inter_y_delta = 0;
    inter_y_positive = true;
    inter_y_dest = 0;
    inter_rot_delta = 0;
    inter_rot_positive = true;
    inter_rot_dest = 0;

    update_sprites() {
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

    init_thruster_sprites() {
        switch (this.kind) {
            case PartKind.Core: {
                //Height = width * 4.00552486
                const bottom_left = new PIXI.Sprite(global.spritesheet.textures["thrust.png"]); 
                bottom_left.width = 0.2; bottom_left.height = 0.8;
                bottom_left.x = -0.5; bottom_left.y = 0.5;
                bottom_left.visible = false;
                this.thrust_sprites.addChild(bottom_left);
                const bottom_right = new PIXI.Sprite(global.spritesheet.textures["thrust.png"]); 
                bottom_right.width = 0.2; bottom_right.height = 0.8;
                bottom_right.x = 0.3; bottom_right.y = 0.5;
                bottom_right.visible = false;
                this.thrust_sprites.addChild(bottom_right);
                //Height = width * 4.00552486
                const top_left = new PIXI.Sprite(global.spritesheet.textures["thrust.png"]); 
                top_left.width = 0.2; top_left.height = -0.8;
                top_left.x = -0.5; top_left.y = -0.5;
                top_left.visible = false;
                this.thrust_sprites.addChild(top_left);
                const top_right = new PIXI.Sprite(global.spritesheet.textures["thrust.png"]); 
                top_right.width = 0.2; top_right.height = -0.8;
                top_right.x = 0.3; top_right.y = -0.5;
                top_right.visible = false;
                this.thrust_sprites.addChild(top_right);
            }; break;

            case PartKind.LandingThruster: {
                const thrust_sprite = new PIXI.Sprite(global.spritesheet.textures["thrust.png"]);
                thrust_sprite.width = 0.25; thrust_sprite.height = -1;
                thrust_sprite.x = -0.125; thrust_sprite.y = -1;
                thrust_sprite.visible = false;
                this.thrust_sprites.addChild(thrust_sprite);
            }; break;
        }
    }
    update_thruster_sprites(thrust_forward: boolean, thrust_backward: boolean, thrust_clockwise: boolean, thrust_counter_clockwise: boolean) {     
        let am_i_thrusting;
        switch (this.thrust_mode.horizontal) {
            case HorizontalThrustMode.Clockwise: am_i_thrusting = thrust_clockwise; break;
            case HorizontalThrustMode.CounterClockwise: am_i_thrusting = thrust_counter_clockwise; break;
            case HorizontalThrustMode.Either: am_i_thrusting = false; break;
        }
        switch (this.thrust_mode.vertical) {
            case VerticalThrustMode.Forwards: am_i_thrusting = am_i_thrusting || thrust_forward; break;
            case VerticalThrustMode.Backwards: am_i_thrusting = am_i_thrusting || thrust_backward; break;
            //case VerticalThrustMode.None: break;
        }
        switch (this.kind) {
            case PartKind.Core: {
                this.thrust_sprites.children[0].visible = thrust_forward || thrust_clockwise
                this.thrust_sprites.children[1].visible = thrust_forward || thrust_counter_clockwise;
                this.thrust_sprites.children[2].visible = thrust_backward || thrust_counter_clockwise;
                this.thrust_sprites.children[3].visible = thrust_backward || thrust_clockwise;
            }; break;

            case PartKind.LandingThruster: this.thrust_sprites.children[0].visible = am_i_thrusting; break;
        }
    }
}

export enum HorizontalThrustMode { Clockwise, CounterClockwise, Either }
export enum VerticalThrustMode { Forwards, Backwards, None }

export class CompactThrustMode {
    dat: number;
    constructor(dat: number) { this.dat = dat; }
    get horizontal(): HorizontalThrustMode {
        switch (this.dat & 0b00000011) {
            case 0b00000001: return HorizontalThrustMode.Clockwise;
            case 0b00000000: return HorizontalThrustMode.CounterClockwise;
            case 0b00000010: return HorizontalThrustMode.Either;
        }
    }
    set horizontal(horizontal: HorizontalThrustMode) {
        let representation;
        switch (horizontal) {
            case HorizontalThrustMode.Clockwise: representation = 0b00000001; break;
            case HorizontalThrustMode.CounterClockwise: representation = 0b00000000; break;
            case HorizontalThrustMode.Either: representation = 0b00000010; break;
        };
        this.dat = (this.dat & 0b11111100) | representation;
    }
    get vertical(): VerticalThrustMode {
        switch (this.dat & 0b00001100) {
            case 0b00000100: return VerticalThrustMode.Forwards;
            case 0b00000000: return VerticalThrustMode.Backwards;
            case 0b00001000: return VerticalThrustMode.None;
            default: throw new Error();
        }
    }
    set vertical(vertical: VerticalThrustMode) {
        let representation;
        switch (vertical) {
            case VerticalThrustMode.Forwards: representation = 0b00000100; break;
            case VerticalThrustMode.Backwards: representation = 0b00000000; break;
            case VerticalThrustMode.None: representation = 0b00001000; break;
        }
        this.dat = (this.dat & 0b11110011) | representation;
    }

    static compose(horizontal: HorizontalThrustMode, vertical: VerticalThrustMode): CompactThrustMode {
        let thrust = new CompactThrustMode(0);
        thrust.horizontal = horizontal;
        thrust.vertical = vertical;
        return thrust;
    }
}