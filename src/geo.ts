export interface Coordinates {
	latitude: number;
	longitude: number;
}

const CARDINAL_POINTS = [
	'N',
	'NNE',
	'NE',
	'ENE',
	'E',
	'ESE',
	'SE',
	'SSE',
	'S',
	'SSW',
	'SW',
	'WSW',
	'W',
	'WNW',
	'NW',
	'NNW',
] as const;

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;
const toDegrees = (radians: number): number => (radians * 180) / Math.PI;

export function parseWktPoint(value: string): Coordinates | undefined {
	const match = /Point\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\)/i.exec(value);
	if (!match?.[1] || !match[2]) return undefined;
	const longitude = Number(match[1]);
	const latitude = Number(match[2]);
	if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return undefined;
	return { latitude, longitude };
}

export function bearingBetween(from: Coordinates, to: Coordinates): number {
	const fromLat = toRadians(from.latitude);
	const toLat = toRadians(to.latitude);
	const longitudeDelta = toRadians(to.longitude - from.longitude);
	const y = Math.sin(longitudeDelta) * Math.cos(toLat);
	const x =
		Math.cos(fromLat) * Math.sin(toLat) -
		Math.sin(fromLat) * Math.cos(toLat) * Math.cos(longitudeDelta);
	return (toDegrees(Math.atan2(y, x)) + 360) % 360;
}

export function cardinalDirection(bearing: number): string {
	const index = Math.round((((bearing % 360) + 360) % 360) / 22.5) % CARDINAL_POINTS.length;
	return CARDINAL_POINTS[index] ?? 'N';
}

export function formatDistance(kilometers: number, locale?: string): string {
	if (kilometers < 1) {
		const meters = Math.max(1, Math.round(kilometers * 1000));
		return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(meters)} m`;
	}
	return `${new Intl.NumberFormat(locale, {
		maximumFractionDigits: kilometers < 10 ? 1 : 0,
	}).format(kilometers)} km`;
}
