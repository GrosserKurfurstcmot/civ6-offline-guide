#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const https = require("node:https");

const root = path.resolve(__dirname, "..");
const basics = JSON.parse(fs.readFileSync(path.join(root, "data", "basics.json"), "utf8"));
const baseUrl = "https://static.civilopedia.net/images/core/";

const terrainSources = {
  grassland: "terrain_grass",
  plains: "terrain_plains",
  desert: "terrain_desert",
  tundra: "terrain_tundra",
  snow: "terrain_snow",
  coast: "terrain_coast",
  ocean: "terrain_ocean",
  "grass-hills": "terrain_grass_hills",
  "plains-hills": "terrain_plains_hills",
  "desert-hills": "terrain_desert_hills",
  "tundra-hills": "terrain_tundra_hills",
  "snow-hills": "terrain_snow_hills",
  mountains: "terrain_grass_mountain",
  volcano: "feature_volcano",
  woods: "feature_forest",
  rainforest: "feature_jungle",
  marsh: "feature_marsh",
  "desert-floodplains": "feature_floodplains",
  "grass-floodplains": "feature_floodplains_grassland",
  "plains-floodplains": "feature_floodplains_plains",
  oasis: "feature_oasis",
  reef: "feature_reef",
  geothermal: "feature_geothermal_fissure",
  "volcanic-soil": "feature_volcanic_soil",
  ice: "feature_ice"
};

const improvementSources = {
  farm: "farm",
  mine: "mine",
  quarry: "quarry",
  pasture: "pasture",
  camp: "camp",
  "fishing-boats": "fishing_boats",
  plantation: "plantation",
  "lumber-mill": "lumber_mill",
  "oil-well": "oil_well",
  "offshore-oil-rig": "offshore_oil_rig",
  "geothermal-plant": "geothermal_plant",
  "wind-farm": "wind_farm",
  "solar-farm": "solar_farm",
  "offshore-wind-farm": "offshore_wind_farm",
  "seaside-resort": "beach_resort",
  "ski-resort": "ski_resort",
  fishery: "fishery",
  "city-park": "city_park"
};

const yieldSources = {
  food: "food",
  production: "production",
  gold: "gold",
  science: "science",
  culture: "culture",
  faith: "faith"
};

function fetchBuffer(url, redirects) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "Civ6OfflineGuide/1.0" } }, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location && redirects < 4) {
        response.resume();
        resolve(fetchBuffer(new URL(response.headers.location, url).href, redirects + 1));
        return;
      }
      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error(`${response.statusCode} ${url}`));
        return;
      }
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => resolve(Buffer.concat(chunks)));
      response.on("error", reject);
    }).on("error", reject);
  });
}

async function download(item) {
  if (fs.existsSync(item.target)) {
    const existing = fs.readFileSync(item.target);
    if (existing.length >= 8 && existing.toString("hex", 0, 8) === "89504e470d0a1a0a") return false;
  }
  let buffer;
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      buffer = await fetchBuffer(item.url, 0);
      break;
    } catch (error) {
      lastError = error;
    }
  }
  if (!buffer) throw lastError;
  if (buffer.length < 8 || buffer.toString("hex", 0, 8) !== "89504e470d0a1a0a") {
    throw new Error(`不是有效 PNG：${item.url}`);
  }
  fs.mkdirSync(path.dirname(item.target), { recursive: true });
  fs.writeFileSync(item.target, buffer);
  return true;
}

async function runPool(items, limit) {
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const item = items[cursor++];
      if (await download(item)) process.stdout.write(`下載 ${path.relative(root, item.target)}\n`);
    }
  }
  await Promise.all(Array.from({ length: limit }, worker));
}

const jobs = [];
for (const item of basics.resources) {
  jobs.push({
    url: `${baseUrl}icon_resource_${item.id.replace(/-/g, "_")}.png`,
    target: path.join(root, "assets", "game-icons", "resources", `${item.id}.png`)
  });
}
for (const item of basics.terrains) {
  const source = terrainSources[item.id];
  if (!source) throw new Error(`缺少地形圖示映射：${item.id}`);
  jobs.push({
    url: `${baseUrl}icon_${source}.png`,
    target: path.join(root, "assets", "game-icons", "terrain", `${item.id}.png`)
  });
}
for (const item of basics.improvements) {
  const source = improvementSources[item.id];
  if (!source) throw new Error(`缺少改良圖示映射：${item.id}`);
  jobs.push({
    url: `${baseUrl}icon_improvement_${source}.png`,
    target: path.join(root, "assets", "game-icons", "improvements", `${item.id}.png`)
  });
}
for (const [id, source] of Object.entries(yieldSources)) {
  jobs.push({
    url: `${baseUrl}${source}.png`,
    target: path.join(root, "assets", "game-icons", "yields", `${id}.png`)
  });
}

runPool(jobs, 8)
  .then(() => console.log(`完成：${jobs.length} 枚遊戲圖示已保存至 assets/game-icons。`))
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
