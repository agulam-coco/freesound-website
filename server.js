// Production server (Reclaim Cloud or any Node host).
//
// SEO-relevant behavior:
//   - Known pages (src/seo.js) get their own prerendered HTML with a 200.
//   - Unknown URLs get a real 404 status (the old version returned 200 + the
//     home page for everything, which Google flags as "soft 404" / duplicate content).
//   - /about/ and /about.html 301 to /about so each page has exactly one URL.
//   - Old WordPress URLs 301 to their new equivalents (legacyRedirects in src/seo.js).
//   - Optional: CANONICAL_REDIRECT=1 makes any other hostname (old domain, the raw
//     Reclaim URL, www vs non-www) 301 to SITE_URL. Only turn this on once the
//     canonical domain actually points here.

import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { SITE_URL, legacyRedirects } from "./src/seo.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(__dirname, "dist");
const PORT = process.env.PORT || 8080;
const HOST = "0.0.0.0";
const CANONICAL_HOST = new URL(SITE_URL).host;

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", true);

// 1. Send every hostname to the one canonical domain (opt-in)
if (process.env.CANONICAL_REDIRECT === "1") {
  app.use((req, res, next) => {
    const host = (req.headers["x-forwarded-host"] || req.headers.host || "").split(",")[0].trim();
    if (host && host !== CANONICAL_HOST) {
      return res.redirect(301, `${SITE_URL}${req.originalUrl}`);
    }
    next();
  });
}

// 2. URL cleanup: one URL per page
app.use((req, res, next) => {
  if (req.method !== "GET" && req.method !== "HEAD") return next();
  const [pathname, query = ""] = req.originalUrl.split("?");
  const qs = query ? `?${query}` : "";

  if (pathname === "/index.html" || pathname === "/index") return res.redirect(301, `/${qs}`);
  if (pathname === "/404" || pathname === "/404.html") return next("route");

  // /about.html -> /about
  if (pathname.endsWith(".html") && !/^\/google[0-9a-f]+\.html$/.test(pathname)) return res.redirect(301, `${pathname.slice(0, -5)}${qs}`);
  
  // /about/ -> /about
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return res.redirect(301, `${pathname.replace(/\/+$/, "")}${qs}`);
  }

  // Old WordPress paths
  const target = legacyRedirects[pathname.toLowerCase()];
  if (target) return res.redirect(301, target);

  next();
});

// 3. Static files. Vite's hashed bundles can be cached forever; everything else for a day.
app.use(
  express.static(DIST_DIR, {
    extensions: ["html"], // /about -> about.html
    index: "index.html",
    setHeaders(res, filePath) {
      if (/-[A-Za-z0-9_-]{8,}\.(js|css)$/.test(filePath)) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      } else if (filePath.endsWith(".html")) {
        res.setHeader("Cache-Control", "no-cache");
      } else {
        res.setHeader("Cache-Control", "public, max-age=86400");
      }
    }
  })
);

// 4. Everything else is a real 404 (React still renders the "Page not found" screen)
app.use((req, res) => {
  res.status(404).sendFile(path.join(DIST_DIR, "404.html"));
});

app.listen(PORT, HOST, () => {
  console.log(`FreeSound server listening on http://${HOST}:${PORT}`);
});
