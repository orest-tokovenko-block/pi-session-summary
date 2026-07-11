import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

// Regression guard for the Pi 0.80.5 compatibility break: `complete` was moved
// out of the "@earendil-works/pi-ai" package root into its "/compat"
// entrypoint. Importing it from the bare package resolves to `undefined`, so the
// summary call threw before any model request started -- leaving zero LLM calls
// and no generated session name.

test("index.ts imports `complete` from the pi-ai compat entrypoint", () => {
	const source = readFileSync(join(here, "index.ts"), "utf-8");

	assert.match(
		source,
		/import\s*\{[^}]*\bcomplete\b[^}]*\}\s*from\s*["']@earendil-works\/pi-ai\/compat["']/,
		"`complete` must be imported from '@earendil-works/pi-ai/compat'",
	);
	assert.doesNotMatch(
		source,
		/from\s*["']@earendil-works\/pi-ai["']/,
		"`complete` must not be imported from the bare '@earendil-works/pi-ai' entrypoint (it is undefined there on Pi 0.80.5)",
	);
});

test("the pi-ai compat entrypoint exposes a callable `complete`", async (t) => {
	let compat: Record<string, unknown>;
	let root: Record<string, unknown>;
	try {
		compat = await import("@earendil-works/pi-ai/compat");
		root = await import("@earendil-works/pi-ai");
	} catch (err) {
		// peerDependency not installed (node_modules is gitignored) -- the source
		// guard above still covers the regression.
		t.skip(`@earendil-works/pi-ai not installed: ${(err as Error).message}`);
		return;
	}

	assert.equal(
		typeof compat.complete,
		"function",
		"`complete` must be a function on the compat entrypoint",
	);
	assert.equal(
		typeof root.complete,
		"undefined",
		"`complete` is not exported from the package root on Pi 0.80.5 (this is the regression being guarded)",
	);
});
