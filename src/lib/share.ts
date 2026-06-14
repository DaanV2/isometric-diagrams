/**
 * URL-safe encoding for sharing a diagram spec via a permalink.
 *
 * The raw YAML text is UTF-8 encoded and base64url-encoded so it can live in a
 * URL hash without escaping. Kept tiny and dependency-free; decode is the exact
 * inverse of encode.
 */

const toBytes = (text: string): Uint8Array => new TextEncoder().encode(text);
const fromBytes = (bytes: Uint8Array): string => new TextDecoder().decode(bytes);

function bytesToBinary(bytes: Uint8Array): string {
	let bin = '';
	for (const b of bytes) bin += String.fromCharCode(b);
	return bin;
}

/** Encode arbitrary UTF-8 text to a base64url string (no padding). */
export function encodeShare(text: string): string {
	return btoa(bytesToBinary(toBytes(text)))
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');
}

/** Decode a base64url string produced by {@link encodeShare} back to text. */
export function decodeShare(encoded: string): string {
	const b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
	const bin = atob(b64);
	const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
	return fromBytes(bytes);
}
