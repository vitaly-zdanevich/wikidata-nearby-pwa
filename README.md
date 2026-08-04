# Nearby on Wikidata

A small installable PWA that lists the closest geotagged Wikidata items. It shows localized labels and descriptions, distance, north-up direction, Commons images and audio, and links to Wikidata, Wikipedia, and OpenStreetMap. Tapping a card loads every Wikidata property and keeps entity values, Commons media, URLs, coordinates, units, and formatter-backed identifiers linked to their source.

Live app: <https://vitaly-zdanevich.github.io/wikidata-nearby-pwa/>

## Run locally

Requires Node.js 22 or newer.

```sh
npm install
npm run dev
```

Geolocation is available on `localhost`; deployed copies must use HTTPS.

## Checks and production build

```sh
npm run lint
npm test
npm run build
```

The production command type-checks TypeScript, targets Safari/iOS 15, minifies JavaScript and CSS, generates the service worker, emits a black-backed Apple touch icon and theme-matched iOS startup images, and verifies that published bundles are minified. GitHub Actions repeats these checks and deploys `dist/` to GitHub Pages after every push to `main`.

## Data and privacy

The app requests the device location only to query the Wikidata Query Service for nearby coordinates. It does not store the location or send it to an application-owned server. Wikidata, Wikimedia Commons, Wikipedia, and OpenStreetMap links and media are provided by their respective services.
