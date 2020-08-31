import { PartKind } from "./codec";
import { PlayerMeta, global } from "./index";

export class PartMeta {
    id: number;
    container: PIXI.Container;
    kind: PartKind;
    constructor(id: number, kind: PartKind, container: PIXI.Container) {
        this.id = id; this.container = container;
        this.kind = kind;
    }
    thrust_sprites: PIXI.Sprite[] = []; //Potentially could be better
    owning_player: PlayerMeta = null;
    thrust_mode = new CompactThrustMode(0);

    update_thruster_sprites(thrust_forward: boolean, thrust_backward: boolean, thrust_clockwise: boolean, thrust_counter_clockwise: boolean) {
        for (const sprite of this.thrust_sprites) this.container.removeChild(sprite)        
        switch (this.kind) {
            case PartKind.Core: {
                this.thrust_sprites = [];
                if (thrust_forward || thrust_clockwise) {
                    //Height = width * 4.00552486
                    const sprite = new PIXI.Sprite(global.spritesheet.textures["thrust.png"]); 
                    sprite.width = 0.2; sprite.height = 0.8;
                    sprite.x = -0.5; sprite.y = 0.5;
                    this.container.addChild(sprite);
                    this.thrust_sprites.push(sprite);
                }
                if (thrust_forward || thrust_counter_clockwise) {
                    const sprite = new PIXI.Sprite(global.spritesheet.textures["thrust.png"]); 
                    sprite.width = 0.2; sprite.height = 0.8;
                    sprite.x = 0.3; sprite.y = 0.5;
                    this.container.addChild(sprite);
                    this.thrust_sprites.push(sprite);
                }
                if (thrust_backward || thrust_counter_clockwise) {
                    //Height = width * 4.00552486
                    const sprite = new PIXI.Sprite(global.spritesheet.textures["thrust.png"]); 
                    sprite.width = 0.2; sprite.height = -0.8;
                    sprite.x = -0.5; sprite.y = -0.5;
                    this.container.addChild(sprite);
                    this.thrust_sprites.push(sprite);
                }
                if (thrust_backward || thrust_clockwise) {
                    const sprite = new PIXI.Sprite(global.spritesheet.textures["thrust.png"]); 
                    sprite.width = 0.2; sprite.height = -0.8;
                    sprite.x = 0.3; sprite.y = -0.5;
                    this.container.addChild(sprite);
                    this.thrust_sprites.push(sprite);
                }
            }; break;

            default: { this.thrust_sprites = []; break; }
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