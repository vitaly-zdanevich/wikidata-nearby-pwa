import './style.css';
import { bearingBetween, cardinalDirection, formatDistance, type Coordinates } from './geo';
import {
	commonsFileUrl,
	fetchIncomingLinks,
	fetchPropertyDetails,
	findNearbyItems,
	formatterUrl,
	type EntityGloss,
	type IncomingLink,
	type PropertyDetails,
	type Snak,
	type Statement,
	type NearbyItem,
	userLanguage,
	wikidataEntityUrl,
} from './wikidata';

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('Application root is missing');

const language = userLanguage();
const locale = navigator.language || language;
let currentPosition: Coordinates | undefined;
let nearbyController: AbortController | undefined;

function make<K extends keyof HTMLElementTagNameMap>(
	tag: K,
	className?: string,
	text?: string,
): HTMLElementTagNameMap[K] {
	const node = document.createElement(tag);
	if (className) node.className = className;
	if (text !== undefined) node.textContent = text;
	return node;
}

function externalLink(url: string, label: string, className?: string): HTMLAnchorElement {
	const anchor = make('a', className, label);
	anchor.href = url;
	anchor.target = '_blank';
	anchor.rel = 'noopener noreferrer';
	anchor.addEventListener('click', (event) => event.stopPropagation());
	return anchor;
}

function safeHttpUrl(value: string): string | undefined {
	try {
		const url = new URL(value);
		return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : undefined;
	} catch {
		return undefined;
	}
}

root.replaceChildren();
const shell = make('main', 'shell');
const header = make('header', 'hero');
const brand = make('div', 'brand');
const brandIcon = make('img', 'brand-icon');
brandIcon.src = `${import.meta.env.BASE_URL}icon.svg`;
brandIcon.alt = '';
const brandCopy = make('div');
brandCopy.append(make('p', 'eyebrow', 'WIKIDATA · AROUND YOU'));
brandCopy.append(make('h1', undefined, 'Nearby knowledge'));
brand.append(brandIcon, brandCopy);

const locateButton = make('button', 'locate-button');
locateButton.type = 'button';
locateButton.setAttribute('aria-label', 'Refresh current location');
locateButton.title = 'Refresh current location';
locateButton.append(make('span', 'locate-symbol', '⌖'));
header.append(brand, locateButton);

const intro = make(
	'p',
	'intro',
	'Places, landmarks, events, and other geotagged items—ordered by how close they are.',
);
const status = make('section', 'status');
status.setAttribute('aria-live', 'polite');
const results = make('section', 'results');
const footer = make('footer', 'footer');
const queryLink = externalLink('https://www.wikidata.org/', 'Powered by Wikidata');
const sourceLink = externalLink(
	'https://github.com/vitaly-zdanevich/wikidata-nearby-pwa',
	'Source',
);
footer.append(queryLink, document.createTextNode(' · '), sourceLink, document.createTextNode(` · v${__APP_VERSION__}`));
shell.append(header, intro, status, results, footer);
root.append(shell);

function showStatus(kind: 'loading' | 'error' | 'empty', message: string): void {
	status.hidden = false;
	status.className = `status ${kind}`;
	status.replaceChildren();
	if (kind === 'loading') status.append(make('span', 'spinner'));
	const copy = make('div');
	copy.append(make('strong', undefined, kind === 'error' ? 'Could not load nearby items' : message));
	if (kind === 'error') copy.append(make('p', undefined, message));
	status.append(copy);
	if (kind !== 'loading') {
		const retry = make('button', 'retry-button', 'Try again');
		retry.type = 'button';
		retry.addEventListener('click', () => requestLocation());
		status.append(retry);
	}
}

function propertyLabel(propertyId: string, glossary: Map<string, EntityGloss>): string {
	return glossary.get(propertyId)?.label ?? propertyId;
}

