import { describe, it, expect } from 'vitest';
import { encodeShare, decodeShare } from '../share.js';

describe('share encoding', () => {
	it('round-trips plain ASCII text', () => {
		const text = 'title: Hello\nnodes: []';
		expect(decodeShare(encodeShare(text))).toBe(text);
	});

	it('round-trips multi-byte UTF-8 (emoji, accents)', () => {
		const text = 'label: "Café ☁️ 🚚 — déjà vu"';
		expect(decodeShare(encodeShare(text))).toBe(text);
	});

	it('produces a URL-safe string (no +, /, or = padding)', () => {
		// Inputs chosen so standard base64 would contain + and /.
		const encoded = encodeShare('\xff\xff\xfe\xff\xff');
		expect(encoded).not.toMatch(/[+/=]/);
	});

	it('round-trips a realistic multi-line YAML document', () => {
		const yaml = [
			'title: "Multi-Region"',
			'nodes:',
			'  - id: a',
			'    label: "A"',
			'    position: { x: 0, y: 0 }'
		].join('\n');
		expect(decodeShare(encodeShare(yaml))).toBe(yaml);
	});

	it('handles the empty string', () => {
		expect(decodeShare(encodeShare(''))).toBe('');
	});
});
