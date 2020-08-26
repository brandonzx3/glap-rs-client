import { CelestialObjectMeta } from ".";
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