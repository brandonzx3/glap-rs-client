import * as PIXI from 'pixi.js';
import { ToClientMsg, ToServerMsg, Box, PartKind } from "./codec";
import { Starguide, MainHud, BeamOutButton, StarguideButton, create_planet_icon_mask } from './gui';
import { PartMeta, CompactThrustMode } from "./parts";
import { parse as qs_parse } from "query-string";

export const params = window.location.href.indexOf("?") > -1 ? qs_parse(window.location.href.substr(window.location.href.indexOf("?") + 1)) : {};
console.log("RE");
console.log(params);

export interface GlobalData {
    pixi: PIXI.Application;
    scaling: PIXI.Container;
    world: PIXI.Container;
    holograms: PIXI.Container;
    thrust_sprites: PIXI.Container;
    planet_sprites: PIXI.Container;
    part_sprites: PIXI.Container;
    connector_sprites: PIXI.Container;
    main_hud: MainHud;
    starguide: Starguide;
	beamout_button: BeamOutButton;
    starguide_button: StarguideButton;
    screen_to_player_space: (x: number, y: number) => [number, number];
    holographic_grab: PIXI.Texture;
    rendering: boolean;
    spritesheet: PIXI.Spritesheet;
    raw_scale_up: number;
    zoom: number;
    scale_up: number;
    destination_hologram: PIXI.TilingSprite;
    heading_hologram: PIXI.Sprite;

	socket: WebSocket;
    my_core: PartMeta;
    my_id: number;
    parts: Map<number, PartMeta>;
    celestial_objects: Map<number, CelestialObjectMeta>;
    players: Map<number, PlayerMeta>;
    server_tick_times: number[];
}

export const global: GlobalData = {
    pixi: null,
    scaling: new PIXI.Container(),
    world: new PIXI.Container(),
    holograms: new PIXI.Container(),
    thrust_sprites: new PIXI.Container(),
    planet_sprites: new PIXI.Container(),
    part_sprites: new PIXI.Container(),
    connector_sprites: new PIXI.Container(),
    holographic_grab: null,
    screen_to_player_space: null,
    main_hud: null,
    starguide: null,
	beamout_button: null,
    starguide_button: null,
    rendering: true,
    spritesheet: null,
    raw_scale_up: null,
    zoom: 1,
    scale_up: null,
    destination_hologram: null,
    heading_hologram: new PIXI.Sprite(),

	socket: null,
    my_core: null,
    my_id: null,
    parts: new Map(),
    celestial_objects: new Map(),
    players: new Map(),
    server_tick_times: null,
};

const pixi = new PIXI.Application({ autoStart: false, width: window.innerWidth, height: window.innerHeight, antialias: true, transparent: false, backgroundColor: 0 });
global.pixi = pixi;
document.body.appendChild(pixi.view);

pixi.stage.addChild(global.scaling);
const background = PIXI.TilingSprite.from("./starfield.jpg", { width: 200, height: 150 }) as PIXI.TilingSprite;
background.tileScale.set(0.1);
background.position.set(-100);
background.zIndex = -100;

global.scaling.addChild(background);
global.world.addChild(global.holograms);
global.world.addChild(global.thrust_sprites);
global.world.addChild(global.part_sprites);
global.world.addChild(global.planet_sprites);
global.world.addChild(global.connector_sprites);
global.connector_sprites.zIndex = 10;
global.scaling.addChild(global.world);
global.scaling.interactive = true;

{
    const el_canvas = document.createElement("canvas");
    el_canvas.width = 1500; el_canvas.height = 1;
    const el_context = el_canvas.getContext("2d");
    const el_grado = el_context.createLinearGradient(0,0,1500,0);
    el_grado.addColorStop(0, "rgba(230, 152, 230, 1)");
    el_grado.addColorStop(0.3, "rgba(214, 92, 214, 0.3)");
    el_grado.addColorStop(0.7, "rgba(214, 92, 214, 0.3)");
    el_grado.addColorStop(1, "rgba(230, 152, 230, 1)");
    el_context.fillStyle = el_grado;
    el_context.fillRect(0,0,1500,1);
    global.holographic_grab = PIXI.Texture.from(el_canvas);
    global.holographic_grab.defaultAnchor.set(0, 0.5);
}

let hh_inter_delta = 0;
let hh_inter_positive = true;
let hh_inter_dest = 0;
let hh_inter_next = 0;

