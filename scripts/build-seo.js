// Runs after `vite build`. Takes dist/index.html and writes one HTML file per
// page with its own <title>, description, canonical, Open Graph tags, and
// (on the home page) structured data. Also writes 404.html, sitemap.xml, robots.txt.
//
// It also takes the prerendered home page from dist-ssr/ (built by
// `vite build --ssr src/entry-server.jsx`) and puts it inside <div id="root">.
//
// Why: the site is a client-rendered SPA, so without this every URL ships the
// exact same <head>. Google mostly copes, but link previews (iMessage, Instagram,
// Discord, Slack) and Bing don't run JS and would see the same generic tags everywhere.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { SITE_URL, pages } from "../src/seo.js";
import { socials } from "../src/siteData.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const { render: renderApp } = await import(path.join(root, "dist-ssr", "entry-server.js"));
const dist = path.join(root, "dist");
const template = fs.readFileSync(path.join(dist, "index.html"), "utf8");

const OG_IMAGE = `${SITE_URL}/og-image.jpg`;
const OG_IMAGE_ALT = "Students singing and playing guitar at an outdoor FreeSound show at Grinnell College";

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const orgJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "FreeSound",
  alternateName: ["FreeSound Grinnell", "Freesound Grinnell College"],
  url: `${SITE_URL}/`,
  logo: `${SITE_URL}/icon-512.png`,
  email: "freesound@grinnell.edu",
  foundingDate: "1998",
  description:
    "Student-run music community at Grinnell College with a shared practice room, sound equipment, training, and campus shows.",
  parentOrganization: { "@type": "CollegeOrUniversity", name: "Grinnell College", url: "https://www.grinnell.edu/" },
  location: {
    "@type": "Place",
    name: "Main Hall (Gardner basement), Grinnell College",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Grinnell",
      addressRegion: "IA",
      postalCode: "50112",
      addressCountry: "US"
    }
  },
  sameAs: socials.filter((s) => s.label !== "Grinnell").map((s) => s.href)
};

// WebSite schema tells Google which name to show above the result
// ("FreeSound Grinnell" instead of guessing, which matters with freesound.org around).
const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "FreeSound Grinnell",
  alternateName: ["FreeSound", "Freesound Grinnell College"],
  url: `${SITE_URL}/`
};

function headFor({ title, description, url, noindex = false, jsonLd }) {
  return [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    noindex ? `<meta name="robots" content="noindex" />` : `<link rel="canonical" href="${esc(url)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="FreeSound Grinnell" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    url ? `<meta property="og:url" content="${esc(url)}" />` : "",
    `<meta property="og:image" content="${esc(OG_IMAGE)}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="${esc(OG_IMAGE_ALT)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>` : ""
  ]
    .filter(Boolean)
    .map((line) => `    ${line}`)
    .join("\n");
}

function render(head, bodyHtml = "") {
  // Strip the dev-time title/description from index.html, then inject ours.
  const stripped = template
    .replace(/<title>[\s\S]*?<\/title>\s*/i, "")
    .replace(/<meta\s+name="description"[^>]*>\s*/i, "");
  if (!stripped.includes("</head>")) throw new Error("dist/index.html has no </head>");
  const withHead = stripped.replace("</head>", `${head}\n  </head>`);
  if (!bodyHtml) return withHead;
  if (!withHead.includes('<div id="root"></div>')) throw new Error('dist/index.html has no empty <div id="root">');
  return withHead.replace('<div id="root"></div>', () => `<div id="root">${bodyHtml}</div>`);
}

// Page files: "/" -> index.html, "/about" -> about.html (served at /about, no trailing slash)
for (const page of pages) {
  const url = page.path === "/" ? `${SITE_URL}/` : `${SITE_URL}${page.path}`;
  const html = render(
    headFor({ ...page, url, jsonLd: page.path === "/" ? [orgJsonLd, websiteJsonLd] : null }),
    page.path === "/" ? renderApp() : ""
  );
  const file = page.path === "/" ? "index.html" : `${page.path.slice(1)}.html`;
  fs.mkdirSync(path.dirname(path.join(dist, file)), { recursive: true });
  fs.writeFileSync(path.join(dist, file), html);
  console.log(`seo: wrote ${file}`);
}

// The prerendered home page is now inside index.html, so the <noscript> copy is redundant.
// 404 page: same app shell (React renders the NotFound route), but noindex.
fs.writeFileSync(
  path.join(dist, "404.html"),
  render(
    headFor({
      title: "Page not found | FreeSound Grinnell",
      description: "This page doesn't exist on the FreeSound site.",
      noindex: true
    })
  )
);

// sitemap.xml
const today = new Date().toISOString().slice(0, 10);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
  .map((p) => `  <url><loc>${SITE_URL}${p.path === "/" ? "/" : p.path}</loc><lastmod>${today}</lastmod></url>`)
  .join("\n")}
</urlset>
`;
fs.writeFileSync(path.join(dist, "sitemap.xml"), sitemap);

// robots.txt
fs.writeFileSync(path.join(dist, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);

console.log("seo: wrote 404.html, sitemap.xml, robots.txt");
if (SITE_URL.includes("example")) {
  console.warn("seo: WARNING SITE_URL in src/seo.js is still a placeholder");
}

