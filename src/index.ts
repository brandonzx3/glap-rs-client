import * as PIXI from 'pixi.js';
import { ToClientMsg, ToServerMsg, Box, PartKind } from "./codec";
import { Starguide, MainHud, StarguideButton } from './gui';
import { PartMeta, CompactThrustMode } from "./parts";

export interface GlobalData {
    pixi: PIXI.Application;
    scaling: PIXI.Container;
    world: PIXI.Container;
    holograms: PIXI.Container;
    thrust_sprites: PIXI.Container;
    part_sprites: PIXI.Container;
    connector_sprites: PIXI.Container;
    main_hud: MainHud;
    starguide_button: StarguideButton;
    screen_to_player_space: (x: number, y: number) => [number, number];
    holographic_grab: PIXI.Texture;
    rendering: boolean;
    spritesheet: PIXI.Spritesheet;
    raw_scale_up: number;
    zoom: number;
    scale_up: number;

    my_core: PartMeta;
    my_id: number;
    parts: Map<number, PartMeta>;
    celestial_objects: Map<number, CelestialObjectMeta>;
    players: Map<number, PlayerMeta>;
}

export const global: GlobalData = {,
    pixi: null,
    scaling: new PIXI.Container(),
    world: new PIXI.Container(),
    holograms: new PIXI.Container(),
    thrust_sprites: new PIXI.Container(),
    part_sprites: new PIXI.Container(),
    connector_sprites: new PIXI.Container(),
    holographic_grab: null,
    screen_to_player_space: null,
    main_hud: null,
    starguide_button: null,
    rendering: true,
    spritesheet: null,
    raw_scale_up: null,
    zoom: 1,
    scale_up: null,

    my_core: null,
    my_id: null,
    parts: new Map(),
    celestial_objects: new Map(),
    players: new Map()
};

const pixi = new PIXI.Application({ width: window.innerWidth, height: window.innerHeight, antialias: true, transparent: false, backgroundColor: 0 });
global.pixi = pixi;
document.body.appendChild(pixi.view);

pixi.stage.addChild(global.scaling);
const background = PIXI.TilingSprite.from("/starfield.jpg", { width: 100, height: 100 }) as PIXI.TilingSprite;
background.tileScale.set(0.1);
background.position.set(-50);
background.zIndex = -100;

global.scaling.addChild(background);
global.world.addChild(global.holograms);
global.world.addChild(global.thrust_sprites);
global.world.addChild(global.part_sprites);
global.world.addChild(global.connector_sprites);
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

function resize() {
    const window_size = Math.min(window.innerWidth, window.innerHeight);
    pixi.view.width = window.innerWidth;
    pixi.view.height = window.innerHeight;
    pixi.renderer.resize(window.innerWidth, window.innerHeight);
    global.scaling.position.set(pixi.view.width / 2, pixi.view.height / 2);
    global.raw_scale_up = Math.max(window_size * (0.035545023696682464), 30);
    global.scale_up = global.raw_scale_up * global.zoom;
    global.scaling.scale.set(global.scale_up, global.scale_up);

    const half_win_width = window.innerWidth / 2, half_win_height = window.innerHeight / 2;
    global.screen_to_player_space = (x, y) => [((x - half_win_width) / global.scale_up), ((y - half_win_height) / global.scale_up)];

    const main_hud_width = window.innerWidth * 0.44326579427083335;
    const main_hud_height = main_hud_width * 0.117749597249793;
    global.main_hud.container.position.set((window.innerWidth - main_hud_width) / 2, window.innerHeight - main_hud_height);
    global.main_hud.container.scale.x = main_hud_width; global.main_hud.container.height = main_hud_height;
    global.starguide_button.container.position.set(window.innerWidth, window.innerHeight);
    global.starguide_button.container.scale.set(main_hud_height);
}

//Tempoary lines of doom
const tmp_lines = new PIXI.Graphics();
// tmp_lines.beginFill(0xff0000);
// tmp_lines.drawPolygon([0,0], [1,1], [43.4530083832,70.2770133538], [42.4530083832,69.2770133538]);
// tmp_lines.drawPolygon([0,0], [1,1], [1,1001], [0,1000]);
// tmp_lines.drawRect(0,0,100000,10000);
// tmp_lines.endFill();
tmp_lines.lineStyle(1, 0xff0000);
tmp_lines.lineTo(43.4530083832,70.2770133538);
tmp_lines.lineTo(0,0);
tmp_lines.lineTo(0,-1000);
global.holograms.addChild(tmp_lines);