function resize() {
    const window_size = Math.min(window.innerWidth, window.innerHeight);
    pixi.view.width = window.innerWidth;
    pixi.view.height = window.innerHeight;
    pixi.renderer.resize(window.innerWidth, window.innerHeight);
    global.scaling.position.set(pixi.view.width / 2, pixi.view.height / 2);
    global.raw_scale_up = Math.max(window_size * (0.045545023696682464), 30);
    global.scale_up = global.raw_scale_up * global.zoom;
    global.scaling.scale.set(global.scale_up, global.scale_up);

    const half_win_width = window.innerWidth / 2, half_win_height = window.innerHeight / 2;
    global.screen_to_player_space = (x, y) => [((x - half_win_width) / global.scale_up), ((y - half_win_height) / global.scale_up)];

    const main_hud_width = window.innerWidth * 0.44326579427083335;
    const main_hud_height = main_hud_width * 0.117749597249793;
    global.main_hud.container.position.set((window.innerWidth - main_hud_width) / 2, window.innerHeight - main_hud_height);
    global.main_hud.container.scale.x = main_hud_width; global.main_hud.container.scale.y = main_hud_height;
    global.starguide_button.container.position.set(window.innerWidth, window.innerHeight);
    global.starguide_button.container.scale.set(main_hud_height);
    global.starguide.update_sprites(main_hud_width, window.innerHeight - main_hud_height - 20, (window.innerWidth - main_hud_width) * 0.5, 10);
	global.beamout_button.container.position.set(window.innerWidth, 0);
	global.beamout_button.container.scale.set(global.starguide_button.container.scale.y);

    global.heading_hologram.height = window.innerHeight * 0.75 / global.scaling.scale.y;
    global.heading_hologram.width = global.heading_hologram.height / global.heading_hologram.texture.height * global.heading_hologram.texture.width
}

let my_core_id: number = null;
let max_fuel = 1;

const PI_over_2 = Math.PI / 2;

