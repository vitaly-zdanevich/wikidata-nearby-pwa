import { parseWktPoint, type Coordinates } from './geo';

const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';
const API_ENDPOINT = 'https://www.wikidata.org/w/api.php';
const ENTITY_BASE = 'https://www.wikidata.org/wiki/';
const COMMONS_FILE_BASE = 'https://commons.wikimedia.org/wiki/Special:FilePath/';
const COMMONS_API_ENDPOINT = 'https://commons.wikimedia.org/w/api.php';
const AUDIO_PROPERTIES = ['P51', 'P443', 'P989', 'P990'] as const;
const BATCH_SIZE = 50;

interface SparqlValue {
	type: string;
	value: string;
}

interface SparqlResponse {
	results: {
		bindings: Array<Record<string, SparqlValue>>;
	};
}

export interface Snak {
	snaktype: 'value' | 'somevalue' | 'novalue';
	property: string;
	datatype?: string;
	datavalue?: {
		type: string;
		value: unknown;
	};
}

export interface Statement {
	mainsnak: Snak;
	rank: 'preferred' | 'normal' | 'deprecated';
	qualifiers?: Record<string, Snak[]>;
}

interface LocalizedText {
	language: string;
	value: string;
}

interface Sitelink {
	title: string;
	url?: string;
}

export interface Entity {
	id: string;
	labels?: Record<string, LocalizedText>;
	descriptions?: Record<string, LocalizedText>;
	claims?: Record<string, Statement[]>;
	sitelinks?: Record<string, Sitelink>;
	missing?: string;
}

interface EntityResponse {
	entities: Record<string, Entity>;
}

interface CommonsDerivative {
	src: string;
	type?: string;
}

interface CommonsPage {
	title: string;
	videoinfo?: Array<{ derivatives?: CommonsDerivative[] }>;
}

interface CommonsResponse {
	query?: { pages?: CommonsPage[] };
}

export interface AudioSource {
	url: string;
	type?: string;
}

export interface AudioTrack {
	original: string;
	sources: AudioSource[];
}

export interface NearbyItem {
	id: string;
	label: string;
	description?: string;
	location: Coordinates;
	distanceKm: number;
	image?: string;
	audio: AudioTrack[];
	wikipedia?: { title: string; url: string; language: string };
}

export interface EntityGloss {
	id: string;
	label: string;
	formatterUrl?: string;
}

export interface PropertyDetails {
	entity: Entity;
	glossary: Map<string, EntityGloss>;
}

export interface IncomingLink {
	id: string;
	label: string;
	properties: EntityGloss[];
}

export interface IncomingLinksPage {
	links: IncomingLink[];
	hasMore: boolean;
	nextOffset: number;
}

function chunks<T>(values: T[], size: number): T[][] {
	const result: T[][] = [];
	for (let index = 0; index < values.length; index += size) {
		result.push(values.slice(index, index + size));
	}
	return result;
}

export function userLanguage(languages: readonly string[] = navigator.languages): string {
	for (const candidate of languages) {
		const language = candidate.toLowerCase().split('-')[0];
		if (language && /^[a-z]{2,12}$/.test(language)) return language;
	}
	return 'en';
}

function localizedValue(
	values: Record<string, LocalizedText> | undefined,
	language: string,
): string | undefined {
	return values?.[language]?.value ?? values?.en?.value ?? Object.values(values ?? {})[0]?.value;
}

function entityId(uri: string): string | undefined {
	return /\/(Q\d+)$/.exec(uri)?.[1];
}

function propertyId(uri: string): string | undefined {
	return /\/(P\d+)$/.exec(uri)?.[1];
}

export function commonsFileUrl(filenameOrUrl: string, width?: number): string {
	let url: URL;
	try {
		url = new URL(filenameOrUrl);
		url.protocol = 'https:';
	} catch {
		url = new URL(encodeURIComponent(filenameOrUrl.replace(/^File:/i, '')), COMMONS_FILE_BASE);
	}
	if (width) url.searchParams.set('width', String(width));
	return url.toString();
}

function commonsFileName(fileUrl: string): string | undefined {
	try {
		const pathname = new URL(fileUrl).pathname;
		const marker = '/wiki/Special:FilePath/';
		const markerIndex = pathname.indexOf(marker);
		if (markerIndex < 0) return undefined;
		return decodeURIComponent(pathname.slice(markerIndex + marker.length)).replace(/^File:/i, '');
	} catch {
		return undefined;
	}
}

