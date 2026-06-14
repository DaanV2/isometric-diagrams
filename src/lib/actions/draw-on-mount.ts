import type { Action } from 'svelte/action';

/**
 * Svelte action that animates an SVG path "drawing" itself.
 *
 * Sets `stroke-dasharray` / `stroke-dashoffset` to the path's true rendered
 * length (via `getTotalLength()`) so the CSS draw animation completes for
 * paths of any length — instead of relying on a hardcoded dash value that
 * breaks for paths longer than that cap.
 *
 * Pass the path data string as the action argument; the animation re-runs
 * whenever that argument changes (e.g. when an endpoint moves), and is left
 * untouched on reactive updates that don't change the geometry.
 */
export const drawOnMount: Action<SVGPathElement, string | undefined> = (node) => {
	function apply() {
		const len = node.getTotalLength();
		node.style.strokeDasharray = String(len);
		node.style.strokeDashoffset = String(len);
		// Restart the CSS animation after updating the dash values.
		node.style.animation = 'none';
		void node.getBoundingClientRect(); // force reflow
		node.style.animation = '';
	}
	apply();
	return { update: apply };
};
