import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
	},
	kit: {
		adapter: adapter({
			// GitHub Pages serves from root or /repo-name depending on the repo setting.
			// Fallback page allows client-side routing.
			fallback: '404.html'
		}),
		// Required for GitHub Pages deployment under a sub-path.
		// Set to '' for root deployment (custom domain) or '/repo-name' for <user>.github.io/repo-name.
		paths: {
			base: process.env.BASE_PATH ?? ''
		}
	}
};

export default config;