new Promise(async (resolve, reject) => {
    const image_promise: Promise<HTMLImageElement> = new Promise((resolve, reject) => {
        const image = document.createElement("img");
        image.src = "./spritesheet.png";
        image.onload = () => { resolve(image); }
        image.onerror = err => reject(err);
    });
    const dat_promise: Promise<Object> = fetch("./spritesheet.json").then(res => res.json());
    const image = await image_promise;
    const dat = await dat_promise;
    const texture = PIXI.Texture.from(image);
    global.spritesheet = new PIXI.Spritesheet(texture, dat);
    global.spritesheet.parse(resolve);
}).then(() => {
    global.main_hud = new MainHud();
    pixi.stage.addChild(global.main_hud.container);
    global.starguide_button = new StarguideButton();
    pixi.stage.addChild(global.starguide_button.container);
	global.beamout_button = new BeamOutButton();
	pixi.stage.addChild(global.beamout_button.container);
    global.starguide = new Starguide();
    pixi.stage.addChild(global.starguide.container);
    global.destination_hologram = new PIXI.TilingSprite(global.spritesheet.textures["destination_hologram.png"], 2, 2);
    global.destination_hologram.anchor.set(1,0.5);
    global.destination_hologram.height = 0.35;
    global.destination_hologram.tileScale.y = global.destination_hologram.height / global.destination_hologram.texture.height;
    global.destination_hologram.tileScale.x = global.destination_hologram.tileScale.y / 2.35;    
    global.destination_hologram.alpha = 0.5;
    global.destination_hologram.visible = false;
    global.holograms.addChild(global.destination_hologram);

    global.heading_hologram.texture = global.spritesheet.textures["heading_hologram.png"];
    global.heading_hologram.anchor.set(0.5);
    global.heading_hologram.alpha = 0.5;
    global.holograms.addChild(global.heading_hologram);

    resize();
    window.addEventListener("resize", resize);

    //ws%3A%2F%2Flocalhost%3A8081 for localhost 8081
    if (typeof params["server"] !== "string") throw new Error("No server address provided");
    const socket = new WebSocket(params["server"] as string);
	global.socket = socket;
    socket.binaryType = "arraybuffer";
    socket.onopen = () => {
        socket.send(new Uint8Array(new ToServerMsg.Handshake("glap.rs-0.1.0", null, "name" in params ? params["name"] as string : "Unnamed").serialize()));
    };
    function handshake_ing(e: MessageEvent) {
        const message = ToClientMsg.deserialize(new Uint8Array(e.data), new Box(0));
        if (message instanceof ToClientMsg.HandshakeAccepted) {
            console.log("Handshake Accepted");
            console.log(message);
            global.my_id = message.id;
            my_core_id = message.core_id;
            socket.removeEventListener("message", handshake_ing);
            socket.addEventListener("message", on_message);
            window.addEventListener("keydown", key_down);
            window.addEventListener("keyup", key_up);
            global.scaling.on("mousedown", world_mouse_down);
            global.scaling.on("mousemove", world_mouse_move);
            global.scaling.on("mouseup", world_mouse_up);
        } else throw new Error();
    }
    socket.addEventListener("message", handshake_ing);
    socket.onerror = err => { throw err; };

    let prev_core_position = [0,0];
    const server_tick_times: number[] = [];
    global.server_tick_times = server_tick_times;
    let next_server_tick_i = 0;
    let previous_server_tick = performance.now();
    const do_interpolation = "do_interpolation" in params ? params["do_interpolation"] === "true" : true;

    function on_message(e: MessageEvent) {
        const msg = ToClientMsg.deserialize(new Uint8Array(e.data), new Box(0));

        if (msg instanceof ToClientMsg.AddCelestialObject) {
            const celestial_object = new PIXI.Sprite(global.spritesheet.textures[msg.name + ".png"]);
            celestial_object.width = msg.radius * 2;
            celestial_object.height = msg.radius * 2;
            celestial_object.anchor.set(0.5,0.5);
            celestial_object.position.set(msg.position[0], msg.position[1]);
            global.planet_sprites.addChild(celestial_object);
            const meta = new CelestialObjectMeta(msg.id, msg.name, msg.display_name, celestial_object, msg.radius);
            global.celestial_objects.set(msg.id, meta);
            global.starguide.add_celestial_object(meta);

            if (msg.name === "moon") {
                global.destination_hologram.visible = true;
                global.starguide.current_destination = meta;
                global.starguide.retarget_destination_hologram();
            }
        }

        else if (msg instanceof ToClientMsg.AddPart) {
            const meta = new PartMeta(msg.id, msg.kind);
            meta.sprite.on("mousedown", part_mouse_down.bind(null, msg.id));
            meta.sprite.interactive = true;
            global.parts.set(msg.id, meta);
            if (msg.id === my_core_id) global.my_core = meta;
        } else if (msg instanceof ToClientMsg.MovePart) {
            const part = global.parts.get(msg.id)
            part.x = msg.x; part.y = msg.y;
            const rotation = Math.atan2(-msg.rotation_i, -msg.rotation_n);
            part.rot = rotation;

            if (msg.id === my_core_id) {
                const planetary_distance = [global.my_core.sprite.x - global.destination_hologram.x, global.my_core.sprite.y - global.destination_hologram.y];
                global.main_hud.position_text.text = `Pos: ${Math.round(planetary_distance[0])}, ${Math.round(planetary_distance[1])}`;
                global.main_hud.position_text.width = (global.main_hud.position_text.texture.width / global.main_hud.position_text.texture.height) * global.main_hud.position_text.height * 0.1;

                const delta_pos = [prev_core_position[0] - msg.x, prev_core_position[1] - msg.y];
		if (Math.abs(delta_pos[0]) > 0.01 || Math.abs(delta_pos[1]) > 0.01) 
			global.heading_hologram.rotation = Math.atan2(delta_pos[1], delta_pos[0]) - PI_over_2;
			//hh_inter_next = Math.atan2(delta_pos[1], delta_pos[0]) - PI_over_2;
                global.main_hud.velocity_text.text = `Vel: ${Math.round(delta_pos[0] * 20)}, ${Math.round(delta_pos[1] * 20)}`;
                global.main_hud.velocity_text.width = (global.main_hud.velocity_text.texture.width / global.main_hud.velocity_text.texture.height) * global.main_hud.velocity_text.height * 0.1;
                prev_core_position = [msg.x, msg.y];
            }
        } else if (msg instanceof ToClientMsg.RemovePart) {
            const part = global.parts.get(msg.id);
            if (part !== null) {
                global.parts.delete(msg.id);
                global.part_sprites.removeChild(part.sprite);
                global.thrust_sprites.removeChild(part.thrust_sprites);
                global.connector_sprites.removeChild(part.connector_sprite);
            }
        } else if (msg instanceof ToClientMsg.UpdatePartMeta) {
            const meta = global.parts.get(msg.id);
            if (meta.owning_player !== null) meta.owning_player.parts.delete(meta);
            if (msg.owning_player !== null) {
                meta.owning_player = global.players.get(msg.owning_player);
                meta.owning_player.parts.add(meta);
                meta.update_thruster_sprites(meta.owning_player.thrust_forward, meta.owning_player.thrust_backward, meta.owning_player.thrust_clockwise, meta.owning_player.thrust_counter_clockwise);

		if (meta.kind === PartKind.Core) {
			meta.owning_player.core = meta;
		}
            } else {
                meta.owning_player = null;
                meta.update_thruster_sprites(false, false, false, false);
            }
            meta.thrust_mode.dat = msg.thrust_mode;
            meta.update_sprites();
        }

        else if (msg instanceof ToClientMsg.AddPlayer) {
            global.players.set(msg.id, new PlayerMeta(msg.id, msg.name, msg.core_id));
        }
        else if (msg instanceof ToClientMsg.UpdatePlayerMeta) {
            const meta = global.players.get(msg.id);
            meta.thrust_forward = msg.thrust_forward;
            meta.thrust_backward = msg.thrust_backward;
            meta.thrust_clockwise = msg.thrust_clockwise;
            meta.thrust_counter_clockwise = msg.thrust_counter_clockwise;
            meta.update_thruster_sprites();
            meta.grabbed_part = msg.grabed_part;
            if (meta.grabbed_part === null && meta.holographic_grab_sprite !== null) {
                global.holograms.removeChild(meta.holographic_grab_sprite);
                meta.holographic_grab_sprite = null;
            }
        }
        else if (msg instanceof ToClientMsg.UpdateMyMeta) {
            max_fuel = msg.max_power;
			global.beamout_button.set_can_beamout(msg.can_beamout);
        }
        else if (msg instanceof ToClientMsg.RemovePlayer) {
			const player = global.players.get(msg.id);
			if (player !== null) {
				global.connector_sprites.removeChild(player.name_sprite);
				global.players.delete(msg.id);
			}
	    
        }


        else if (msg instanceof ToClientMsg.PostSimulationTick) {
            global.main_hud.set_fuel(msg.your_power, max_fuel);

            const now = performance.now();
            const delta_server_tick = now - previous_server_tick;
            previous_server_tick = now;
            server_tick_times[next_server_tick_i] = delta_server_tick;
            next_server_tick_i += 1;
            if (next_server_tick_i >= 40) next_server_tick_i = 0;
            let average_server_tick_time = 0;
            server_tick_times.forEach(val => average_server_tick_time += val);
            average_server_tick_time /= server_tick_times.length;
            average_server_tick_time += 100;
		
	    /*{
		let sprite_rot = global.heading_hologram.rotation;
                const dif = sprite_rot - hh_inter_next;
                if (dif > Math.PI) sprite_rot -= PIXI.PI_2;
                else if (dif < -Math.PI) sprite_rot += PIXI.PI_2;
                global.heading_hologram.rotation = sprite_rot;
		hh_inter_dest = hh_inter_next;
                hh_inter_delta = (hh_inter_dest - sprite_rot) / average_server_tick_time;
                hh_inter_positive = hh_inter_delta >= 0;
	    }*/
            for (const part of global.parts.values()) {
                part.inter_x_dest = part.x;
                part.inter_x_delta = (part.inter_x_dest - part.sprite.x) / average_server_tick_time;
                part.inter_x_positive = part.inter_x_delta >= 0;
                part.inter_y_dest = part.y;
                part.inter_y_delta = (part.inter_y_dest - part.sprite.y) / average_server_tick_time;
                part.inter_y_positive = part.inter_y_delta >= 0;
                part.inter_rot_dest = part.rot;
                let sprite_rot = part.sprite.rotation;
                const dif = part.sprite.rotation - part.rot;
                if (dif > Math.PI) sprite_rot -= PIXI.PI_2;
                else if (dif < -Math.PI) sprite_rot += PIXI.PI_2;
                part.sprite.rotation = sprite_rot;
                part.inter_rot_delta = (part.inter_rot_dest - sprite_rot) / average_server_tick_time;
                part.inter_rot_positive = part.inter_rot_delta >= 0;             
            }
        }
    }

    let last_time = performance.now();
    function render(now_time: DOMHighResTimeStamp) {
        const delta_ms = now_time - last_time;
        last_time = now_time;
        if (global.rendering) {
	    //global.heading_hologram.rotation += hh_inter_delta;
	    //if (hh_inter_positive ? global.heading_hologram.rotation > hh_inter_dest : global.heading_hologram.rotation < hh_inter_dest) global.heading_hologram.rotation = hh_inter_dest;
            for (const part of global.parts.values()) {
                part.sprite.x += part.inter_x_delta * delta_ms;
                if (part.inter_x_positive ? part.sprite.x > part.inter_x_dest : part.sprite.x < part.inter_x_dest) part.sprite.x = part.inter_x_dest;
                part.sprite.y += part.inter_y_delta * delta_ms;
                if (part.inter_y_positive ? part.sprite.y > part.inter_y_dest : part.sprite.y < part.inter_y_dest) part.sprite.y = part.inter_y_dest;
                part.sprite.rotation += part.inter_rot_delta * delta_ms;
                if (part.inter_rot_positive ? part.sprite.rotation > part.inter_rot_dest : part.sprite.rotation < part.inter_rot_dest) part.sprite.rotation = part.inter_rot_dest;

                const x = part.sprite.x; const y = part.sprite.y; const rotation = part.sprite.rotation;
                part.sprite.rotation = rotation;
                part.connector_sprite.position.set(x, y);
                part.connector_sprite.rotation = rotation;
                part.thrust_sprites.position.set(x, y);
                part.thrust_sprites.rotation = rotation;
		if (part.kind === PartKind.Core && part.owning_player !== null) {
			part.owning_player.name_sprite.position.set(x, y - 0.85);
		}
            }

            if (global.my_core != null) {
                global.world.position.set(-global.my_core.sprite.position.x, -global.my_core.sprite.position.y);
                background.tilePosition.set(-global.my_core.sprite.position.x / 50, -global.my_core.sprite.position.y / 50);
                global.starguide.update_core_position(global.my_core.sprite.position.x, global.my_core.sprite.position.y, global.my_core.sprite.rotation);

                const distance = [global.my_core.sprite.x - global.destination_hologram.x, global.my_core.sprite.y - global.destination_hologram.y];
                global.destination_hologram.width = Math.sqrt(Math.pow(distance[0], 2) + Math.pow(distance[1], 2));
                global.destination_hologram.rotation = Math.atan2(-distance[1], -distance[0]);
                global.destination_hologram.tilePosition.x = global.destination_hologram.width * 0.2;
                global.heading_hologram.position.copyFrom(global.my_core.sprite.position);
            }

            for (const player of global.players.values()) player.update_grabbing_sprite();
            global.starguide_button.pre_render(delta_ms);
            global.starguide.pre_render(delta_ms);
			global.beamout_button.pre_render(delta_ms);
            pixi.render();
            requestAnimationFrame(render);
        }
    }
    requestAnimationFrame(render);

    const keys_down: Set<number> = new Set();
    const my_thrusters = new ToServerMsg.SetThrusters(false, false, false, false);
    function key_down(e: KeyboardEvent) {
        if (keys_down.has(e.keyCode)) return;
        keys_down.add(e.keyCode);
        switch (e.keyCode) {
            case 87: //w
                my_thrusters.forward = true;
                socket.send(my_thrusters.serialize());
                break;
            case 83: //s
                my_thrusters.backward = true;
                socket.send(my_thrusters.serialize());
                break;
            case 65: //a
                my_thrusters.counter_clockwise = true;
                socket.send(my_thrusters.serialize());
                break;
            case 68: //d
                my_thrusters.clockwise = true;
                socket.send(my_thrusters.serialize());
                break;
            case 77: //m
                if (global.starguide.is_open) global.starguide.close(); else global.starguide.open();
                break;

        };
    }
    function key_up(e: KeyboardEvent) {
        if (keys_down.delete(e.keyCode)) {
            switch (e.keyCode) {
                case 87: //w
                    my_thrusters.forward = false;
                    socket.send(my_thrusters.serialize());
                    break;
                case 83: //s
                    my_thrusters.backward = false;
                    socket.send(my_thrusters.serialize());
                    break;
                case 65: //a
                    my_thrusters.counter_clockwise = false;
                    socket.send(my_thrusters.serialize());
                    break;
                case 68: //d
                    my_thrusters.clockwise = false;
                    socket.send(my_thrusters.serialize());
                    break;
            }
        }
    }

    pixi.view.addEventListener("wheel", event => {
	const deltaY = Math.abs(event.deltaY) > 50 ? event.deltaY / 50 : event.deltaY
        if (global.starguide.mouseover) global.starguide.on_wheel(event, deltaY);
        else {
            global.zoom -= deltaY * 0.01;
            if (global.zoom > 1) global.zoom = 1;
            else if (global.zoom < 0.5) global.zoom = 0.5;
            resize();
        }
    });

    (window as any)["dev"] = global;

    let am_grabbing = false;
    function world_mouse_down(event: PIXI.InteractionEvent) {
        // const scaled = screen_to_player_space(event.data.global.x, event.data.global.y);
        // console.log(scaled);
        // socket.send(new ToServerMsg.CommitGrab(scaled[0], scaled[1]).serialize());
        // am_grabbing = true;
    }
    function part_mouse_down(part_id: number, event: PIXI.InteractionEvent) {
        if (!am_grabbing) {
            am_grabbing = true;
            const scaled = global.screen_to_player_space(event.data.global.x, event.data.global.y);
            //console.log(scaled);
            socket.send(new ToServerMsg.CommitGrab(part_id, scaled[0], scaled[1]).serialize());
            am_grabbing = true;
        }
    }
    function world_mouse_move(event: PIXI.InteractionEvent) {
        if (am_grabbing) {
            const scaled = global.screen_to_player_space(event.data.global.x, event.data.global.y);
            socket.send(new ToServerMsg.MoveGrab(scaled[0], scaled[1]).serialize());
        }
    }
    function world_mouse_up(event: PIXI.InteractionEvent) {
        if (am_grabbing) {
            am_grabbing = false;
            socket.send(new ToServerMsg.ReleaseGrab().serialize());
        }
    }
});

