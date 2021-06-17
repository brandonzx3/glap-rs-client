import { ToClientMsg, PlanetKind, } from "./codec";
import * as PIXI from 'pixi.js';
import { global, TICKS_PER_SECOND } from "./index";
import { create_planet_icon_mask } from "./gui";
import { Interpolation, HasInterpolation } from "./interpolation";

export abstract class Planet implements HasInterpolation {
	constructor(id: number, kind: PlanetKind, position: PIXI.Point, render_distance: number) {
		this.id = id;
		this.position = position.clone();
		this.kind = kind;
		this.render_distance = render_distance;
	}
	id: number;
	kind: PlanetKind;
	render_distance: number;
	abstract display_name: string; 
	abstract radius: number;
	//abstract starguide_icon: PIXI.Sprite;
	abstract icon_mask: PIXI.Texture;

	position: PIXI.Point;
	orbit?: Orbit = null;
	inter_x = new Interpolation();
	inter_y = new Interpolation();
	interpolations = [ this.inter_x, this.inter_y ];
	inter_set_next_dest() {
		this.inter_x.dest = this.position.x;
		this.inter_y.dest = this.position.y;
	}

	init_celestial_orbit(msg: InitCelestialOrbitMsg) {
		this.orbit = new Orbit();
		this.orbit.orbit_around = global.celestial_objects.get(msg.orbit_around_body);
		this.orbit.radius = msg.orbit_radius;
		this.orbit.rotation = msg.orbit_rotation;
		this.orbit.total_ticks = msg.orbit_total_ticks;
		this.orbit.parent = this;
		
		global.starguide.planets.get(this.orbit.orbit_around).addChild(this.orbit.make_orbit_ring());
	}
	update_celestial_orbit(msg: UpdateCelestialOrbitMsg) {
		this.orbit.update(msg);
		//[this.position, this.velocity] = this.orbit.calculate_position_vel();		
		[this.position] = this.orbit.calculate_position_vel();
	}

	abstract inflate_graphics(): void;
	abstract after_update(delta_ms: number): void;
	abstract deflate_graphics(): void;
}

type InitCelestialOrbitMsg = InstanceType<typeof ToClientMsg.InitCelestialOrbit>;
type UpdateCelestialOrbitMsg = InstanceType<typeof ToClientMsg.UpdateCelestialOrbit>;
export class Orbit {
	parent: Planet;
	orbit_around: Planet;
	radius: [number, number];
	rotation: number;
	total_ticks: number;
	ticks_ellapsed: number;
	last_position: PIXI.Point = new PIXI.Point();
	last_next_position: PIXI.Point = new PIXI.Point();
	cached_orbit_ring: PIXI.Graphics = null;

	calculate_position_vel(): [PIXI.Point, PIXI.Point] {
	//calculate_position_vel(): PIXI.Point {
		let radians = this.ticks_ellapsed / this.total_ticks * 2 * Math.PI;
		const pos = new PIXI.Point(this.radius[0] * Math.cos(radians), this.radius[1] * Math.sin(radians));
		if (this.rotation !== 0) this.my_rotate_point(pos, this.rotation);
		this.orbit_mask.position.copyFrom(pos);
		pos.x += this.orbit_around.position.x;
		pos.y += this.orbit_around.position.y;

		radians = (this.ticks_ellapsed + 1) / this.total_ticks * 2 * Math.PI;
		const next_pos = new PIXI.Point(this.radius[0] * Math.cos(radians), this.radius[1] * Math.sin(radians));
		if (this.rotation !== 0) this.my_rotate_point(next_pos, this.rotation);
		const parent_next_pos = this.orbit_around.orbit != null ? this.orbit_around.orbit.last_next_position : this.orbit_around.position;
		next_pos.x += parent_next_pos.x;
		next_pos.y += parent_next_pos.y;

		//const vel = new PIXI.Point((next_pos.x - pos.x) * TICKS_PER_SECOND / 1000, (next_pos.y - pos.y) * TICKS_PER_SECOND / 1000);
		this.last_position.copyFrom(pos);
		this.last_next_position.copyFrom(next_pos);
		return [pos, next_pos];
	}

	private my_rotate_point(point: PIXI.Point, radians: number) {
		(new PIXI.Matrix()).rotate(radians).apply(point, point);
	}
	
	advance(): [PIXI.Point, PIXI.Point] {
	//advance(): PIXI.Point {
		this.ticks_ellapsed += 1;
		if (this.ticks_ellapsed >= this.total_ticks) { this.ticks_ellapsed = 0 };
		return this.calculate_position_vel();
	}

	update(msg: UpdateCelestialOrbitMsg) {
		this.ticks_ellapsed = msg.orbit_ticks_ellapsed;
	}