const normalizedFileName = (value: string): string => value.replace(/_/g, ' ').normalize();

async function fetchAudioTracks(originals: string[], signal?: AbortSignal): Promise<Map<string, AudioTrack>> {
	const fallback = new Map(
		originals.map((original): [string, AudioTrack] => [
			original,
			{ original, sources: [{ url: original }] },
		]),
	);
	const files = originals.flatMap((original) => {
		const filename = commonsFileName(original);
		return filename ? [{ filename, original }] : [];
	});
	if (files.length === 0) return fallback;

	const url = new URL(COMMONS_API_ENDPOINT);
	url.searchParams.set('action', 'query');
	url.searchParams.set('format', 'json');
	url.searchParams.set('formatversion', '2');
	url.searchParams.set('origin', '*');
	url.searchParams.set('prop', 'videoinfo');
	url.searchParams.set('viprop', 'derivatives');
	url.searchParams.set('titles', files.map(({ filename }) => `File:${filename}`).join('|'));
	const response = await jsonRequest<CommonsResponse>(url, signal);
	const derivativesByName = new Map<string, CommonsDerivative[]>();
	for (const page of response.query?.pages ?? []) {
		const name = page.title.replace(/^File:/i, '');
		derivativesByName.set(normalizedFileName(name), page.videoinfo?.[0]?.derivatives ?? []);
	}

	for (const { filename, original } of files) {
		const derivatives = derivativesByName.get(normalizedFileName(filename)) ?? [];
		const sources = derivatives.flatMap((derivative): AudioSource[] => {
			if (derivative.type && !derivative.type.startsWith('audio/')) return [];
			const sourceUrl = safeWebUrl(derivative.src);
			return sourceUrl ? [{ url: sourceUrl, type: derivative.type }] : [];
		});
		if (sources.length > 0) fallback.set(original, { original, sources });
	}
	return fallback;
}

function safeWebUrl(value: string): string | undefined {
	try {
		const url = new URL(value, 'https://commons.wikimedia.org');
		if (url.protocol !== 'https:' && url.protocol !== 'http:') return undefined;
		url.protocol = 'https:';
		return url.toString();
	} catch {
		return undefined;
	}
}

function buildNearbyQuery(position: Coordinates, radiusKm: number, limit: number): string {
	const { longitude, latitude } = position;
	return `
SELECT ?item (SAMPLE(?locationValue) AS ?location) (MIN(?distanceValue) AS ?distance)
       (SAMPLE(?imageValue) AS ?image)
       (GROUP_CONCAT(DISTINCT STR(?audioValue); separator="|") AS ?audios)
WHERE {
  {
    SELECT ?item ?locationValue ?distanceValue WHERE {
      SERVICE wikibase:around {
        ?item wdt:P625 ?locationValue .
        bd:serviceParam wikibase:center "Point(${longitude} ${latitude})"^^geo:wktLiteral .
        bd:serviceParam wikibase:radius "${radiusKm}" .
        bd:serviceParam wikibase:distance ?distanceValue .
      }
    }
    ORDER BY ?distanceValue
    LIMIT ${limit}
  }
  OPTIONAL { ?item wdt:P18 ?imageValue . }
  OPTIONAL { ?item (wdt:P51|wdt:P443|wdt:P989|wdt:P990) ?audioValue . }
}
GROUP BY ?item
ORDER BY ?distance
LIMIT ${limit}`;
}

function buildIncomingLinksQuery(id: string, offset: number, limit: number): string {
	if (!/^Q\d+$/.test(id)) throw new Error(`Invalid Wikidata item ID: ${id}`);
	return `
SELECT ?item (GROUP_CONCAT(DISTINCT STR(?property); separator="|") AS ?properties)
WHERE {
  ?item ?predicate wd:${id} .
  ?property wikibase:directClaim ?predicate .
  FILTER(STRSTARTS(STR(?item), "http://www.wikidata.org/entity/Q"))
}
GROUP BY ?item
ORDER BY ?item
LIMIT ${limit}
OFFSET ${offset}`;
}

async function jsonRequest<T>(url: URL, signal?: AbortSignal): Promise<T> {
	const response = await fetch(url, {
		headers: { Accept: 'application/json' },
		signal,
	});
	if (!response.ok) throw new Error(`Knowledge request failed (${response.status})`);
	return (await response.json()) as T;
}

