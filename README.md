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

## My other Wikimedia-related projects

### GitHub

- **[wikimedia_commons_pwa_viewer](https://github.com/vitaly-zdanevich/wikimedia_commons_pwa_viewer)** —
  minimal PWA for browsing Wikimedia Commons images by feed, category, search, or
  location ([open the app](https://vitaly-zdanevich.github.io/wikimedia_commons_pwa_viewer/))
- [PWAWikimediaCommonsUploader](https://github.com/vitaly-zdanevich/PWAWikimediaCommonsUploader) —
  PWA that uploads photos and videos to Wikimedia Commons
- [bot_telegram_wikimedia_commons_uploader](https://github.com/vitaly-zdanevich/bot_telegram_wikimedia_commons_uploader) —
  Telegram bot that uploads images and media to Wikimedia Commons under each
  user's own account
- [bot_telegram_wikimedia_commons](https://github.com/vitaly-zdanevich/bot_telegram_wikimedia_commons) —
  Telegram and CLI bot for searching Wikimedia Commons media
- [bot_telegram_wikipedia](https://github.com/vitaly-zdanevich/bot_telegram_wikipedia) —
  Telegram bot for Wikipedia search
- [gthumb-copy-wikimedia-commons-link](https://github.com/vitaly-zdanevich/gthumb-copy-wikimedia-commons-link) —
  gThumb extension that copies the Wikimedia Commons link for a local file
- [wikipedia_diffs_to_evernote](https://github.com/vitaly-zdanevich/wikipedia_diffs_to_evernote) —
  daily synchronization of a Wikipedia user's edits to Evernote
- [wikipedia-userstyle-dark-minimum](https://github.com/vitaly-zdanevich/wikipedia-userstyle-dark-minimum) —
  dark, minimal Wikipedia userstyle that does not require a browser extension
- [youta](https://github.com/vitaly-zdanevich/youta) —
  low-resource terminal audio player with Wikidata metadata integration

### GitLab

- [wiki2man_on_rust](https://gitlab.com/vitaly_zdanevich_wikimedia/wiki2man_on_rust) —
  converts official Wikipedia XML dumps into roff man pages for offline reading
  in a terminal
- [gthumb-wikimedia-commons-extension](https://gitlab.com/vitaly_zdanevich_wikimedia/gthumb-wikimedia-commons-extension) —
  gThumb extension for viewing Wikimedia Commons images
- [commons-fuse](https://gitlab.com/vitaly_zdanevich_wikimedia/commons-fuse) —
  read-only FUSE filesystem for Wikimedia Commons
- [upload_to_commons_with_categories_from_iptc](https://gitlab.com/vitaly_zdanevich_wikimedia/upload_to_commons_with_categories_from_iptc) —
  Python script for uploading images from gThumb with IPTC categories
- [pwb_wrapper_for_simpler_uploading_to_commons](https://gitlab.com/vitaly_zdanevich_wikimedia/pwb_wrapper_for_simpler_uploading_to_commons) —
  stateless CLI wrapper around Pywikibot for single-file and batch uploads
- [web-extension-uploading-to-wikimedia-commons](https://gitlab.com/vitaly-zdanevich-extensions/uploading-to-wikimedia-commons) —
  browser extension for uploading images to Wikimedia Commons
- [commons-wikimedia-find-by-hash](https://gitlab.com/vitaly-zdanevich/commons-wikimedia-find-by-hash) —
  CLI tool that finds a Wikimedia Commons file with the same SHA-1 as a local file
- [webextension_find_by_hash](https://gitlab.com/vitaly_zdanevich_wikimedia/webextension_find_by_hash) —
  browser extension for finding Wikimedia Commons files by hash
- [video-to-webm-av1-opus](https://gitlab.com/vitaly-zdanevich/video-to-webm-av1-opus) —
  file-manager script that converts video to Commons-compatible AV1/Opus WebM
