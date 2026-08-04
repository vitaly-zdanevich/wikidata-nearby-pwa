import { describe, expect, it } from 'vitest';
import { commonsFileUrl, formatterUrl, userLanguage, wikidataEntityUrl } from './wikidata';

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
});
