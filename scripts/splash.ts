import { deflateSync } from 'node:zlib';

interface DeviceProfile {
	width: number;
	height: number;
	dpr: number;
	landscape: boolean;
}

const DEVICES: DeviceProfile[] = [
	{ width: 320, height: 568, dpr: 2, landscape: false },
	{ width: 375, height: 667, dpr: 2, landscape: false },
	{ width: 414, height: 736, dpr: 3, landscape: false },
	{ width: 375, height: 812, dpr: 3, landscape: false },
	{ width: 414, height: 896, dpr: 2, landscape: false },
	{ width: 414, height: 896, dpr: 3, landscape: false },
	{ width: 390, height: 844, dpr: 3, landscape: false },
	{ width: 428, height: 926, dpr: 3, landscape: false },
	{ width: 393, height: 852, dpr: 3, landscape: false },
	{ width: 430, height: 932, dpr: 3, landscape: false },
	{ width: 768, height: 1024, dpr: 2, landscape: true },
	{ width: 810, height: 1080, dpr: 2, landscape: true },
	{ width: 834, height: 1194, dpr: 2, landscape: true },
	{ width: 1024, height: 1366, dpr: 2, landscape: true },
];

type Rgb = [number, number, number];

const THEMES: Array<{ scheme: 'light' | 'dark'; background: Rgb; foreground: Rgb }> = [
	{ scheme: 'light', background: [242, 240, 233], foreground: [0, 50, 68] },
	{ scheme: 'dark', background: [0, 0, 0], foreground: [255, 255, 255] },
];

let crcTable: Uint32Array | undefined;

function crc32(bytes: Uint8Array): number {
	if (!crcTable) {
		crcTable = new Uint32Array(256);
		for (let index = 0; index < 256; index++) {
			let value = index;
			for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
			crcTable[index] = value;
		}
	}
	let crc = 0xffffffff;
	for (const byte of bytes) crc = (crcTable[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8);
	return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
	const chunk = new Uint8Array(12 + data.length);
	const view = new DataView(chunk.buffer);
	view.setUint32(0, data.length);
	for (let index = 0; index < 4; index++) chunk[4 + index] = type.charCodeAt(index);
	chunk.set(data, 8);
	view.setUint32(8 + data.length, crc32(chunk.subarray(4, 8 + data.length)));
	return chunk;
}

export function encodePng(width: number, height: number, rgb: Uint8Array): Uint8Array {
	const ihdr = new Uint8Array(13);
	const view = new DataView(ihdr.buffer);
	view.setUint32(0, width);
	view.setUint32(4, height);
	ihdr[8] = 8;
	ihdr[9] = 2;
	const rowLength = width * 3 + 1;
	const raw = new Uint8Array(height * rowLength);
	for (let row = 0; row < height; row++) {
		raw.set(rgb.subarray(row * width * 3, (row + 1) * width * 3), row * rowLength + 1);
	}
	const pieces = [
		Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]),
		pngChunk('IHDR', ihdr),
		pngChunk('IDAT', new Uint8Array(deflateSync(raw, { level: 9 }))),
		pngChunk('IEND', new Uint8Array()),
	];
	const png = new Uint8Array(pieces.reduce((length, piece) => length + piece.length, 0));
	let offset = 0;
	for (const piece of pieces) {
		png.set(piece, offset);
		offset += piece.length;
	}
	return png;
}

function paint(rgb: Uint8Array, width: number, x: number, y: number, color: Rgb): void {
	const index = (y * width + x) * 3;
	rgb[index] = color[0];
	rgb[index + 1] = color[1];
	rgb[index + 2] = color[2];
}

function drawMark(rgb: Uint8Array, width: number, height: number, color: Rgb): void {
	const cx = width / 2;
	const cy = height / 2;
	const size = Math.min(width, height) * 0.35;
	const outer = size * 0.35;
	const inner = size * 0.29;
	const center = size * 0.06;
	const limit = Math.ceil(outer + size * 0.12);
	for (let y = Math.max(0, Math.floor(cy - limit)); y < Math.min(height, Math.ceil(cy + limit)); y++) {
		for (let x = Math.max(0, Math.floor(cx - limit)); x < Math.min(width, Math.ceil(cx + limit)); x++) {
			const dx = x - cx;
			const dy = y - cy;
			const radius = Math.hypot(dx, dy);
			const ring = radius >= inner && radius <= outer;
			const centerDot = radius <= center;
			const arm =
				(Math.abs(dx) <= size * 0.018 && Math.abs(dy) >= outer && Math.abs(dy) <= size * 0.48) ||
				(Math.abs(dy) <= size * 0.018 && Math.abs(dx) >= outer && Math.abs(dx) <= size * 0.48);
			if (ring || centerDot || arm) paint(rgb, width, x, y, color);
		}
	}
}

function render(width: number, height: number, background: Rgb, foreground: Rgb): Uint8Array {
	const rgb = new Uint8Array(width * height * 3);
	for (let index = 0; index < width * height; index++) {
		rgb[index * 3] = background[0];
		rgb[index * 3 + 1] = background[1];
		rgb[index * 3 + 2] = background[2];
	}
	drawMark(rgb, width, height, foreground);
	return rgb;
}

export interface SplashAsset {
	fileName: string;
	media: string;
	png: Uint8Array;
}

export function splashAssets(): SplashAsset[] {
	const assets: SplashAsset[] = [];
	for (const device of DEVICES) {
		for (const theme of THEMES) {
			for (const orientation of device.landscape ? ['portrait', 'landscape'] : ['portrait']) {
				let pixelWidth = device.width * device.dpr;
				let pixelHeight = device.height * device.dpr;
				if (orientation === 'landscape') [pixelWidth, pixelHeight] = [pixelHeight, pixelWidth];
				assets.push({
					fileName: `splash/${theme.scheme}-${pixelWidth}x${pixelHeight}.png`,
					media: [
						'screen',
						`(device-width: ${device.width}px)`,
						`(device-height: ${device.height}px)`,
						`(-webkit-device-pixel-ratio: ${device.dpr})`,
						`(orientation: ${orientation})`,
						`(prefers-color-scheme: ${theme.scheme})`,
					].join(' and '),
					png: encodePng(
						pixelWidth,
						pixelHeight,
						render(pixelWidth, pixelHeight, theme.background, theme.foreground),
					),
				});
			}
		}
	}
	return assets;
}

export function appleTouchIcon(): Uint8Array {
	return encodePng(180, 180, render(180, 180, [0, 0, 0], [255, 255, 255]));
}
