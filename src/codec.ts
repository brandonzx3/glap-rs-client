export class Box<T> {
    v: T;
    constructor(v: T) { this.v = v; }
}

function type_string_serialize(out: number[], string: string) {
    if (string.length > 255) { out.push(0); }
    else {
        out.push(string.length);
        for (let i = 0; i < string.length; i++) out.push(string.charCodeAt(i));
    }
}
function type_string_deserialize(buf: Uint8Array, index: Box<number>): string {
    let out = "";
    const size = buf[index.v];
    index.v++;
    let i = index.v;	
    index.v += size;
    while (i < index.v) out += String.fromCharCode(buf[i++]);
    return out; 
}

function type_float_serialize(out: number[], float: number) {
    const arr = new Float32Array([float]);
    const view = new Uint8Array(arr.buffer);
    out.push(view[3], view[2], view[1], view[0]);
}
function type_float_deserialize(buf: Uint8Array, index: Box<number>): number {
    const arr = new Uint8Array([buf[index.v+3], buf[index.v+2], buf[index.v+1], buf[index.v]]);
    const view = new Float32Array(arr.buffer);
    index.v += 4;
    return view[0];
}

function type_ushort_serialize(out: number[], ushort: number) {
    const arr = new Uint16Array([ushort]);
    const view = new Uint8Array(arr.buffer);
    out.push(view[1], view[0]);
}
function type_ushort_deserialize(buf: Uint8Array, index: Box<number>): number {
    const arr = new Uint8Array([buf[index.v+1], buf[index.v]]);
    const view = new Uint16Array(arr);
    index.v += 2;
    return view[0];
}

function type_float_pair_serialize(out: number[], pair: [number, number]) {
    type_float_serialize(out, pair[0])
    type_float_serialize(out, pair[1]);
}
function type_float_pair_deserialize(buf: Uint8Array, index: Box<number>): [number, number] {
    return [type_float_deserialize(buf, index), type_float_deserialize(buf, index)];
}


export enum PartKind {
	Core, Cargo, LandingThruster, Hub
}
function enum_PartKind_serialize(buf: number[], val: PartKind) { buf.push(val as number); }function enum_PartKind_deserialize(buf: Uint8Array, index: Box<number>): PartKind {
	const me = buf[index.v++];
	if (me < 4) return me as PartKind;
	else throw new Error('Bad PartKind deserialize');
}

class ToServerMsg_Handshake {
	static readonly id = 0;
	client: string; session: string|null;
	constructor(client: string, session: string|null,) {
		this.client = client; this.session = session;
	}
	serialize(): Uint8Array
		{let out = [0];
		type_string_serialize(out, this.client);
		if (this.session === null) out.push(0); else {out.push(1); type_string_serialize(out, this.session);};
		return new Uint8Array(out);
	}
}
function deserialize_ToServerMsg(buf: Uint8Array, index: Box<number>) {
	switch (buf[index.v++]) {
		case 0: {
			let client: string; let session: string|null;
			client = type_string_deserialize(buf, index);
			if (buf[index.v++] > 0) {session = type_string_deserialize(buf, index);} else {session = null;}
			return new ToServerMsg_Handshake(client, session);
		}; break;		default: throw new Error();
	}
}
export const ToServerMsg = {
	deserialize: deserialize_ToServerMsg,
	Handshake: ToServerMsg_Handshake
};

