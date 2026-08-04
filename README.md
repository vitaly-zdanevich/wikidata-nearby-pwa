# Nearby on Wikidata

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=vitaly-zdanevich_wikidata-nearby-pwa&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=vitaly-zdanevich_wikidata-nearby-pwa)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=vitaly-zdanevich_wikidata-nearby-pwa&metric=coverage)](https://sonarcloud.io/summary/new_code?id=vitaly-zdanevich_wikidata-nearby-pwa)
[![Bugs](https://sonarcloud.io/api/project_badges/measure?project=vitaly-zdanevich_wikidata-nearby-pwa&metric=bugs)](https://sonarcloud.io/summary/new_code?id=vitaly-zdanevich_wikidata-nearby-pwa)
[![Vulnerabilities](https://sonarcloud.io/api/project_badges/measure?project=vitaly-zdanevich_wikidata-nearby-pwa&metric=vulnerabilities)](https://sonarcloud.io/summary/new_code?id=vitaly-zdanevich_wikidata-nearby-pwa)
[![Code Smells](https://sonarcloud.io/api/project_badges/measure?project=vitaly-zdanevich_wikidata-nearby-pwa&metric=code_smells)](https://sonarcloud.io/summary/new_code?id=vitaly-zdanevich_wikidata-nearby-pwa)
[![Duplicated Lines](https://sonarcloud.io/api/project_badges/measure?project=vitaly-zdanevich_wikidata-nearby-pwa&metric=duplicated_lines_density)](https://sonarcloud.io/summary/new_code?id=vitaly-zdanevich_wikidata-nearby-pwa)
[![Maintainability](https://sonarcloud.io/api/project_badges/measure?project=vitaly-zdanevich_wikidata-nearby-pwa&metric=sqale_rating)](https://sonarcloud.io/summary/new_code?id=vitaly-zdanevich_wikidata-nearby-pwa)
[![Reliability](https://sonarcloud.io/api/project_badges/measure?project=vitaly-zdanevich_wikidata-nearby-pwa&metric=reliability_rating)](https://sonarcloud.io/summary/new_code?id=vitaly-zdanevich_wikidata-nearby-pwa)
[![Security](https://sonarcloud.io/api/project_badges/measure?project=vitaly-zdanevich_wikidata-nearby-pwa&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=vitaly-zdanevich_wikidata-nearby-pwa)
[![Lines of Code](https://sonarcloud.io/api/project_badges/measure?project=vitaly-zdanevich_wikidata-nearby-pwa&metric=ncloc)](https://sonarcloud.io/summary/new_code?id=vitaly-zdanevich_wikidata-nearby-pwa)
[![Technical Debt](https://sonarcloud.io/api/project_badges/measure?project=vitaly-zdanevich_wikidata-nearby-pwa&metric=sqale_index)](https://sonarcloud.io/summary/new_code?id=vitaly-zdanevich_wikidata-nearby-pwa)

A small installable PWA that lists the closest geotagged Wikidata items. It shows localized labels and descriptions, distance, north-up direction, Commons images and audio, and links to Wikidata, Wikipedia, and Google Maps. Tapping a card loads every Wikidata property and keeps entity values, Commons media, URLs, coordinates, units, and formatter-backed identifiers linked to their source.

<img width="720" height="1280" alt="image" src="https://github.com/user-attachments/assets/1ca0d425-ac9f-4c88-9c05-5b7d70c8db51" />

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

The app requests the device location only to query the Wikidata Query Service for nearby coordinates. It does not store the location or send it to an application-owned server. Wikidata, Wikimedia Commons, Wikipedia, and Google Maps links and media are provided by their respective services.
