#!/usr/bin/env node
// This file is the compiled entry point for the CLI.
// Run `npm run build` in the cli/ directory to generate this from src/index.ts
import('../dist/index.js').catch((err) => {
  process.stderr.write(`Fatal: ${err.message}\n`);
  process.exit(1);
});
