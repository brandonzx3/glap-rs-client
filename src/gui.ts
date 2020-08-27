import { CelestialObjectMeta, get_spritesheet } from ".";
import * as PIXI from 'pixi.js';

export class Starguide {
    background: PIXI.Graphics;
    planets: PIXI.Graphics;
    public stuff: PIXI.Container;

    constructor(celestial_objects: Map<number, CelestialObjectMeta>) {
        this.background = new PIXI.Graphics();
        this.background.beginFill(0xb82eb8);
        this.background.drawRoundedRect(-1, -1, 2, 2, 0.05);
        this.background.endFill();
        this.background.beginHole();
        this.background.drawRoundedRect(-0.975, -0.975, 1.95, 1.95, 0.05);
        this.background.endHole();
        this.background.beginFill(0xb82eb8, 0.5);
        this.background.drawRoundedRect(-0.975, -0.975, 1.95, 1.95, 0.05);
        this.background.endFill();
        
        this.stuff = new PIXI.Container();
        this.stuff.addChild(this.background);
    }

    update(core_x: number, core_y: number) {

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
        
        const background = new PIXI.Sprite(get_spritesheet().textures["fuel_gague.png"]);
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