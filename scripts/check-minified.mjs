import { readdir, readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const assetDirectory = new URL('../dist/assets/', import.meta.url);
const files = await readdir(assetDirectory);
const bundles = files.filter((file) => ['.js', '.css'].includes(extname(file)));

if (bundles.length === 0) throw new Error('No JavaScript or CSS bundles were produced.');
if (files.some((file) => file.endsWith('.map'))) throw new Error('Production source maps must not be published.');

for (const file of bundles) {
	const content = await readFile(join(assetDirectory.pathname, file), 'utf8');
	const nonEmptyLines = content.split('\n').filter((line) => line.trim().length > 0);
	const averageLineLength = content.length / Math.max(1, nonEmptyLines.length);
	if (averageLineLength < 200) throw new Error(`${file} does not appear to be minified.`);
}

console.log(`Verified ${bundles.length} minified production bundles.`);