let my_core_id: number = null;
let max_fuel = 1;

new Promise(async (resolve, reject) => {
    const image_promise: Promise<HTMLImageElement> = new Promise((resolve, reject) => {
        const image = document.createElement("img");
        image.src = "/spritesheet.png";
        image.onload = () => { resolve(image); }
        image.onerror = err => reject(err);
    });
    const dat_promise: Promise<Object> = fetch("/spritesheet.json").then(res => res.json());
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

    resize();
    window.addEventListener("resize", resize);

    //ws%3A%2F%2Flocalhost%3A8081 for localhost 8081
    const socket = new WebSocket(decodeURIComponent(window.location.hash.slice(1)));
    socket.binaryType = "arraybuffer";
    socket.onopen = () => {
        socket.send(new Uint8Array(new ToServerMsg.Handshake("glap.rs-0.1.0", null).serialize()));
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

    function on_message(e: MessageEvent) {
        const msg = ToClientMsg.deserialize(new Uint8Array(e.data), new Box(0));

        if (msg instanceof ToClientMsg.AddCelestialObject) {
            const celestial_object = new PIXI.Sprite(global.spritesheet.textures[msg.name + ".png"]);
            celestial_object.width = msg.radius * 2;
            celestial_object.height = msg.radius * 2;
            celestial_object.position.set(msg.position[0] - msg.radius, msg.position[1] - msg.radius);
            global.world.addChild(celestial_object);
            global.celestial_objects.set(msg.id, new CelestialObjectMeta(msg.id, msg.display_name, celestial_object));
        }

        else if (msg instanceof ToClientMsg.AddPart) {
            const meta = new PartMeta(msg.id, msg.kind);
            meta.sprite.on("mousedown", part_mouse_down.bind(null, msg.id));
            meta.sprite.interactive = true;
            global.parts.set(msg.id, meta);
            if (msg.id === my_core_id) global.my_core = meta;
        } else if (msg instanceof ToClientMsg.MovePart) {
            const part = global.parts.get(msg.id)
            part.sprite.position.set(msg.x, msg.y);
            const rotation = Math.atan2(-msg.rotation_i, -msg.rotation_n);
            part.sprite.rotation = rotation;
            part.connector_sprite.position.set(msg.x, msg.y);
            part.connector_sprite.rotation = rotation;
            part.thrust_sprites.position.set(msg.x, msg.y);
            part.thrust_sprites.rotation = rotation;
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
            max_fuel = msg.max_fuel;
        }
        else if (msg instanceof ToClientMsg.RemovePlayer) {
            global.players.delete(msg.id);
        }
        else if (msg instanceof ToClientMsg.PostSimulationTick) {
            global.main_hud.set_fuel(msg.your_fuel, max_fuel);
        }
    }

    let starguide: Starguide = null, starguide_visible = false;
    let last_time = performance.now();
    function render(now_time: DOMHighResTimeStamp) {
        const delta_ms = now_time - last_time;
        last_time = now_time;
        if (global.rendering) {
            if (global.my_core != null) {
                global.world.position.set(-global.my_core.sprite.position.x, -global.my_core.sprite.position.y);
                background.tilePosition.set(-global.my_core.sprite.position.x / 50, -global.my_core.sprite.position.y / 50);
                if (starguide_visible) starguide.update(global.my_core.sprite.position.x, global.my_core.sprite.position.y);
            }
            for (const player of global.players.values()) player.update_grabbing_sprite();
            global.starguide_button.pre_render(delta_ms);
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
                if (starguide == null) starguide = new Starguide(global.celestial_objects);
                starguide_visible = !starguide_visible;
                if (starguide_visible) {
                    starguide.stuff.scale.set(Math.min(window.innerWidth, window.innerHeight) * 0.45);
                    starguide.stuff.position.set(window.innerWidth / 2, window.innerHeight / 2);
                    pixi.stage.addChild(starguide.stuff);
                } else pixi.stage.removeChild(starguide.stuff);

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
        global.zoom -= event.deltaY * 0.01;
        if (global.zoom > 1) global.zoom = 1;
        else if (global.zoom < 0.5) global.zoom = 0.5;
        resize();
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
            console.log(scaled);
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

export class PlayerMeta {
    id: number;
    core_id: number;
    name: string;
    constructor(id: number, name: string, core_id: number) {
        this.id = id;
        this.name = name;
        this.core_id = core_id;
    }
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
    constructor(id: number, display_name: string, sprite: PIXI.Sprite) {
        this.id = id; this.display_name = display_name; this.sprite = sprite;
    }
}
