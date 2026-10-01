#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const https = require("node:https");

const root = path.resolve(__dirname, "..");
const base = "https://www.civilopedia.net";
const categoryMap = {
  BELIEF_CLASS_PANTHEON: {
    id: "pantheon", name: "萬神殿", order: 0,
    timing: "首次累積足夠信仰值時選擇；每個文明只能選一個，不能傳播，也不會被其他宗教取代。"
  },
  BELIEF_CLASS_FOLLOWER: {
    id: "follower", name: "追隨者信條", order: 1,
    timing: "創教時必選一個；效果適用於所有信奉該宗教的城市與文明。"
  },
  BELIEF_CLASS_FOUNDER: {
    id: "founder", name: "創始者信條", order: 2,
    timing: "創教或用使徒傳播信條時選擇；效果只回饋創立該宗教的文明。"
  },
  BELIEF_CLASS_WORSHIP: {
    id: "worship", name: "崇拜信條", order: 3,
    timing: "創教或用使徒傳播信條時選擇；解鎖一種可用信仰值購買的聖地崇拜建築。"
  },
  BELIEF_CLASS_ENHANCER: {
    id: "enhancer", name: "強化信條", order: 4,
    timing: "創教或用使徒傳播信條時選擇；強化宗教壓力、傳教效率或宗教戰鬥。"
  }
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

async function fetchWithRetry(url) {
  let lastError;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try { return await fetchBuffer(url, 0); }
    catch (error) { lastError = error; }
  }
  throw lastError;
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)));
}

function indexEntries(html, locale) {
  const markers = [];
  const groupPattern = /<div data-page-group="true" data-group-id="([^"]*)" data-group-name="([^"]*)">/g;
  let groupMatch;
  while ((groupMatch = groupPattern.exec(html))) markers.push({ id: groupMatch[1], name: decodeHtml(groupMatch[2]), start: groupMatch.index });
  const output = [];
  markers.forEach((marker, index) => {
    const body = html.slice(marker.start, markers[index + 1] ? markers[index + 1].start : html.length);
    const linkPattern = new RegExp('<a data-page-link="true"[^>]*data-page-id="([^"]+)"[^>]*data-page-name="([^"]+)"[^>]*href="\\/' + locale + '\\/gathering-storm\\/religions\\/([^/]+)\\/"', "g");
    let link;
    while ((link = linkPattern.exec(body))) output.push({ groupId: marker.id, groupName: marker.name, pageId: link[1], name: decodeHtml(link[2]), slug: link[3] });
  });
  return output;
}

function metaContent(html, property) {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = html.match(new RegExp('<meta (?:name|property)="' + escaped + '" content="([^"]*)"'));
  return match ? decodeHtml(match[1]).replace(/\s+/g, " ").trim() : "";
}

async function savePng(url, folder, filename) {
  const target = path.join(root, "assets", "game-icons", folder, filename);
  if (fs.existsSync(target)) {
    const existing = fs.readFileSync(target);
    if (existing.length >= 8 && existing.toString("hex", 0, 8) === "89504e470d0a1a0a") return;
  }
  const buffer = await fetchWithRetry(url);
  if (buffer.length < 8 || buffer.toString("hex", 0, 8) !== "89504e470d0a1a0a") throw new Error(`不是有效 PNG：${url}`);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, buffer);
}

async function runPool(items, limit, worker) {
  let cursor = 0;
  async function next() {
    while (cursor < items.length) await worker(items[cursor++]);
  }
  await Promise.all(Array.from({ length: limit }, next));
}

async function main() {
  const [zhIndexBuffer, enIndexBuffer] = await Promise.all([
    fetchWithRetry(`${base}/zh-HK/gathering-storm/religions/`),
    fetchWithRetry(`${base}/en-US/gathering-storm/religions/`)
  ]);
  const zhEntries = indexEntries(zhIndexBuffer.toString("utf8"), "zh-HK");
  const enEntries = indexEntries(enIndexBuffer.toString("utf8"), "en-US");
  const englishNames = Object.fromEntries(enEntries.map((item) => [item.slug, item.name]));
  const religionEntries = zhEntries.filter((item) => item.groupId === "Religion" && item.slug.startsWith("religion_"));
  const beliefEntries = zhEntries.filter((item) => categoryMap[item.groupId] && item.slug.startsWith("belief_"));
  if (religionEntries.length !== 12) throw new Error(`歷史宗教數量錯誤：${religionEntries.length}`);
  if (beliefEntries.length !== 59) throw new Error(`宗教加成數量錯誤：${beliefEntries.length}`);

  const religions = [];
  await runPool(religionEntries, 6, async (entry) => {
    const html = (await fetchWithRetry(`${base}/zh-HK/gathering-storm/religions/${entry.slug}/`)).toString("utf8");
    const id = entry.slug.replace("religion_", "").replace(/_/g, "-");
    const icon = `${id}.png`;
    const image = metaContent(html, "og:image") || `https://static.civilopedia.net/images/core/icon_religion_${entry.slug.replace("religion_", "")}.png`;
    await savePng(image, "religions", icon);
    religions.push({ id, name: entry.name, en: englishNames[entry.slug] || "", icon });
    process.stdout.write(`宗教 ${entry.name}\n`);
  });

  const beliefs = [];
  await runPool(beliefEntries, 8, async (entry) => {
    const html = (await fetchWithRetry(`${base}/zh-HK/gathering-storm/religions/${entry.slug}/`)).toString("utf8");
    const category = categoryMap[entry.groupId];
    const id = entry.slug.replace("belief_", "").replace(/_/g, "-");
    const icon = `${id}.png`;
    const effect = metaContent(html, "description");
    if (!effect) throw new Error(`缺少信條說明：${entry.slug}`);
    const image = metaContent(html, "og:image") || `https://static.civilopedia.net/images/core/icon_belief_${entry.slug.replace("belief_", "")}.png`;
    await savePng(image, "beliefs", icon);
    beliefs.push({ id, name: entry.name, en: englishNames[entry.slug] || "", category: category.id, categoryName: category.name, effect, icon });
    process.stdout.write(`信條 ${entry.name}\n`);
  });

  religions.sort((a, b) => a.name.localeCompare(b.name, "zh-Hant"));
  beliefs.sort((a, b) => categoryMap[beliefEntries.find((entry) => entry.slug.replace("belief_", "").replace(/_/g, "-") === a.id).groupId].order - categoryMap[beliefEntries.find((entry) => entry.slug.replace("belief_", "").replace(/_/g, "-") === b.id).groupId].order || a.name.localeCompare(b.name, "zh-Hant"));
  const categories = Object.values(categoryMap).sort((a, b) => a.order - b.order).map(({ id, name, timing }) => ({ id, name, timing }));
  const data = {
    meta: {
      ruleset: "Gathering Storm",
      source: "Civilopedia.net zh-HK",
      generated: new Date().toISOString().slice(0, 10),
      note: "歷史宗教的名稱與圖標不附帶固定能力；實際加成由萬神殿及四類宗教信條決定。"
    },
    categories,
    religions,
    beliefs
  };
  fs.writeFileSync(path.join(root, "data", "religions.json"), JSON.stringify(data, null, 2) + "\n", "utf8");
  console.log(`完成：${religions.length} 種歷史宗教，${beliefs.length} 種信條與萬神殿。`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
