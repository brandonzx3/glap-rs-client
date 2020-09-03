import { CelestialObjectMeta, global } from ".";
import * as PIXI from 'pixi.js';

export class Starguide {
    background: PIXI.Graphics;
    planets: PIXI.Graphics;
    public container: PIXI.Container = new PIXI.Container();
    is_open = false;
    animation_ms: number = 0;
    pre_render: Function;
    offscreen_y = -100;
    onscreen_y = 1;
    width = 1;
    height = 1;
    mouseover = false;

    map_coordinate_space = new PIXI.Container();
    map_items = new PIXI.Container();
    map_mask: PIXI.Graphics;
    map_zoom = 1000;
    map_zoom_divisor = 1;
    map_zoom_factor = this.map_zoom / this.map_zoom_divisor;
    core_sprite = new PIXI.Sprite();

    constructor() {
        this.container.visible = false;
        this.pre_render = () => {};
        this.map_coordinate_space.addChild(this.map_items);
        this.core_sprite.texture = global.spritesheet.textures["starguide_core.png"];
        this.core_sprite.anchor.set(0.5,0.5);
        this.map_coordinate_space.addChild(this.core_sprite);

        this.container.addListener("mouseover", () => {
            this.mouseover = true;
            global.pixi.view.style.cursor = "grab";
        });
        this.container.addListener("mouseout", () => {
            this.mouseover = false;
            global.pixi.view.style.cursor = "default";
        });
    }

    update_sprites(width: number, height: number, container_offset_x: number, container_offset_y: number) {
        this.container.removeChildren();
        this.container.position.set(container_offset_x, container_offset_y);
        this.offscreen_y = -container_offset_y - height;
        this.onscreen_y = container_offset_y;
        this.width = width; this.height = height;

        this.background = new PIXI.Graphics();
        this.background.beginFill(0xdd55ff);
        const background_border_radius = height * 0.05;
        this.background.drawRoundedRect(0, 0, width, height, background_border_radius);
        this.background.endFill();
        this.background.beginHole();
        this.background.drawRoundedRect(10, 10, width - 20, height - 20, background_border_radius - 10);
        this.background.endHole();
        this.background.beginFill(0x5f0079, 0.69);
        this.background.drawRoundedRect(10, 10, width - 20, height - 20, background_border_radius - 10);
        this.background.endFill();
        this.container.addChild(this.background);

        this.map_mask = new PIXI.Graphics();
        this.map_mask.beginFill(0xffffff);
        this.background.drawRoundedRect(10, 10, width - 20, height - 20, background_border_radius - 10);
        this.map_mask.endFill();
        this.map_items.mask = this.map_mask;
        this.container.addChild(this.map_coordinate_space);

        this.map_zoom_divisor = Math.min(width, height);
        this.map_zoom_factor = this.map_zoom / this.map_zoom_divisor;
        this.map_items.scale.set(this.map_zoom_factor);
        this.core_sprite.width = Math.max(25, this.map_zoom_factor);
        this.core_sprite.height = this.core_sprite.width;
        this.center_around_core();
    }

    open() {
        if (this.is_open) return;
        this.is_open = true;
        global.starguide_button.update_sprite_texture(true);
        this.container.visible = true;
        this.center_around_core();

        this.animation_ms = 0;
        this.container.position.y = this.offscreen_y;
        const distance = this.onscreen_y - this.offscreen_y;
        this.pre_render = (delta_ms: number) => {
            this.animation_ms += delta_ms;
            if (this.animation_ms >= 250) {
                this.container.interactive = true;
                this.container.position.y = this.onscreen_y;
                this.pre_render = function() {};
            } else {
                this.container.position.y = this.onscreen_y - (this.animation_curve_function(this.animation_ms * 2) * distance);
            }
        }
    }
    close() {
        if (!this.is_open) return;
        this.is_open = false;
        global.starguide_button.update_sprite_texture(false);
        this.container.interactive = false;
        if (this.mouseover) {
            this.mouseover = false;
            global.pixi.view.style.cursor = "default";
        }

        this.animation_ms = 0;
        this.container.position.y = this.onscreen_y;
        const distance = this.onscreen_y - this.offscreen_y;
        this.pre_render = (delta_ms: number) => {
            this.animation_ms += delta_ms;
            if (this.animation_ms >= 250) {
                this.container.visible = false;
                this.container.position.y = this.offscreen_y;
                this.pre_render = function() {};
            } else {
                this.container.position.y = this.offscreen_y + (this.animation_curve_function(this.animation_ms * 2) * distance);
            }
        }
    }
    animation_curve_function(ms: number): number {
        return 0.0000189147 * Math.pow(500 - ms, 1.75);
    }