async function fetchEntities(
	ids: string[],
	props: string,
	language: string,
	signal?: AbortSignal,
	siteFilter?: string,
): Promise<Entity[]> {
	const entities: Entity[] = [];
	for (const batch of chunks([...new Set(ids)], BATCH_SIZE)) {
		if (batch.length === 0) continue;
		const url = new URL(API_ENDPOINT);
		url.searchParams.set('action', 'wbgetentities');
		url.searchParams.set('format', 'json');
		url.searchParams.set('formatversion', '2');
		url.searchParams.set('origin', '*');
		url.searchParams.set('ids', batch.join('|'));
		url.searchParams.set('props', props);
		url.searchParams.set('languages', language === 'en' ? 'en' : `${language}|en`);
		url.searchParams.set('languagefallback', '1');
		if (siteFilter) url.searchParams.set('sitefilter', siteFilter);
		const response = await jsonRequest<EntityResponse>(url, signal);
		entities.push(...Object.values(response.entities));
	}
	return entities;
}

export async function findNearbyItems(
	position: Coordinates,
	language: string,
	signal?: AbortSignal,
	options: { radiusKm?: number; limit?: number } = {},
): Promise<NearbyItem[]> {
	const radiusKm = options.radiusKm ?? 100;
	const limit = options.limit ?? 24;
	const endpoint = new URL(SPARQL_ENDPOINT);
	endpoint.searchParams.set('query', buildNearbyQuery(position, radiusKm, limit));
	endpoint.searchParams.set('format', 'json');
	const result = await jsonRequest<SparqlResponse>(endpoint, signal);

	const nearby = result.results.bindings.flatMap((binding) => {
		const id = binding.item ? entityId(binding.item.value) : undefined;
		const location = binding.location ? parseWktPoint(binding.location.value) : undefined;
		const distanceKm = Number(binding.distance?.value);
		if (!id || !location || !Number.isFinite(distanceKm)) return [];
		return [{
			id,
			location,
			distanceKm,
			image: binding.image?.value ? commonsFileUrl(binding.image.value, 720) : undefined,
			audio: (binding.audios?.value ?? '')
				.split('|')
				.filter(Boolean)
				.map((value) => commonsFileUrl(value)),
		}];
	});

	const siteFilter = language === 'en' ? 'enwiki' : `${language}wiki|enwiki`;
	const originalAudio = nearby.flatMap(({ audio }) => audio);
	const [metadata, audioTracks] = await Promise.all([
		fetchEntities(
			nearby.map(({ id }) => id),
			'labels|descriptions|sitelinks/urls',
			language,
			signal,
			siteFilter,
		),
		fetchAudioTracks(originalAudio, signal).catch(() =>
			new Map(
				originalAudio.map((original): [string, AudioTrack] => [
					original,
					{ original, sources: [{ url: original }] },
				]),
			),
		),
	]);
	const byId = new Map(metadata.map((entity) => [entity.id, entity]));

	return nearby.map((item): NearbyItem => {
		const entity = byId.get(item.id);
		const localSitelink = entity?.sitelinks?.[`${language}wiki`];
		const englishSitelink = entity?.sitelinks?.enwiki;
		const sitelink = localSitelink ?? englishSitelink;
		return {
			...item,
			audio: item.audio.map(
				(original) => audioTracks.get(original) ?? { original, sources: [{ url: original }] },
			),
			label: localizedValue(entity?.labels, language) ?? item.id,
			description: localizedValue(entity?.descriptions, language),
			wikipedia: sitelink?.url
				? {
					title: sitelink.title,
					url: sitelink.url,
					language: localSitelink ? language : 'en',
				}
				: undefined,
		};
	});
}

