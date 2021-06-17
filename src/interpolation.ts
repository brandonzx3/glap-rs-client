function nothing_func() {};

export class Interpolation {
	dest: number = 0;
	delta: number = 0;
	now: number = 0;

	advance(delta_ms: number) {
		this.now += this.delta * delta_ms;
		if (this.delta > 0) { if (this.now > this.dest) this.now = this.dest; }
		else { if (this.now < this.dest) this.now = this.dest; }
	}
}

export interface HasInterpolation {
	interpolations: Interpolation[];
	inter_set_next_dest(): void;
	after_update(delta_ms: number): void;
}

export function advance_interpolation(object: HasInterpolation, delta_ms: number) {
	for (const interpolate of object.interpolations) {
		interpolate.advance(delta_ms);
	}
	if (object.after_update) object.after_update(delta_ms);
}

export function set_next_interpolation(object: HasInterpolation, expected_dt_ms: number) {
	object.inter_set_next_dest();
	for (const interpolate of object.interpolations) {
		interpolate.delta = (interpolate.dest - interpolate.now) / expected_dt_ms;
	}
}