function appendTextWithUnit(
	container: HTMLElement,
	amount: string,
	unit: unknown,
	glossary: Map<string, EntityGloss>,
): void {
	container.append(document.createTextNode(amount));
	if (typeof unit !== 'string' || unit === '1') return;
	const unitId = /\/(Q\d+)$/.exec(unit)?.[1];
	if (!unitId) return;
	container.append(document.createTextNode(' '));
	container.append(externalLink(wikidataEntityUrl(unitId), glossary.get(unitId)?.label ?? unitId));
}

function formatTime(value: unknown): string {
	if (typeof value !== 'object' || value === null) return 'Unknown time';
	const { time, precision } = value as { time?: unknown; precision?: unknown };
	if (typeof time !== 'string') return 'Unknown time';
	const match = /^([+-])(\d+)-(\d{2})-(\d{2})T/.exec(time);
	if (!match?.[1] || !match[2] || !match[3] || !match[4]) return time;
	const year = String(Number(match[2]));
	const era = match[1] === '-' ? ' BCE' : '';
	if (typeof precision === 'number' && precision <= 9) return `${year}${era}`;
	if (precision === 10) return `${year}-${match[3]}${era}`;
	return `${year}-${match[3]}-${match[4]}${era}`;
}

function coordinateLink(value: unknown): Node {
	if (typeof value !== 'object' || value === null) return document.createTextNode('Unknown location');
	const { latitude, longitude } = value as { latitude?: unknown; longitude?: unknown };
	if (typeof latitude !== 'number' || typeof longitude !== 'number') {
		return document.createTextNode('Unknown location');
	}
	const lat = Math.abs(latitude).toFixed(6);
	const lon = Math.abs(longitude).toFixed(6);
	const params = `${lat}_${latitude < 0 ? 'S' : 'N'}_${lon}_${longitude < 0 ? 'W' : 'E'}`;
	return externalLink(
		`https://geohack.toolforge.org/geohack.php?params=${encodeURIComponent(params)}`,
		`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
	);
}

function renderSnak(
	snak: Snak,
	propertyId: string,
	glossary: Map<string, EntityGloss>,
): Node {
	if (snak.snaktype === 'novalue') return make('span', 'special-value', 'no value');
	if (snak.snaktype === 'somevalue') return make('span', 'special-value', 'unknown value');
	const data = snak.datavalue;
	if (!data) return document.createTextNode('—');

	if (data.type === 'wikibase-entityid' && typeof data.value === 'object' && data.value !== null) {
		const id = (data.value as { id?: unknown }).id;
		if (typeof id === 'string') {
			return externalLink(wikidataEntityUrl(id), glossary.get(id)?.label ?? id, 'value-link');
		}
	}

	if (snak.datatype === 'commonsMedia' && typeof data.value === 'string') {
		return externalLink(commonsFileUrl(data.value), data.value, 'value-link');
	}
	if ((snak.datatype === 'geo-shape' || snak.datatype === 'tabular-data') && typeof data.value === 'string') {
		return externalLink(
			`https://commons.wikimedia.org/wiki/${encodeURIComponent(`Data:${data.value.replace(/^Data:/i, '')}`)}`,
			data.value,
			'value-link',
		);
	}
	if (snak.datatype === 'url' && typeof data.value === 'string') {
		const url = safeHttpUrl(data.value);
		return url ? externalLink(url, data.value, 'value-link') : document.createTextNode(data.value);
	}
	if (snak.datatype === 'external-id' && typeof data.value === 'string') {
		const url = formatterUrl(glossary.get(propertyId)?.formatterUrl, data.value);
		return url ? externalLink(url, data.value, 'value-link') : document.createTextNode(data.value);
	}
	if (data.type === 'globecoordinate') return coordinateLink(data.value);
	if (data.type === 'time') return document.createTextNode(formatTime(data.value));
	if (data.type === 'quantity' && typeof data.value === 'object' && data.value !== null) {
		const { amount, unit } = data.value as { amount?: unknown; unit?: unknown };
		const value = make('span');
		appendTextWithUnit(value, typeof amount === 'string' ? amount.replace(/^\+/, '') : '—', unit, glossary);
		return value;
	}
	if (data.type === 'monolingualtext' && typeof data.value === 'object' && data.value !== null) {
		const { text, language: textLanguage } = data.value as { text?: unknown; language?: unknown };
		const value = make('span');
		value.append(document.createTextNode(typeof text === 'string' ? text : '—'));
		if (typeof textLanguage === 'string') value.append(make('small', 'language-tag', textLanguage));
		return value;
	}
	if (typeof data.value === 'string') return document.createTextNode(data.value);
	return document.createTextNode(JSON.stringify(data.value));
}

