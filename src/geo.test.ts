import { describe, expect, it } from 'vitest';
import { bearingBetween, cardinalDirection, formatDistance, parseWktPoint } from './geo';

describe('geographic helpers', () => {
	it('parses Wikidata WKT points in longitude/latitude order', () => {
		expect(parseWktPoint('Point(44.8015 41.6938)')).toEqual({
			latitude: 41.6938,
			longitude: 44.8015,
		});
	});

	it('computes a north-up bearing and cardinal direction', () => {
		const bearing = bearingBetween(
			{ latitude: 0, longitude: 0 },
			{ latitude: 1, longitude: 1 },
		);
		expect(bearing).toBeCloseTo(45, 0);
		expect(cardinalDirection(bearing)).toBe('NE');
		expect(cardinalDirection(359)).toBe('N');
	});

	it('formats human-scale metric distances', () => {
		expect(formatDistance(0.042, 'en')).toBe('42 m');
		expect(formatDistance(2.46, 'en')).toBe('2.5 km');
		expect(formatDistance(17.9, 'en')).toBe('18 km');
	});
});