const name_text_style = new PIXI.TextStyle({ fill: 0xffffff, align: "center", stroke: 0x000000, strokeThickness: 0.01});
export class PlayerMeta {
    id: number;
    core_id: number;
    name: string;
    name_sprite: PIXI.Text;
    constructor(id: number, name: string, core_id: number) {
        this.id = id;
        this.name = name;
        this.core_id = core_id;

	this.name_sprite = new PIXI.Text(this.name, name_text_style);
	this.name_sprite.updateText(true);
	console.log(this.name_sprite.texture.height);
	this.name_sprite.width = 0.8 / this.name_sprite.texture.height * this.name_sprite.texture.width;
	this.name_sprite.height = 0.8;
	this.name_sprite.anchor.set(0.5,1);
	global.connector_sprites.addChild(this.name_sprite);
    }
    core: PartMeta = null;
    thrust_forward = false;
    thrust_backward = false;
    thrust_clockwise = false;
    thrust_counter_clockwise = false;
    parts = new Set<PartMeta>();
    grabbed_part: number = null;
    holographic_grab_sprite: PIXI.Sprite = null;

    update_thruster_sprites() {
        for (const part of this.parts) {
            part.update_thruster_sprites(this.thrust_forward, this.thrust_backward, this.thrust_clockwise, this.thrust_counter_clockwise);
        }
    }
    update_grabbing_sprite() {
        if (this.grabbed_part !== null) {
            if (this.holographic_grab_sprite === null) {
                this.holographic_grab_sprite = new PIXI.Sprite(global.holographic_grab);
                this.holographic_grab_sprite.height = 0.25;
                global.holograms.addChild(this.holographic_grab_sprite);
            }
            const player = global.parts.get(this.core_id);
            const grabbed_part = global.parts.get(this.grabbed_part);
            const delta_x = grabbed_part.sprite.position.x - player.sprite.position.x;
            const delta_y = grabbed_part.sprite.position.y - player.sprite.position.y;
            this.holographic_grab_sprite.position.set(player.sprite.position.x, player.sprite.position.y);
            this.holographic_grab_sprite.width = Math.sqrt(Math.pow(delta_x, 2) + Math.pow(delta_y, 2));
            this.holographic_grab_sprite.rotation = Math.atan2(delta_y, delta_x);
        }
    }
}

export class CelestialObjectMeta {
    id: number;
    display_name: string;
    sprite: PIXI.Sprite;
    radius: number;
    name: string;
    icon_mask: PIXI.Texture;
    constructor(id: number, name: string, display_name: string, sprite: PIXI.Sprite, radius: number) {
        this.id = id; this.display_name = display_name; this.sprite = sprite; this.name = name;
        this.radius = radius;
        this.icon_mask = create_planet_icon_mask(global.spritesheet.textures["symbol_" + this.name + ".png"])
    }
}