function renderStatement(
	statement: Statement,
	propertyId: string,
	glossary: Map<string, EntityGloss>,
): HTMLLIElement {
	const row = make('li', `statement ${statement.rank}`);
	const value = make('div', 'statement-value');
	value.append(renderSnak(statement.mainsnak, propertyId, glossary));
	if (statement.rank !== 'normal') value.append(make('small', 'rank', statement.rank));
	row.append(value);

	const qualifiers = Object.entries(statement.qualifiers ?? {});
	if (qualifiers.length > 0) {
		const qualifierList = make('dl', 'qualifiers');
		for (const [qualifierId, snaks] of qualifiers) {
			const term = make('dt');
			term.append(externalLink(wikidataEntityUrl(`Property:${qualifierId}`), propertyLabel(qualifierId, glossary)));
			const definition = make('dd');
			snaks.forEach((snak, index) => {
				if (index > 0) definition.append(document.createTextNode(' · '));
				definition.append(renderSnak(snak, qualifierId, glossary));
			});
			qualifierList.append(term, definition);
		}
		row.append(qualifierList);
	}
	return row;
}

function renderIncomingLink(link: IncomingLink): HTMLLIElement {
	const row = make('li', 'incoming-item');
	row.append(externalLink(wikidataEntityUrl(link.id), link.label, 'incoming-item-link'));
	if (link.properties.length > 0) {
		const via = make('span', 'incoming-via');
		via.append(document.createTextNode('via '));
		link.properties.forEach((property, index) => {
			if (index > 0) via.append(document.createTextNode(' · '));
			via.append(externalLink(wikidataEntityUrl(property.id), property.label));
		});
		row.append(via);
	}
	return row;
}

function appendIncomingLinks(container: HTMLElement, item: NearbyItem): void {
	const section = make('section', 'incoming-links');
	const output = make('div', 'incoming-output');
	const message = make('p', 'incoming-message');
	message.hidden = true;
	message.setAttribute('aria-live', 'polite');
	const button = make('button', 'incoming-button', 'Links to it');
	button.type = 'button';
	let nextOffset = 0;
	let list: HTMLUListElement | undefined;

	const load = async (): Promise<void> => {
		const loadingMore = nextOffset > 0;
		button.disabled = true;
		button.textContent = loadingMore ? 'Loading more…' : 'Loading links…';
		message.hidden = false;
		message.textContent = loadingMore ? 'Finding more linked items…' : 'Finding items that link here…';
		try {
			const page = await fetchIncomingLinks(item.id, language, undefined, { offset: nextOffset });
			message.hidden = true;
			if (!list) {
				output.replaceChildren(make('h4', 'incoming-heading', 'Links to it'));
				if (page.links.length === 0) {
					output.append(make('p', 'incoming-empty', 'No Wikidata items link to this item.'));
					button.remove();
					return;
				}
				list = make('ul', 'incoming-list');
				output.append(list);
			}
			for (const link of page.links) list.append(renderIncomingLink(link));
			nextOffset = page.nextOffset;
			if (page.hasMore) {
				button.disabled = false;
				button.textContent = 'Load more links';
			} else {
				button.remove();
			}
		} catch (error) {
			message.hidden = false;
			message.textContent = error instanceof Error ? error.message : 'Could not load linked items.';
			button.disabled = false;
			button.textContent = loadingMore ? 'Try loading more again' : 'Try links to it again';
		}
	};

	button.addEventListener('click', () => void load());
	section.append(output, message, button);
	container.append(section);
}

