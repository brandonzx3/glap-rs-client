import * as PIXI from 'pixi.js';
import { ToClientMsg, ToServerMsg, Box, PartKind } from "./codec";
import { Starguide, MainHud } from './gui';

const pixi = new PIXI.Application({ width: window.innerWidth, height: window.innerHeight, antialias: true, transparent: false, backgroundColor: 0 });
document.body.appendChild(pixi.view);

const scaling = new PIXI.Container();
const world = new PIXI.Container();
pixi.stage.addChild(scaling);
const background = PIXI.TilingSprite.from("/starfield.jpg", { width: 100, height: 100 }) as PIXI.TilingSprite;
background.tileScale.set(0.1);
background.position.set(-50);
scaling.addChild(background);
scaling.addChild(world);

let main_hud: MainHud;

let raw_scale_up, zoom = 1, scale_up;
function resize() {
    const window_size = Math.min(window.innerWidth, window.innerHeight);
    pixi.view.width = window.innerWidth;
    pixi.view.height = window.innerHeight;
    pixi.renderer.resize(window.innerWidth, window.innerHeight);
    scaling.position.set(pixi.view.width / 2, pixi.view.height / 2);
    raw_scale_up = Math.max(window_size * (0.035545023696682464), 30);
    scale_up = raw_scale_up * zoom;
    scaling.scale.set(scale_up, scale_up);

    const main_hud_width = window.innerWidth * 0.44326579427083335;
    const main_hud_height = main_hud_width * 0.077749597249793;
    main_hud.container.position.set((window.innerWidth - main_hud_width) / 2, window.innerHeight - main_hud_height);
    main_hud.container.scale.x = main_hud_width; main_hud.container.height = main_hud_height;
}

let rendering = true;

let spritesheet: PIXI.Spritesheet;
export function get_spritesheet() { return spritesheet; }
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
    spritesheet = new PIXI.Spritesheet(texture, dat);
    spritesheet.parse(resolve);
}).then(() => {
    main_hud = new MainHud();
    pixi.stage.addChild(main_hud.container);

    resize();
    window.addEventListener("resize", resize);

    //ws%3A%2F%2Flocalhost%3A8081 for localhost 8081
    const socket = new WebSocket(decodeURIComponent(window.location.hash.slice(1)));
    socket.binaryType = "arraybuffer";
    socket.onopen = () => {
        socket.send(new Uint8Array(new ToServerMsg.Handshake("glap.rs-0.1.0", null).serialize()));
        window.addEventListener("keydown", key_down);
        window.addEventListener("keyup", key_up);
    };
    let my_id: number = null;
    let my_core_id: number = null;
    function handshake_ing(e: MessageEvent) {
        const message = ToClientMsg.deserialize(new Uint8Array(e.data), new Box(0));
        if (message instanceof ToClientMsg.HandshakeAccepted) {
            console.log("Handshake Accepted");
            console.log(message);
            my_id = message.id; my_core_id = message.core_id;
            socket.removeEventListener("message", handshake_ing);
            socket.addEventListener("message", on_message);
        } else throw new Error();
    }
    socket.addEventListener("message", handshake_ing);
    socket.onerror = err => { throw err; };

    let my_core: PartMeta = null;
    const parts = new Map<number, PartMeta>();
    const celestial_objects = new Map<number, CelestialObjectMeta>();
    const players = new Map<number, PlayerMeta>();

    function on_message(e: MessageEvent) {
        const msg = ToClientMsg.deserialize(new Uint8Array(e.data), new Box(0));

        if (msg instanceof ToClientMsg.AddCelestialObject) {
            const celestial_object = new PIXI.Sprite(spritesheet.textures[msg.name + ".png"]);
            celestial_object.width = msg.radius * 2;
            celestial_object.height = msg.radius * 2;
            celestial_object.position.set(msg.position[0] - msg.radius, msg.position[1] - msg.radius);
            world.addChild(celestial_object);
            celestial_objects.set(msg.id, new CelestialObjectMeta(msg.id, msg.display_name, celestial_object));
        }

        else if (msg instanceof ToClientMsg.AddPart) {
            const part = new PIXI.Sprite(spritesheet.textures[PartKind[msg.kind] + ".png"]);
            part.width = 1; part.height = 1;
            if (msg.kind === PartKind.Core) part.anchor.set(0.5, 0.5); else part.anchor.set(0.5, 1);
            world.addChild(part);
            const container = new PIXI.Container();
            container.addChild(part);
            world.addChild(container);
            const meta = new PartMeta(msg.id, msg.kind, container);
            parts.set(msg.id, meta);
            if (msg.id === my_core_id) my_core = meta;
        } else if (msg instanceof ToClientMsg.MovePart) {
            const part = parts.get(msg.id).container;
            //part.position.set(msg.x - 0.5, msg.y - 0.5);
            part.position.set(msg.x, msg.y);
            part.rotation = Math.atan2(-msg.rotation_i, -msg.rotation_n);
        } else if (msg instanceof ToClientMsg.RemovePart) {
            const part = parts.get(msg.id);
            if (part !== null) {
                parts.delete(msg.id);
                world.removeChild(part.container);
            }
        } else if (msg instanceof ToClientMsg.UpdatePartMeta) {
            const meta = parts.get(msg.id);
            if (meta.owning_player !== null) meta.owning_player.parts.delete(meta);
            if (msg.owning_player !== null) {
                meta.owning_player = players.get(msg.owning_player);
                meta.owning_player.parts.add(meta);
                if (meta.kind === PartKind.Core) meta.owning_player.core = this;
            } else meta.owning_player = null;
            meta.thrust_mode.dat = msg.thrust_mode;
        }

        else if (msg instanceof ToClientMsg.AddPlayer) {
            players.set(msg.id, new PlayerMeta(msg.id, msg.name));
        }
        else if (msg instanceof ToClientMsg.UpdatePlayerMeta) {
            const meta = players.get(msg.id);

            meta.thrust_forward = msg.thrust_forward;
            meta.thrust_backward = msg.thrust_backward;
            meta.thrust_clockwise = msg.thrust_clockwise;
            meta.thrust_counter_clockwise = msg.thrust_counter_clockwise;
            meta.update_thruster_sprites();
            
        }
        else if (msg instanceof ToClientMsg.RemovePlayer) {
            players.delete(msg.id);
        }
        else if (msg instanceof ToClientMsg.PostSimulationTick) {
	    console.log(msg.your_fuel);
	}
    }

    let starguide: Starguide = null, starguide_visible = false;
    function render() {
        if (rendering) {
            if (my_core != null) {
                world.position.set(-my_core.container.position.x, -my_core.container.position.y);
                background.tilePosition.set(-my_core.container.position.x / 50, -my_core.container.position.y / 50);
                if (starguide_visible) starguide.update(my_core.container.position.x, my_core.container.position.y);
            }
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
                if (starguide == null) starguide = new Starguide(celestial_objects);
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
        zoom -= event.deltaY * 0.01;
        if (zoom > 1) zoom = 1;
        else if (zoom < 0.5) zoom = 0.5;
        resize();
    });

    (window as any)["dev"] = { pixi, my_core: () => { return my_core }, parts, celestial_objects, spritesheet }
});

