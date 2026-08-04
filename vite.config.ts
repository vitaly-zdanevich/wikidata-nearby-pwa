import { readFileSync } from 'node:fs';
import type { Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';
import { appleTouchIcon, splashAssets } from './scripts/splash.ts';

const packageJson = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
	version: string;
};

function iosLaunchAssets(): Plugin {
	let base = './';
	let generatedAssets: ReturnType<typeof splashAssets> | undefined;
	const assets = (): ReturnType<typeof splashAssets> => (generatedAssets ??= splashAssets());
	return {
		name: 'ios-launch-assets',
		configResolved(config) {
			base = config.base;
		},
		transformIndexHtml() {
			return [
				{
					tag: 'link',
					attrs: { rel: 'apple-touch-icon', sizes: '180x180', href: `${base}apple-touch-icon.png` },
					injectTo: 'head' as const,
				},
				...assets().map((asset) => ({
					tag: 'link',
					attrs: {
						rel: 'apple-touch-startup-image',
						href: `${base}${asset.fileName}`,
						media: asset.media,
					},
					injectTo: 'head' as const,
				})),
			];
		},
		generateBundle() {
			this.emitFile({ type: 'asset', fileName: 'apple-touch-icon.png', source: appleTouchIcon() });
			for (const asset of assets()) {
				this.emitFile({ type: 'asset', fileName: asset.fileName, source: asset.png });
			}
		},
	};
}

export default defineConfig({
	base: './',
	define: {
		__APP_VERSION__: JSON.stringify(packageJson.version),
	},
	plugins: [
		iosLaunchAssets(),
		VitePWA({
			registerType: 'autoUpdate',
			injectRegister: 'auto',
			manifest: false,
			includeAssets: ['icon.svg', 'icon-maskable.svg'],
			workbox: {
				cleanupOutdatedCaches: true,
				clientsClaim: true,
				skipWaiting: true,
				navigateFallback: 'index.html',
				globPatterns: ['**/*.{html,js,css,svg,png,webmanifest}'],
				runtimeCaching: [
					{
						urlPattern: /^https:\/\/(?:query|www)\.wikidata\.org\//,
						handler: 'NetworkFirst',
						options: {
							cacheName: 'wikidata-api',
							networkTimeoutSeconds: 8,
							expiration: { maxEntries: 100, maxAgeSeconds: 86_400 },
							cacheableResponse: { statuses: [0, 200] },
						},
					},
					{
						urlPattern: /^https:\/\/(?:commons|upload)\.wikimedia\.org\//,
						handler: 'CacheFirst',
						options: {
							cacheName: 'wikimedia-media',
							expiration: { maxEntries: 80, maxAgeSeconds: 2_592_000 },
							cacheableResponse: { statuses: [0, 200] },
						},
					},
				],
			},
		}),
	],
	build: {
		target: 'safari15',
		cssTarget: 'safari15',
		minify: 'esbuild',
		cssMinify: true,
		sourcemap: false,
	},
	test: {
		environment: 'node',
		coverage: {
			reporter: ['text-summary', 'lcov'],
			include: ['src/**/*.ts', 'scripts/**/*.ts'],
			exclude: ['src/**/*.test.ts'],
		},
	},
});