	orbit_ring_container: PIXI.Container;
	orbit_ring: PIXI.Graphics;
	orbit_mask: PIXI.Graphics = new PIXI.Graphics;
	make_orbit_ring(): PIXI.Container {
		const container = new PIXI.Container();
		const ring_radius = this.parent.radius / 2;
		const half_ring_radius = ring_radius/2;
		const graphics = new PIXI.Graphics()
			.beginFill(0xdd55ff)
			.drawEllipse(0, 0, this.radius[0] + half_ring_radius, this.radius[1] + half_ring_radius)
			.endFill()
			.beginHole()
			.drawEllipse(0, 0, this.radius[0] - 5 - half_ring_radius, this.radius[1] - 5 - half_ring_radius)
			.endHole();
		container.addChild(graphics);
		const mask_radius = Math.max(this.parent.radius + 20, 30);
		const mask_graphics = new PIXI.Graphics()
			.beginFill(0xffffff)
			.drawRect(-this.radius[0] * 2, -this.radius[1] * 2, this.radius[0] * 4, this.radius[1] * 4) 
			.endFill()
			.beginHole()
			.drawCircle(0, 0, mask_radius)
			.endHole();
		graphics.mask = mask_graphics;
		container.addChild(mask_graphics);
		container.rotation = this.rotation;
		this.orbit_ring_container = container;
		this.orbit_ring = graphics;
		this.orbit_mask = mask_graphics;
		return container;
	}
}

type AddCelestialObjectMsg = InstanceType<typeof ToClientMsg.AddCelestialObject>;
export function instantiate_planet(msg: AddCelestialObjectMsg): Planet {
	//TODO make badn't
	let sprite: string;
	let symbol: string;
	let display_name: string;
	let code_name: string = null;
	switch (msg.kind) {
		case PlanetKind.Earth: code_name = "earth"; display_name = "Earth"; break;
		case PlanetKind.Moon: code_name = "moon"; display_name = "Moon"; break;
		case PlanetKind.Mars: code_name = "mars"; display_name = "Mars"; break;
		case PlanetKind.Venus: code_name = "venus"; display_name = "Venus"; break;
		case PlanetKind.Mercury: code_name = "mercury"; display_name = "Mercury"; break;
		case PlanetKind.Jupiter: code_name = "jupiter"; display_name = "Jupyter"; break;
		case PlanetKind.Saturn: code_name = "saturn"; display_name = "Saturn"; break;
		case PlanetKind.Uranus: code_name = "uranus"; display_name = "Uranus"; break;
		case PlanetKind.Neptune: code_name = "neptune"; display_name = "Neptune"; break;
		case PlanetKind.Sun: return new SunPlanet(msg.id, msg.radius, new PIXI.Point(...msg.position));
		case PlanetKind.Trade: sprite = "earth.png"; symbol = "symbol_earth.png"; display_name = "Trade"; break;
		case PlanetKind.Pluto: code_name = "pluto"; display_name = "Pluto"; break;
		default: throw new Error(`Unimplemented planet type ${msg.kind} ${PlanetKind[msg.kind]}`);
	}
	if (code_name != null) {
		sprite = `${code_name}.png`;
		symbol = `symbol_${code_name}.png`;
	}
	return new SpritePlanet(msg.id, msg.kind, msg.radius, new PIXI.Point(...msg.position), sprite, symbol, display_name);
}

export class SpritePlanet extends Planet {
	radius: number;
	display_name: string;
	icon_mask: PIXI.Texture;

	sprite: PIXI.Sprite;
	
	constructor(id: number, kind: PlanetKind, radius: number, position: PIXI.Point, sprite_name: string, planet_symbol: string, display_name: string) {
		super(id, kind, position, Math.max(radius * 2, 250));
		this.id = id;
		this.radius = radius;
		this.display_name = display_name;

		this.sprite = new PIXI.Sprite(global.spritesheet.textures[sprite_name]);
		this.sprite.width = this.sprite.height = radius * 2;
		this.sprite.anchor.set(0.5, 0.5);
		this.icon_mask = create_planet_icon_mask(global.spritesheet.textures[planet_symbol]);
	}

	inflate_graphics() { global.planet_sprites.addChild(this.sprite); }
	after_update(_delta_ms: number) { this.sprite.position.set(this.inter_x.now, this.inter_y.now); }
	deflate_graphics() { global.planet_sprites.removeChild(this.sprite); }
}

export class SunPlanet extends Planet {
	radius: number;
	display_name: string;
	icon_mask: PIXI.Texture;
	disp: PIXI.DisplayObject;

	constructor(id: number, radius: number, position: PIXI.Point) {
		super(id, PlanetKind.Sun, position, Math.max(radius * 2, 250));
		this.radius = radius;
		this.display_name = "Sun";
		this.disp = new PIXI.Graphics().beginFill(0xffffff).drawCircle(0,0,radius).endFill();
		this.icon_mask = create_planet_icon_mask(global.spritesheet.textures["symbol_sun.png"]);
	}

	inflate_graphics() { global.planet_sprites.addChild(this.disp); }
	after_update(_delta_ms: number) { this.disp.position.set(this.inter_x.now, this.inter_y.now); }
	deflate_graphics() { global.planet_sprites.removeChild(this.disp); }
}