function renderProperties(container: HTMLElement, details: PropertyDetails, item: NearbyItem): void {
	container.replaceChildren();
	const heading = make('div', 'properties-heading');
	heading.append(
		make('h3', undefined, 'All properties'),
		make(
			'span',
			undefined,
			`${Object.values(details.entity.claims ?? {}).reduce((total, claims) => total + claims.length, 0)} statements`,
		),
	);
	container.append(heading);

	const properties = Object.entries(details.entity.claims ?? {}).sort(([left], [right]) =>
		propertyLabel(left, details.glossary).localeCompare(propertyLabel(right, details.glossary), locale),
	);
	if (properties.length === 0) {
		container.append(make('p', 'no-properties', 'This item has no statements.'));
		appendIncomingLinks(container, item);
		return;
	}
	for (const [propertyId, statements] of properties) {
		const group = make('section', 'property-group');
		const property = externalLink(
			wikidataEntityUrl(`Property:${propertyId}`),
			propertyLabel(propertyId, details.glossary),
			'property-name',
		);
		property.append(make('small', undefined, propertyId));
		const list = make('ul', 'statement-list');
		for (const statement of statements) list.append(renderStatement(statement, propertyId, details.glossary));
		group.append(property, list);
		container.append(group);
	}
	appendIncomingLinks(container, item);
}

async function loadProperties(item: NearbyItem, container: HTMLElement): Promise<void> {
	container.dataset.state = 'loading';
	container.replaceChildren();
	const loading = make('div', 'properties-loading');
	loading.append(make('span', 'spinner'), document.createTextNode('Loading all properties…'));
	container.append(loading);
	try {
		const details = await fetchPropertyDetails(item.id, language);
		container.dataset.state = 'ready';
		renderProperties(container, details, item);
	} catch (error) {
		container.dataset.state = 'error';
		const message = error instanceof Error ? error.message : 'Unknown error';
		const errorBox = make('div', 'property-error');
		errorBox.append(make('p', undefined, message));
		const retry = make('button', 'retry-button', 'Retry properties');
		retry.type = 'button';
		retry.addEventListener('click', () => loadProperties(item, container));
		errorBox.append(retry);
		container.replaceChildren(errorBox);
	}
}

function makeCard(item: NearbyItem, index: number): HTMLDetailsElement {
	if (!currentPosition) throw new Error('A position is required to render a direction');
	const card = make('details', 'item-card');
	const summary = make('summary', 'item-summary');
	if (item.image) {
		const visual = make('div', 'item-visual');
		const image = make('img');
		image.src = item.image;
		image.alt = '';
		image.loading = index < 3 ? 'eager' : 'lazy';
		image.decoding = 'async';
		image.addEventListener('error', () => {
			visual.remove();
			summary.classList.add('no-image');
		});
		visual.append(image);
		summary.append(visual);
	} else {
		summary.classList.add('no-image');
	}

	const copy = make('div', 'item-copy');
	const title = make('h2', undefined, item.label);
	const description = make('p', 'description', item.description ?? 'No description yet');
	const bearing = bearingBetween(currentPosition, item.location);
	const measure = make('div', 'measure');
	const direction = make('span', 'direction');
	const arrow = make('span', 'direction-arrow', '↑');
	arrow.style.transform = `rotate(${bearing.toFixed(1)}deg)`;
	direction.append(arrow, document.createTextNode(`${cardinalDirection(bearing)} · ${Math.round(bearing)}°`));
	measure.append(make('strong', undefined, formatDistance(item.distanceKm, locale)), direction);

	const links = make('nav', 'item-links');
	links.setAttribute('aria-label', `Links for ${item.label}`);
	links.append(externalLink(wikidataEntityUrl(item.id), item.id));
	if (item.wikipedia) {
		links.append(externalLink(item.wikipedia.url, `Wikipedia · ${item.wikipedia.language.toUpperCase()}`));
	}
	const mapUrl = new URL('https://www.google.com/maps/search/');
	mapUrl.searchParams.set('api', '1');
	mapUrl.searchParams.set('query', `${item.location.latitude},${item.location.longitude}`);
	links.append(externalLink(mapUrl.toString(), 'Google Maps'));

	copy.append(title, description, measure, links);
	if (item.audio.length > 0) {
		const firstTrack = item.audio[0];
		if (!firstTrack) throw new Error('Audio track is missing');
		const audioArea = make('div', 'audio-area');
		const audio = make('audio');
		audio.controls = true;
		audio.preload = 'none';
		for (const audioSource of firstTrack.sources) {
			const source = make('source');
			source.src = audioSource.url;
			if (audioSource.type) source.type = audioSource.type;
			audio.append(source);
		}
		audio.setAttribute('aria-label', `Audio for ${item.label}`);
		audio.addEventListener('click', (event) => event.stopPropagation());
		audioArea.append(make('span', undefined, 'Audio'), audio);
		const audioLinks = make('small');
		audioLinks.append(externalLink(firstTrack.original, 'Open audio file'));
		if (item.audio.length > 1) {
			audioLinks.append(document.createTextNode(` · +${item.audio.length - 1} more in properties`));
		}
		audioArea.append(audioLinks);
		copy.append(audioArea);
	}
	summary.append(copy);

	const propertyContainer = make('div', 'properties');
	propertyContainer.dataset.state = 'idle';
	card.addEventListener('toggle', () => {
		if (card.open && propertyContainer.dataset.state === 'idle') void loadProperties(item, propertyContainer);
	});
	card.append(summary, propertyContainer);
	return card;
}