class ToClientMsg_HandshakeAccepted {
	static readonly id = 0;
	id: number; core_id: number;
	constructor(id: number, core_id: number,) {
		this.id = id; this.core_id = core_id;
	}
	serialize(): Uint8Array
		{let out = [0];
		type_ushort_serialize(out, this.id);
		type_ushort_serialize(out, this.core_id);
		return new Uint8Array(out);
	}
}
class ToClientMsg_AddCelestialObject {
	static readonly id = 1;
	name: string; display_name: string; radius: number; id: number; position: [number, number];
	constructor(name: string, display_name: string, radius: number, id: number, position: [number, number],) {
		this.name = name; this.display_name = display_name; this.radius = radius; this.id = id; this.position = position;
	}
	serialize(): Uint8Array
		{let out = [1];
		type_string_serialize(out, this.name);
		type_string_serialize(out, this.display_name);
		type_float_serialize(out, this.radius);
		type_ushort_serialize(out, this.id);
		type_float_pair_serialize(out, this.position);
		return new Uint8Array(out);
	}
}
class ToClientMsg_AddPart {
	static readonly id = 2;
	id: number; kind: PartKind;
	constructor(id: number, kind: PartKind,) {
		this.id = id; this.kind = kind;
	}
	serialize(): Uint8Array
		{let out = [2];
		type_ushort_serialize(out, this.id);
		enum_PartKind_serialize(out, this.kind);
		return new Uint8Array(out);
	}
}
class ToClientMsg_MovePart {
	static readonly id = 3;
	id: number; x: number; y: number; rotation_n: number; rotation_i: number;
	constructor(id: number, x: number, y: number, rotation_n: number, rotation_i: number,) {
		this.id = id; this.x = x; this.y = y; this.rotation_n = rotation_n; this.rotation_i = rotation_i;
	}
	serialize(): Uint8Array
		{let out = [3];
		type_ushort_serialize(out, this.id);
		type_float_serialize(out, this.x);
		type_float_serialize(out, this.y);
		type_float_serialize(out, this.rotation_n);
		type_float_serialize(out, this.rotation_i);
		return new Uint8Array(out);
	}
}
class ToClientMsg_RemovePart {
	static readonly id = 4;
	id: number;
	constructor(id: number,) {
		this.id = id;
	}
	serialize(): Uint8Array
		{let out = [4];
		type_ushort_serialize(out, this.id);
		return new Uint8Array(out);
	}
}
function deserialize_ToClientMsg(buf: Uint8Array, index: Box<number>) {
	switch (buf[index.v++]) {
		case 0: {
			let id: number; let core_id: number;
			id = type_ushort_deserialize(buf, index);
			core_id = type_ushort_deserialize(buf, index);
			return new ToClientMsg_HandshakeAccepted(id, core_id);
		}; break;		case 1: {
			let name: string; let display_name: string; let radius: number; let id: number; let position: [number, number];
			name = type_string_deserialize(buf, index);
			display_name = type_string_deserialize(buf, index);
			radius = type_float_deserialize(buf, index);
			id = type_ushort_deserialize(buf, index);
			position = type_float_pair_deserialize(buf, index);
			return new ToClientMsg_AddCelestialObject(name, display_name, radius, id, position);
		}; break;		case 2: {
			let id: number; let kind: PartKind;
			id = type_ushort_deserialize(buf, index);
			kind = enum_PartKind_deserialize(buf, index);
			return new ToClientMsg_AddPart(id, kind);
		}; break;		case 3: {
			let id: number; let x: number; let y: number; let rotation_n: number; let rotation_i: number;
			id = type_ushort_deserialize(buf, index);
			x = type_float_deserialize(buf, index);
			y = type_float_deserialize(buf, index);
			rotation_n = type_float_deserialize(buf, index);
			rotation_i = type_float_deserialize(buf, index);
			return new ToClientMsg_MovePart(id, x, y, rotation_n, rotation_i);
		}; break;		case 4: {
			let id: number;
			id = type_ushort_deserialize(buf, index);
			return new ToClientMsg_RemovePart(id);
		}; break;		default: throw new Error();
	}
}
export const ToClientMsg = {
	deserialize: deserialize_ToClientMsg,
	HandshakeAccepted: ToClientMsg_HandshakeAccepted, AddCelestialObject: ToClientMsg_AddCelestialObject, AddPart: ToClientMsg_AddPart, MovePart: ToClientMsg_MovePart, RemovePart: ToClientMsg_RemovePart
};

