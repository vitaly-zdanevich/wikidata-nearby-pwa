import { describe, expect, it, vi } from 'vitest';
import {
	commonsFileUrl,
	fetchIncomingLinks,
	formatterUrl,
	userLanguage,
	wikidataEntityUrl,
} from './wikidata';

describe('Wikidata helpers', () => {
	it('selects a safe base language', () => {
		expect(userLanguage(['ka-GE', 'en'])).toBe('ka');
		expect(userLanguage(['not_valid'])).toBe('en');
	});

	it('creates HTTPS Commons file URLs and thumbnails', () => {
		expect(commonsFileUrl('Example image.jpg', 720)).toBe(
			'https://commons.wikimedia.org/wiki/Special:FilePath/Example%20image.jpg?width=720',
		);
		expect(commonsFileUrl('http://commons.wikimedia.org/wiki/Special:FilePath/A.ogg')).toBe(
			'https://commons.wikimedia.org/wiki/Special:FilePath/A.ogg',
		);
	});

	it('links entities and formatter-backed identifiers', () => {
		expect(wikidataEntityUrl('Q42')).toBe('https://www.wikidata.org/wiki/Q42');
		expect(wikidataEntityUrl('P31')).toBe('https://www.wikidata.org/wiki/Property:P31');
		expect(formatterUrl('https://example.test/id/$1', 'A B')).toBe(
			'https://example.test/id/A%20B',
		);
		expect(formatterUrl(undefined, '42')).toBeUndefined();
	});

	it('loads incoming statement links with their linking properties', async () => {
		const response = (body: unknown): Response => ({
			ok: true,
			json: () => Promise.resolve(body),
		}) as Response;
		const fetchMock = vi.fn()
			.mockResolvedValueOnce(response({
				results: {
					bindings: [
						{
							item: { type: 'uri', value: 'http://www.wikidata.org/entity/Q1' },
							properties: {
								type: 'literal',
								value: 'http://www.wikidata.org/entity/P31|http://www.wikidata.org/entity/P17',
							},
						},
						{
							item: { type: 'uri', value: 'http://www.wikidata.org/entity/Q2' },
							properties: { type: 'literal', value: 'http://www.wikidata.org/entity/P361' },
						},
						{
							item: { type: 'uri', value: 'http://www.wikidata.org/entity/Q3' },
							properties: { type: 'literal', value: 'http://www.wikidata.org/entity/P276' },
						},
					],
				},
			}))
			.mockResolvedValueOnce(response({
				entities: {
					Q1: { id: 'Q1', labels: { en: { language: 'en', value: 'Universe' } } },
					Q2: { id: 'Q2', labels: { en: { language: 'en', value: 'Earth' } } },
					P31: { id: 'P31', labels: { en: { language: 'en', value: 'instance of' } } },
					P17: { id: 'P17', labels: { en: { language: 'en', value: 'country' } } },
					P361: { id: 'P361', labels: { en: { language: 'en', value: 'part of' } } },
				},
			}));
		vi.stubGlobal('fetch', fetchMock);

		try {
			const page = await fetchIncomingLinks('Q42', 'en', undefined, { limit: 2 });
			expect(page).toEqual({
				links: [
					{
						id: 'Q1',
						label: 'Universe',
						properties: [
							{ id: 'P31', label: 'instance of' },
							{ id: 'P17', label: 'country' },
						],
					},
					{
						id: 'Q2',
						label: 'Earth',
						properties: [{ id: 'P361', label: 'part of' }],
					},
				],
				hasMore: true,
				nextOffset: 2,
			});
			const queryUrl = fetchMock.mock.calls[0]?.[0] as URL;
			expect(queryUrl.searchParams.get('query')).toContain('wd:Q42');
			expect(queryUrl.searchParams.get('query')).toContain('LIMIT 3');
		} finally {
			vi.unstubAllGlobals();
		}
	});
});
