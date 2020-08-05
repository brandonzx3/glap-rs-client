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
    let i = index.v + 1;
    index.v += buf[index.v += 1];
    while (i < index.v) out += String.fromCharCode(buf[i += 1]);
    return out; 
}

function type_float_serialize(out: number[], float: number) {
    const arr = new Float32Array([float]);
    const view = new Uint8Array(arr.buffer);
    out.push(view[0], view[1], view[2], view[3]);
}
function type_float_deserialize(buf: Uint8Array, index: Box<number>): number {
    const view = new Float32Array(buf.buffer, index.v, 1);
    return view[0];
}

function type_ushort_serialize(out: number[], ushort: number) {
    const arr = new Uint16Array([ushort]);
    const view = new Uint8Array(arr.buffer);
    out.push(view[0], view[1]);
}
function type_ushort_deserialize(buf: Uint8Array, index: Box<number>): number {
    const view = new Uint16Array(buf.buffer, index.v, 1);
    return view[0];
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
	switch (index.v += 1) {
		case 0: {
			let client: string; let session: string|null;
			client = type_string_deserialize(buf, index);
			if (buf[index.v += 1] > 0) {session = type_string_deserialize(buf, index);} else {session = null;}
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
	id: number;
	constructor(id: number,) {
		this.id = id;
	}
	serialize(): Uint8Array
		{let out = [0];
		type_ushort_serialize(out, this.id);
		return new Uint8Array(out);
	}
}
function deserialize_ToClientMsg(buf: Uint8Array, index: Box<number>) {
	switch (index.v += 1) {
		case 0: {
			let id: number;
			id = type_ushort_deserialize(buf, index);
			return new ToClientMsg_HandshakeAccepted(id);
		}; break;		default: throw new Error();
	}
}
export const ToClientMsg = {
	deserialize: deserialize_ToClientMsg,
	HandshakeAccepted: ToClientMsg_HandshakeAccepted
};

