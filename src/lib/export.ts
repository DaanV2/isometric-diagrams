/**
 * Export a live isometric diagram <svg> to a standalone SVG or PNG file.
 *
 * The on-screen SVG relies on scoped component CSS and CSS custom properties,
 * neither of which survive serialization. To produce a faithful, self-contained
 * file we clone the SVG, copy each element's *computed* style inline, frame the
 * clone to the content bounds, paint a background, and serialize that.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Bounds of the diagram content in SVG user (world) space. */
export interface ContentBounds {
	minX: number;
	minY: number;
	width: number;
	height: number;
}

export interface ExportOptions {
	/** Background colour painted behind the diagram (e.g. theme background). */
	background?: string;
	/** Padding in px around the content. Default 32. */
	padding?: number;
	/** Raster scale for PNG output. Default 2 (retina). */
	scale?: number;
	/** Download filename without extension. Default "diagram". */
	filename?: string;
}

/** Visual style properties worth copying inline so the export looks identical. */
const INLINE_PROPS = [
	'fill',
	'fill-opacity',
	'stroke',
	'stroke-width',
	'stroke-opacity',
	'stroke-dasharray',
	'stroke-linejoin',
	'stroke-linecap',
	'opacity',
	'paint-order',
	'font-family',
	'font-size',
	'font-weight',
	'font-style',
	'text-anchor',
	'dominant-baseline'
];

function inlineComputedStyles(source: SVGSVGElement, clone: SVGSVGElement): void {
	const src = source.querySelectorAll<SVGElement>('*');
	const dst = clone.querySelectorAll<SVGElement>('*');
	for (let i = 0; i < src.length; i++) {
		const cs = getComputedStyle(src[i]);
		const target = dst[i];
		if (!target) continue;
		const parts: string[] = [];
		const existing = target.getAttribute('style');
		if (existing) parts.push(existing);
		for (const prop of INLINE_PROPS) {
			const value = cs.getPropertyValue(prop);
			if (value) parts.push(`${prop}:${value}`);
		}
		// Freeze any in-progress draw animation so lines export fully drawn.
		parts.push('stroke-dashoffset:0');
		target.setAttribute('style', parts.join(';'));
	}
}

/** Build a framed, self-contained SVG string from a live diagram <svg>. */
export function serializeSvg(
	svg: SVGSVGElement,
	bounds: ContentBounds,
	opts: ExportOptions = {}
): string {
	const pad = opts.padding ?? 32;
	const x = bounds.minX - pad;
	const y = bounds.minY - pad;
	const w = Math.max(1, bounds.width + pad * 2);
	const h = Math.max(1, bounds.height + pad * 2);

	const clone = svg.cloneNode(true) as SVGSVGElement;
	inlineComputedStyles(svg, clone);

	clone.setAttribute('xmlns', SVG_NS);
	clone.setAttribute('width', String(w));
	clone.setAttribute('height', String(h));
	clone.setAttribute('viewBox', `${x} ${y} ${w} ${h}`);
	clone.setAttribute('preserveAspectRatio', 'xMidYMid meet');

	if (opts.background) {
		const rect = document.createElementNS(SVG_NS, 'rect');
		rect.setAttribute('x', String(x));
		rect.setAttribute('y', String(y));
		rect.setAttribute('width', String(w));
		rect.setAttribute('height', String(h));
		rect.setAttribute('fill', opts.background);
		clone.insertBefore(rect, clone.firstChild);
	}

	return new XMLSerializer().serializeToString(clone);
}

function triggerDownload(blob: Blob, filename: string): void {
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	a.remove();
	// Revoke on the next tick so the download has started.
	setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Download the diagram as a standalone .svg file. */
export function downloadSvg(svg: SVGSVGElement, bounds: ContentBounds, opts: ExportOptions = {}): void {
	const svgStr = serializeSvg(svg, bounds, opts);
	triggerDownload(new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' }), `${opts.filename ?? 'diagram'}.svg`);
}

/** Render the diagram to a raster PNG and download it. */
export async function downloadPng(
	svg: SVGSVGElement,
	bounds: ContentBounds,
	opts: ExportOptions = {}
): Promise<void> {
	const pad = opts.padding ?? 32;
	const scale = opts.scale ?? 2;
	const w = Math.max(1, bounds.width + pad * 2);
	const h = Math.max(1, bounds.height + pad * 2);
	const svgStr = serializeSvg(svg, bounds, opts);
	const svgUrl = URL.createObjectURL(new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' }));

	try {
		const img = await loadImage(svgUrl);
		const canvas = document.createElement('canvas');
		canvas.width = Math.round(w * scale);
		canvas.height = Math.round(h * scale);
		const ctx = canvas.getContext('2d');
		if (!ctx) throw new Error('Could not get 2D canvas context');
		ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
		const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
		if (!blob) throw new Error('Could not encode PNG');
		triggerDownload(blob, `${opts.filename ?? 'diagram'}.png`);
	} finally {
		URL.revokeObjectURL(svgUrl);
	}
}

function loadImage(src: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = () => reject(new Error('Failed to render SVG to image'));
		img.src = src;
	});
}

/** Slugify a diagram title into a safe filename stem. */
export function filenameFromTitle(title: string): string {
	const slug = title
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
	return slug || 'diagram';
}
