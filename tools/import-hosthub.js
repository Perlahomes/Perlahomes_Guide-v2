#!/usr/bin/env node
/*
  ONE-TIME (re-runnable) Hosthub import for the Perlahomes guide.
  It reads all your rentals from Hosthub and:
    1) writes ../data/properties.json   (the dropdown list: {slug,name})
    2) creates a starter ../data/<slug>.json for any rental that doesn't have one yet
       (it NEVER overwrites a guide you've already edited)

  HOW TO RUN (from inside the project folder):
    1) Put your NEW Hosthub API key in an environment variable, then run:
         macOS/Linux:   HOSTHUB_API_KEY=your_new_key  node tools/import-hosthub.js
         Windows (PowerShell):  $env:HOSTHUB_API_KEY="your_new_key"; node tools/import-hosthub.js
    2) Review the new/updated files, commit and push to GitHub.

  No npm install needed — uses only Node's built-in modules. Node 14+.
*/
const https = require("https");
const fs = require("fs");
const path = require("path");

const API_KEY = process.env.HOSTHUB_API_KEY || process.argv[2];
const HOST = "app.hosthub.com";
const BASE = "/api/2019-03-01";
const DATA_DIR = path.join(__dirname, "..", "data");

if (!API_KEY) {
  console.error("\n  Missing API key. Run:  HOSTHUB_API_KEY=your_key node tools/import-hosthub.js\n");
  process.exit(1);
}

function apiGet(resourcePath) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      { host: HOST, path: BASE + resourcePath, method: "GET",
        headers: { Authorization: API_KEY, Accept: "application/json" } },
      (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => {
          if (res.statusCode < 200 || res.statusCode >= 300)
            return reject(new Error("HTTP " + res.statusCode + ": " + body.slice(0, 300)));
          try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
        });
      }
    );
    req.on("error", reject);
    req.end();
  });
}

function slugify(name, id) {
  let s = (name || "").toLowerCase().trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")   // strips accents/Greek; fallback below
    .replace(/-+/g, "-").replace(/^-|-$/g, "");
  if (!s) s = "rental-" + id;
  return s;
}

function readJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; }
}

(async () => {
  console.log("Fetching rentals from Hosthub…");
  const resp = await apiGet("/rentals");
  const rentals = (resp && resp.data) || [];
  console.log("Found " + rentals.length + " rentals.");

  const template = readJSON(path.join(DATA_DIR, "_template.json"), { meta: {}, sections: [] });
  const propsPath = path.join(DATA_DIR, "properties.json");
  const existingProps = readJSON(propsPath, []);
  const bySlug = new Map(existingProps.map((p) => [p.slug, p]));
  const usedSlugs = new Set(existingProps.map((p) => p.slug));

  let created = 0, skipped = 0;
  for (const r of rentals) {
    let slug = slugify(r.name, r.id);
    // avoid collisions across different rentals
    if (usedSlugs.has(slug) && bySlug.get(slug) && bySlug.get(slug).hosthubId && bySlug.get(slug).hosthubId !== r.id) {
      slug = slug + "-" + String(r.id).toLowerCase();
    }
    usedSlugs.add(slug);
    bySlug.set(slug, { slug, name: r.name || slug, hosthubId: r.id });

    const filePath = path.join(DATA_DIR, slug + ".json");
    if (fs.existsSync(filePath)) { skipped++; continue; }  // never clobber an edited guide

    const starter = JSON.parse(JSON.stringify(template));
    starter.meta = starter.meta || {};
    starter.meta.name = r.name || slug;
    starter.meta.languages = starter.meta.languages || ["en", "el"];
    // stash useful Hosthub facts for reference / future automation
    starter.meta.hosthub = {
      id: r.id, city: r.city, country: r.country, postal_code: r.postal_code,
      latitude: r.latitude, longitude: r.longitude, time_zone: r.time_zone,
      check_in_time: r.check_in_time, checkout_time: r.checkout_time,
      maximum_guests: r.maximum_guests
    };
    fs.writeFileSync(filePath, JSON.stringify(starter, null, 2), "utf8");
    created++;
  }

  const merged = Array.from(bySlug.values()).sort((a, b) => a.name.localeCompare(b.name));
  fs.writeFileSync(propsPath, JSON.stringify(merged, null, 2), "utf8");

  console.log("\nDone.");
  console.log("  properties.json now lists " + merged.length + " properties.");
  console.log("  Created " + created + " new starter guide file(s); skipped " + skipped + " that already existed.");
  console.log("\nNext: open each new data/<slug>.json in the builder, fill in codes/WiFi/photos, commit & push.\n");
})().catch((e) => { console.error("\nImport failed:", e.message, "\n"); process.exit(1); });
