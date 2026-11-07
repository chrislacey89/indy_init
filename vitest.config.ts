import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Tests run in plain Node, without the Cloudflare Vite plugin the app build uses.
export default defineConfig({
	resolve: {
		alias: { "#": fileURLToPath(new URL("./src", import.meta.url)) },
	},
	test: {
		environment: "node",
		include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
	},
});