enum HorizontalThrustMode { Clockwise, CounterClockwise, Either }
enum VerticalThrustMode { Forwards, Backwards }

class CompactThrustMode {
    dat: number;
    constructor(dat: number) { this.dat = dat; }
    get horizontal(): HorizontalThrustMode {
        switch (this.dat & 0b00000011) {
            case 1: return HorizontalThrustMode.Clockwise;
            case 0: return HorizontalThrustMode.CounterClockwise;
            case 2: return HorizontalThrustMode.Either;
        }
    }
    set horizontal(horizontal: HorizontalThrustMode) {
        let representation;
        switch (horizontal) {
            case HorizontalThrustMode.Clockwise: representation = 1; break;
            case HorizontalThrustMode.CounterClockwise: representation = 0; break;
            case HorizontalThrustMode.Either: representation = 2; break;
        };
        this.dat = (this.dat & 0b11111100) | representation;
    }
    get vertical(): VerticalThrustMode {
        switch (this.dat & 0b00001100) {
            case 1: VerticalThrustMode.Forwards;
            case 0: VerticalThrustMode.Backwards;
            default: throw new Error();
        }
    }
    set vertical(vertical: VerticalThrustMode) {
        let representation;
        switch (vertical) {
            case VerticalThrustMode.Forwards: representation = 4; break;
            case VerticalThrustMode.Backwards: representation = 0; break;
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

class PlayerMeta {
    id: number;
    name: string;
    constructor(id: number, name: string) {
        this.id = id;
        this.name = name;
    }
    thrust_forward = false;
    thrust_backward = false;
    thrust_clockwise = false;
    thrust_counter_clockwise = false;
    parts = new Set<PartMeta>();
    core: PartMeta;

    update_thruster_sprites() {
        for (const part of this.parts) {
            part.update_thruster_sprites(this.thrust_forward, this.thrust_backward, this.thrust_clockwise, this.thrust_counter_clockwise);
        }
    }
}
class PartMeta {
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
                    const sprite = new PIXI.Sprite(spritesheet.textures["thrust.png"]); 
                    sprite.width = 0.2; sprite.height = 0.8;
                    sprite.x = -0.5; sprite.y = 0.5;
                    this.container.addChild(sprite);
                    this.thrust_sprites.push(sprite);
                }
                if (thrust_forward || thrust_counter_clockwise) {
                    const sprite = new PIXI.Sprite(spritesheet.textures["thrust.png"]); 
                    sprite.width = 0.2; sprite.height = 0.8;
                    sprite.x = 0.3; sprite.y = 0.5;
                    this.container.addChild(sprite);
                    this.thrust_sprites.push(sprite);
                }
                if (thrust_backward || thrust_counter_clockwise) {
                    //Height = width * 4.00552486
                    const sprite = new PIXI.Sprite(spritesheet.textures["thrust.png"]); 
                    sprite.width = 0.2; sprite.height = -0.8;
                    sprite.x = -0.5; sprite.y = -0.5;
                    this.container.addChild(sprite);
                    this.thrust_sprites.push(sprite);
                }
                if (thrust_backward || thrust_clockwise) {
                    const sprite = new PIXI.Sprite(spritesheet.textures["thrust.png"]); 
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
export class CelestialObjectMeta {
    id: number;
    display_name: string;
    sprite: PIXI.Sprite;
    constructor(id: number, display_name: string, sprite: PIXI.Sprite) {
        this.id = id; this.display_name = display_name; this.sprite = sprite;
    }
}
