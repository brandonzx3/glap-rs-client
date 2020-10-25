import * as Particles from 'pixi-particles';

export interface ParticleManager {
	update_particles(delta_seconds: number): boolean;
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
	speed: { list: [
		{ time: 0, value: 1 },
		{ time: 1, value: 0 },
	] },
	startRotation: { min: -8, max: 8 },

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