    update_core_position(core_x: number, core_y: number, core_rotation: number) {
        this.core_sprite.position.set(core_x * this.map_zoom_factor, core_y * this.map_zoom_factor);
        this.core_sprite.rotation = core_rotation;
    }
    center_around_core() {
        this.map_coordinate_space.position.set(this.width / 2 - this.core_sprite.position.x, this.height / 2 - this.core_sprite.position.y);
    }
    add_celestial_object(celestial_object: CelestialObjectMeta) {

    }
}

export class StarguideButton {
    sprite: PIXI.Sprite;
    container: PIXI.Container = new PIXI.Container();
    pre_render: Function;
    private open: boolean;
    constructor() {
        this.sprite = new PIXI.Sprite();
        this.update_sprite_texture(false);
        this.sprite.anchor.set(1,1);
        this.sprite.position.set(0,0);
        this.sprite.height = 1; this.sprite.width = this.sprite.height * 1.38987342;
        this.container.addChild(this.sprite);
        
        this.pre_render = () => {};
        this.sprite.interactive = true;
        this.sprite.addListener("mouseover", () => {
            global.pixi.view.style.cursor = "pointer";
            this.pre_render = (delta_ms: number) => {
                this.sprite.height += /*0.25 / 250 */ 0.001 *  delta_ms;
                if (this.sprite.height >= 1.15) {
                    this.sprite.height = 1.15;
                    this.pre_render = () => {};
                }
                this.sprite.width = this.sprite.height * 1.38987342;
            };
        });
        this.sprite.addListener("mouseout", () => {
            global.pixi.view.style.cursor = "default";
            this.pre_render = (delta_ms: number) => {
                this.sprite.height -= /*0.25 / 250 */ 0.001 *  delta_ms;
                if (this.sprite.height <= 1) {
                    this.sprite.height = 1;
                    this.pre_render = () => {};
                }
                this.sprite.width = this.sprite.height * 1.38987342;
            };
        });
        this.sprite.addListener("click", () => {
            if (this.open) global.starguide.close(); else global.starguide.open();
        });
    }
    update_sprite_texture(is_menu_open: boolean) {
        this.open = is_menu_open;
        this.sprite.texture = global.spritesheet.textures[this.open ? "starguide_close_icon.png" : "starguide_icon.png"];
    }
}

export class MainHud {
    public container: PIXI.Container;
    fuel: PIXI.Graphics;
    fuel_text: PIXI.Text;

    constructor() {
        this.container = new PIXI.Container();
        const text_style = new PIXI.TextStyle({
            fill: "white",
        });
        
        const background = new PIXI.Sprite(global.spritesheet.textures["fuel_gague.png"]);
        background.width = 1; background.height = 1;

        this.container.addChild(background);

        const fuel_background = new PIXI.Graphics();
        fuel_background.beginFill(0x00aad4);
        fuel_background.drawRect(0.047274295458486, 0.498618150494084, 0.715988129418095, 0.230238985346539);
        fuel_background.endFill();
        this.container.addChild(fuel_background);

        this.fuel = new PIXI.Graphics();
        this.fuel.beginFill(0x55ddff);
        this.fuel.drawRect(0,0.498618150494084,0.715988129418095,0.230238985346539);
        this.fuel.endFill();
        this.fuel.position.x = 0.047274295458486;
        this.container.addChild(this.fuel);

        this.fuel_text = new PIXI.Text("Fuel: 0/0", text_style);
        this.fuel_text.position.set(0.048566785594363, 0.261918570054953);
        this.fuel_text.width = 0.078612775037128; this.fuel_text.height = 0.204358823718318;
        this.container.addChild(this.fuel_text);
    }

    public set_fuel(fuel: number, max_fuel: number) {
        this.fuel.width = (fuel/max_fuel) * 0.715988129418095;
        this.fuel_text.text = `Fuel: ${fuel}/${max_fuel}`;
    }
}