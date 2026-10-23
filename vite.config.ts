// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import type { IncomingMessage, ServerResponse } from "node:http";
import fs from "node:fs";
import path from "node:path";
import type { Plugin, ViteDevServer, PreviewServer } from "vite";

function moviePostersPlugin(): Plugin {
  const postersDir = path.resolve(process.cwd(), "movie_posters");
  const servePoster = (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const rawUrl = req.url ? req.url.split("?")[0] : "";
    if (rawUrl.startsWith("/posters/")) {
      const filename = decodeURIComponent(rawUrl.slice("/posters/".length));
      const safeFilename = path.basename(filename);
      const filePath = path.join(postersDir, safeFilename);
      if (fs.existsSync(filePath)) {
        res.setHeader("Content-Type", "image/jpeg");
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        return fs.createReadStream(filePath).pipe(res);
      } else {
        res.statusCode = 404;
        return res.end("Poster not found");
      }
    }
    next();
  };

  return {
    name: "movie-posters-plugin",
    configureServer(server: ViteDevServer) {
      server.middlewares.use(servePoster);
    },
    configurePreviewServer(server: PreviewServer) {
      server.middlewares.use(servePoster);
    },
  };
}

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [moviePostersPlugin()],
  },
});
