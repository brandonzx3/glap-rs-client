import * as Particles from 'pixi-particles';
import { Box } from "./codec";
import { PartMeta } from "./parts";

export interface ParticleManager {
	update_particles(delta_seconds: number): boolean;
}

export function ParticleHookFactory(storage: Box<Particles.Particle[]>): typeof Particles.Particle {
	class ParticleHook extends Particles.Particle {
		constructor(emitter: Particles.Emitter) {
			super(emitter);
			storage.v.push(this);
		}
	}
	return ParticleHook;
}

export const BeamoutParticleConfig: Particles.EmitterConfig = {
	lifetime: { min: 1, max: 2 },
	frequency: 0.001,
	pos: { x: 0, y: 0 },
	maxParticles: 10,
	startRotation: { min: 0, max: 360 },
	autoUpdate: false,
	emitterLifetime: 0.5,

	scale: { list: [
		{ time: 0, value: 0.2 },
		{ time: 1, value: 0.5 }
	] },
	speed: { list: [
		{ time: 0, value: 5   },
		{ time: 1, value: 2.5 },
	] },
	acceleration: { x: -0.5, y: -0.5 },

	color: { list: [
		{ time: 0, value: "#ffffff" },
		{ time: 1, value: "#5fcc4b" },
	] },
};

export const IncinerationParticleConfig: Particles.EmitterConfig = {
	lifetime: { min: 1, max: 2 },
	frequency: 0.001,
	pos: { x: 0, y: 0 },
	maxParticles: 10,
	startRotation: { min: 0, max: 360 },
	autoUpdate: false,
	emitterLifetime: 0.5,

	scale: { list: [
		{ time: 0, value: 0.2 },
		{ time: 1, value: 0.8 }
	] },
	speed: { list: [
		{ time: 0, value: 5   },
		{ time: 1, value: 2.5 },
	] },
	acceleration: { x: -0.5, y: -0.5 },

	color: { list: [
		{ time: 0.0, value: "#D73502" },
		{ time: 0.2, value: "#FAC000" },
		{ time: 1.0, value: "#333333" }
	] },
};

export const ThrusterParticleConfig: Particles.EmitterConfig = {
	lifetime: { min: 0.5, max: 2 },
	frequency: 0.05,
	pos: { x: 0, y: 0 },
	autoUpdate: false,
	emit: false,

	scale: { list: [
		{ time: 0, value: 0.2 },
		{ time: 1, value: 1   },
	] },
	/*speed: { list: [
		{ time: 0, value: 1 },
		{ time: 1, value: 0 },
	] },*/
    speed: { list: [ { time: 0, value: 1.5 } ] },
	startRotation: { min: -8, max: 8 },
//  acceleration: { x: 0.5, y: 0.5 },

	color: { list: [
		{ time: 0.0, value: "#D73502" },
		{ time: 0.2, value: "#FAC000" },
		{ time: 1.0, value: "#333333" }
	] },
}

export const CoreParticleConfig: Particles.EmitterConfig = Object.create(ThrusterParticleConfig);
CoreParticleConfig["color"] = { list: [
	{ time: 0.0, value: "#9CDEEB" },
	{ time: 0.2, value: "#66BEF9" },
	{ time: 1.0, value: "#043F98" },
] };
CoreParticleConfig["scale"] = { list: [
	{ time: 0, value: 0.1 },
	{ time: 1, value: 0.5 },
] };

export const SuperThrusterParticleConfig: Particles.EmitterConfig = Object.create(ThrusterParticleConfig);
SuperThrusterParticleConfig["color"] = { list: [
		{ time: 0.0, value: "#d10707" },
		{ time: 0.2, value: "#D73502" },
		{ time: 1.0, value: "#333333" }
] };

export const EcoThrusterParticleConfig: Particles.EmitterConfig = Object.create(ThrusterParticleConfig);
EcoThrusterParticleConfig["color"] = { list: [
	{ time: 0.0, value: "#ffff79" },
	{ time: 0.8, value: "#b1b1b1" },
	{ time: 1.0, value: "#474747" },
] };
EcoThrusterParticleConfig["scale"] = { list: [
	{ time: 0, value: 0.2 },
	{ time: 1, value: 0.7 },
] };

export class ThrusterEmitter extends Particles.Emitter {
	offset: PIXI.Point;
	vel: PIXI.Point;
	part: PartMeta;

	constructor(part: PartMeta, offset: PIXI.Point, vel: PIXI.Point, parent: PIXI.Container, images: any, config: Particles.EmitterConfig) {
		super(parent, images, config);
		this.part = part;
		this.offset = offset;
		this.vel = vel;
		this._spawnFunc = this.on_emit.bind(this);
	}

	new_particles: Particles.Particle[] = [];
	update(dt: number) {
		super.update(dt);
		for (const particle of this.new_particles) {
			const offset = this.offset.clone();
			const matrix = (new PIXI.Matrix()).rotate(this.part.sprite.rotation);
			matrix.apply(offset, offset);
			particle.x += offset.x;
			particle.y += offset.y;
			const vel = this.vel.clone();
			matrix.apply(vel, vel);
			particle.velocity.x = vel.x + this.part.particle_speed_x;
			particle.velocity.y = vel.y + this.part.particle_speed_y;
			//if (!this.part.inter_x_positive) particle.acceleration.x *= -1;
			//if (!this.part.inter_y_positive) particle.acceleration.y *= -1;
		}
		this.new_particles = [];
		//Copied from Emitter source
		let particle: Particles.Particle;
		let next: Particles.Particle;
		for (particle = this._activeParticlesFirst; particle; particle = next)
        {
            next = particle.next;
			//particle.velocity.x *= 0.95;
			//particle.velocity.y *= 0.95;
        }
	}

	on_emit(particle: Particles.Particle, emit_x: number, emit_y: number) {
		particle.x = emit_x;
		particle.y = emit_y;
		this.new_particles.push(particle);
	}
}