function renderItems(items: NearbyItem[], accuracy: number): void {
	status.hidden = true;
	results.replaceChildren();
	const resultHeader = make('div', 'results-header');
	const resultTitle = make('div');
	resultTitle.append(
		make('p', 'eyebrow', 'CLOSEST FIRST'),
		make('h2', undefined, `${items.length} nearby ${items.length === 1 ? 'item' : 'items'}`),
	);
	resultHeader.append(resultTitle, make('span', 'accuracy', `±${Math.round(accuracy)} m`));
	const list = make('div', 'item-list');
	items.forEach((item, index) => list.append(makeCard(item, index)));
	results.append(resultHeader, list);
}

function locationErrorMessage(error: GeolocationPositionError): string {
	if (error.code === error.PERMISSION_DENIED) {
		return 'Location access is off. Allow it in your browser settings, then try again.';
	}
	if (error.code === error.POSITION_UNAVAILABLE) return 'Your device could not determine its current location.';
	if (error.code === error.TIMEOUT) return 'Finding your location took too long.';
	return error.message || 'Your location is unavailable.';
}

function requestLocation(): void {
	if (!('geolocation' in navigator)) {
		showStatus('error', 'This browser does not provide geolocation.');
		return;
	}
	nearbyController?.abort();
	results.replaceChildren();
	locateButton.disabled = true;
	showStatus('loading', 'Finding your location…');
	navigator.geolocation.getCurrentPosition(
		(position) => {
			currentPosition = {
				latitude: position.coords.latitude,
				longitude: position.coords.longitude,
			};
			nearbyController = new AbortController();
			showStatus('loading', 'Looking for nearby knowledge…');
			void findNearbyItems(currentPosition, language, nearbyController.signal)
				.then((items) => {
					if (items.length === 0) {
						showStatus('empty', 'No geotagged Wikidata items were found within 100 km.');
						return;
					}
					renderItems(items, position.coords.accuracy);
				})
				.catch((error: unknown) => {
					if (error instanceof DOMException && error.name === 'AbortError') return;
					showStatus('error', error instanceof Error ? error.message : 'Wikidata is unavailable.');
				})
				.finally(() => {
					locateButton.disabled = false;
				});
		},
		(error) => {
			locateButton.disabled = false;
			showStatus('error', locationErrorMessage(error));
		},
		{ enableHighAccuracy: true, maximumAge: 30_000, timeout: 15_000 },
	);
}

locateButton.addEventListener('click', requestLocation);
requestLocation();
