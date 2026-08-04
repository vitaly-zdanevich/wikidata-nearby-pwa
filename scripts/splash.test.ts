import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { appleTouchIcon, encodePng } from './splash';

describe('iOS launch assets', () => {
	it('paints the selected theme before the module starts', () => {
		const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
		const styles = html.slice(html.indexOf('<style id="startup-theme">'), html.indexOf('</style>'));
		expect(styles).toContain('background: #000;');
		expect(html.indexOf('<style id="startup-theme">')).toBeLessThan(html.indexOf('<script type="module"'));
	});

	it('encodes opaque PNG icons', () => {
		const png = appleTouchIcon();
		expect([...png.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
		expect(new DataView(png.buffer).getUint32(16)).toBe(180);
		expect(new DataView(png.buffer).getUint32(20)).toBe(180);
		expect(encodePng(1, 1, Uint8Array.from([0, 0, 0])).length).toBeGreaterThan(20);
	});
});
