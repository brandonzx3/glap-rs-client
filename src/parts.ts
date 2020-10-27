import { PartKind } from "./codec";
import { PlayerMeta, global } from "./index";
import * as PIXI from 'pixi.js';
import * as Particles from 'pixi-particles';
import { ParticleManager, ParticleHookFactory, ThrusterEmitter, ThrusterParticleConfig, CoreParticleConfig } from "./particles";
import { Box } from "./codec";

export class PartMeta {
    id: number;
    sprite: PIXI.Sprite;
    connector_sprite: PIXI.Sprite = null;
    kind: PartKind;
	thrust_particles: ParticleManager;
    constructor(id: number, kind: PartKind) {
        this.id = id;
        this.kind = kind;
        this.sprite = new PIXI.Sprite();
        this.sprite.width = 1; this.sprite.height = 1;
        this.update_sprites();
        if (kind === PartKind.Core) {
			this.sprite.anchor.set(0.5,0.5);
			this.thrust_particles = new CoreParticleManager(this);
		} else {
			this.sprite.anchor.set(0.5,1);
			switch (kind) {
				case PartKind.LandingThruster: this.thrust_particles = new ThrustParticleManager(this); break;
			}
		}
        global.part_sprites.addChild(this.sprite);

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
	particle_speed_x = 0;
    inter_y_delta = 0;
    inter_y_positive = true;
    inter_y_dest = 0;
	particle_speed_y = 0;
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

/*    init_thruster_sprites() {
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
    }*/
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
		/*switch (this.kind) {
			case PartKind.Core: {
				this.thrust_sprites.children[0].visible = thrust_forward || thrust_clockwise
				this.thrust_sprites.children[1].visible = thrust_forward || thrust_counter_clockwise;
				this.thrust_sprites.children[2].visible = thrust_backward || thrust_counter_clockwise;
				this.thrust_sprites.children[3].visible = thrust_backward || thrust_clockwise;
			}; break;

			case PartKind.LandingThruster: this.thrust_sprites.children[0].visible = am_i_thrusting; break;
		}*/
		switch (this.kind) {
			case PartKind.LandingThruster:
				(this.thrust_particles as ThrustParticleManager).emitter.emit = am_i_thrusting; 
				global.emitters.add(this.thrust_particles);
				break;
			case PartKind.Core:
				const particles = this.thrust_particles as CoreParticleManager;
				particles.bottom_left.emit = thrust_forward || thrust_clockwise;
				particles.bottom_right.emit = thrust_forward || thrust_counter_clockwise;
				particles.top_left.emit = thrust_backward || thrust_counter_clockwise;
				particles.top_right.emit = thrust_backward || thrust_clockwise;
				global.emitters.add(this.thrust_particles);
				break;
		}
    }
}

export function ThrusterParticleEmit(part: PartMeta, _offset: PIXI.Point, particle: Particles.Particle) {
	const offset = _offset.clone();
	const matrix = (new PIXI.Matrix()).rotate(this.parent.sprite.rotation);
	matrix.apply(offset, offset);
	console.log(offset);
	particle.velocity.x = offset.x + part.particle_speed_x;
	particle.velocity.y = offset.y + part.particle_speed_y;
	matrix.translate(part.sprite.x, part.sprite.y);
	matrix.apply(offset, offset);
	console.log(offset);
	particle.x = offset.x;
	particle.y = offset.y;
}

class ThrustParticleManager implements ParticleManager {
	parent: PartMeta;
	emitter: ThrusterEmitter;

	constructor(parent: PartMeta) {
		this.parent = parent;
		let offset;
		let vel;
		switch (parent.kind) {
			case PartKind.LandingThruster: {
				offset = new PIXI.Point(0, -1);
				vel = new PIXI.Point(0, -3);
			}; break;

			case PartKind.Core: throw new Error("Didn't use CoreParticleManager");
		}
		this.emitter = new ThrusterEmitter(this.parent, offset, vel, global.thrust_particles, global.white_box, ThrusterParticleConfig);
	}

	update_particles(delta_seconds: number): boolean {
		this.emitter.updateSpawnPos(this.parent.sprite.x, this.parent.sprite.y);
		this.emitter.update(delta_seconds);
		return !this.emitter.emit && this.emitter.particleCount < 1;
	}
}


export class CoreParticleManager implements ParticleManager {
	parent: PartMeta;
	bottom_left: ThrusterEmitter;
	bottom_right: ThrusterEmitter;
	top_left: ThrusterEmitter;
	top_right: ThrusterEmitter;

	constructor(parent: PartMeta) {
		this.parent = parent;
		const magnitude = 1.5;
		this.bottom_left = new ThrusterEmitter(this.parent, new PIXI.Point(-0.4, 0.5), new PIXI.Point(0, magnitude), global.thrust_particles, global.white_box, CoreParticleConfig);
		this.bottom_right = new ThrusterEmitter(this.parent, new PIXI.Point(0.4, 0.5), new PIXI.Point(0, magnitude), global.thrust_particles, global.white_box, CoreParticleConfig);
		this.top_left = new ThrusterEmitter(this.parent, new PIXI.Point(-0.4, -0.5), new PIXI.Point(0, -magnitude), global.thrust_particles, global.white_box, CoreParticleConfig);
		this.top_right = new ThrusterEmitter(this.parent, new PIXI.Point(0.4, -0.5), new PIXI.Point(0, -magnitude), global.thrust_particles, global.white_box, CoreParticleConfig);
	}

	update_particles(delta_seconds: number): boolean {
		const self = this;
		function update_emitter(emitter: Particles.Emitter) {
			if (emitter.emit) {
				emitter.updateSpawnPos(self.parent.sprite.x, self.parent.sprite.y);
			}
			emitter.update(delta_seconds);
		}

		update_emitter(this.bottom_left);
		update_emitter(this.bottom_right);
		update_emitter(this.top_left);
		update_emitter(this.top_right);
		return !this.bottom_left.emit && this.bottom_left.particleCount < 1
			&& !this.bottom_right.emit && this.bottom_right.particleCount < 1
			&& !this.top_left.emit && this.top_left.particleCount < 1
			&& !this.top_right.emit && this.top_right.particleCount < 1;
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