export async function fetchIncomingLinks(
	id: string,
	language: string,
	signal?: AbortSignal,
	options: { offset?: number; limit?: number } = {},
): Promise<IncomingLinksPage> {
	const offset = Math.max(0, Math.trunc(options.offset ?? 0));
	const limit = Math.min(100, Math.max(1, Math.trunc(options.limit ?? 50)));
	const endpoint = new URL(SPARQL_ENDPOINT);
	endpoint.searchParams.set('query', buildIncomingLinksQuery(id, offset, limit + 1));
	endpoint.searchParams.set('format', 'json');
	const result = await jsonRequest<SparqlResponse>(endpoint, signal);
	const hasMore = result.results.bindings.length > limit;
	const bindings = result.results.bindings.slice(0, limit);
	const rows = bindings.flatMap((binding) => {
		const linkedItemId = binding.item ? entityId(binding.item.value) : undefined;
		if (!linkedItemId) return [];
		const propertyIds = (binding.properties?.value ?? '')
			.split('|')
			.map(propertyId)
			.filter((property): property is string => property !== undefined);
		return [{ id: linkedItemId, propertyIds }];
	});
	const ids = rows.flatMap(({ id: linkedItemId, propertyIds }) => [linkedItemId, ...propertyIds]);
	const metadata = await fetchEntities(ids, 'labels', language, signal);
	const byId = new Map(metadata.map((entity) => [entity.id, entity]));

	return {
		links: rows.map(({ id: linkedItemId, propertyIds }): IncomingLink => ({
			id: linkedItemId,
			label: localizedValue(byId.get(linkedItemId)?.labels, language) ?? linkedItemId,
			properties: propertyIds.map((linkedPropertyId) => ({
				id: linkedPropertyId,
				label: localizedValue(byId.get(linkedPropertyId)?.labels, language) ?? linkedPropertyId,
			})),
		})),
		hasMore,
		nextOffset: offset + bindings.length,
	};
}

function linkedEntityIds(snak: Snak): string[] {
	if (snak.datavalue?.type === 'wikibase-entityid') {
		const value = snak.datavalue.value as { id?: unknown };
		return typeof value.id === 'string' ? [value.id] : [];
	}
	if (snak.datavalue?.type === 'quantity' && typeof snak.datavalue.value === 'object') {
		const unit = (snak.datavalue.value as { unit?: unknown }).unit;
		const unitId = typeof unit === 'string' ? /\/(Q\d+)$/.exec(unit)?.[1] : undefined;
		return unitId ? [unitId] : [];
	}
	return [];
}

function formatterFromEntity(entity: Entity): string | undefined {
	const statement = entity.claims?.P1630?.find(
		({ mainsnak }) => mainsnak.datavalue?.type === 'string',
	);
	return typeof statement?.mainsnak.datavalue?.value === 'string'
		? statement.mainsnak.datavalue.value
		: undefined;
}

export async function fetchPropertyDetails(
	id: string,
	language: string,
	signal?: AbortSignal,
): Promise<PropertyDetails> {
	const [entity] = await fetchEntities([id], 'claims', language, signal);
	if (!entity || entity.missing !== undefined) throw new Error(`Wikidata item ${id} was not found`);

	const propertyIds = new Set<string>();
	const valueIds = new Set<string>();
	for (const [propertyId, statements] of Object.entries(entity.claims ?? {})) {
		propertyIds.add(propertyId);
		for (const statement of statements) {
			linkedEntityIds(statement.mainsnak).forEach((valueId) => valueIds.add(valueId));
			for (const [qualifierId, snaks] of Object.entries(statement.qualifiers ?? {})) {
				propertyIds.add(qualifierId);
				snaks.flatMap(linkedEntityIds).forEach((valueId) => valueIds.add(valueId));
			}
		}
	}

	const [properties, values] = await Promise.all([
		fetchEntities([...propertyIds], 'labels|claims', language, signal),
		fetchEntities([...valueIds], 'labels', language, signal),
	]);
	const glossary = new Map<string, EntityGloss>();
	for (const property of properties) {
		glossary.set(property.id, {
			id: property.id,
			label: localizedValue(property.labels, language) ?? property.id,
			formatterUrl: formatterFromEntity(property),
		});
	}
	for (const value of values) {
		glossary.set(value.id, {
			id: value.id,
			label: localizedValue(value.labels, language) ?? value.id,
		});
	}
	return { entity, glossary };
}

export function wikidataEntityUrl(id: string): string {
	const title = /^P\d+$/.test(id) ? `Property:${id}` : id;
	return `${ENTITY_BASE}${encodeURIComponent(title).replace('%3A', ':')}`;
}

export function formatterUrl(template: string | undefined, value: string): string | undefined {
	if (!template?.includes('$1')) return undefined;
	try {
		return new URL(template.replaceAll('$1', encodeURIComponent(value))).toString();
	} catch {
		return undefined;
	}
}

export function isAudioProperty(propertyId: string): boolean {
	return (AUDIO_PROPERTIES as readonly string[]).includes(propertyId);
}
