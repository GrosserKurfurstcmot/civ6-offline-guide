#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const https = require("node:https");

const root = path.resolve(__dirname, "..");
const base = "https://www.civilopedia.net";
const categoryMap = {
  SLOT_MILITARY: { id: "military", name: "軍事政策" },
  SLOT_ECONOMIC: { id: "economic", name: "經濟政策" },
  SLOT_DIPLOMATIC: { id: "diplomatic", name: "外交政策" },
  SLOT_GREAT_PERSON: { id: "great-person", name: "偉人政策" },
  SLOT_WILDCARD: { id: "wildcard", name: "通用政策" },
  GOLDEN_POLICIES: { id: "golden", name: "黃金時代政策" },
  DARK_POLICIES: { id: "dark", name: "黑暗時代政策" }
};

const governmentTiers = {
  chiefdom: { tier: 0, era: "遠古時代" },
  autocracy: { tier: 1, era: "古典時代" },
  oligarchy: { tier: 1, era: "古典時代" },
  classical_republic: { tier: 1, era: "古典時代" },
  monarchy: { tier: 2, era: "中世紀" },
  theocracy: { tier: 2, era: "文藝復興時代" },
  merchant_republic: { tier: 2, era: "文藝復興時代" },
  fascism: { tier: 3, era: "現代" },
  communism: { tier: 3, era: "現代" },
  democracy: { tier: 3, era: "現代" },
  corporate_libertarianism: { tier: 4, era: "未來時代" },
  digital_democracy: { tier: 4, era: "未來時代" },
  synthetic_technocracy: { tier: 4, era: "未來時代" }
};
const categoryIconFallbacks = {
  military: "https://static.civilopedia.net/images/core/icon_policy_agoge.png",
  economic: "https://static.civilopedia.net/images/core/icon_policy_urban_planning.png",
  diplomatic: "https://static.civilopedia.net/images/core/icon_policy_diplomatic_league.png",
  "great-person": "https://static.civilopedia.net/images/core/icon_policy_inspiration.png",
  wildcard: "https://static.civilopedia.net/images/core/icon_policy_revelation.png",
  golden: "https://static.wikia.nocookie.net/civilization/images/e/e5/Golden_Age_Policy_Card_%28Civ6%29.png/revision/latest?cb=20200924190306",
  dark: "https://static.wikia.nocookie.net/civilization/images/5/50/Dark_Age_Policy_Card_small_%28Civ6%29.png/revision/latest?cb=20200718191241"
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

function cleanHtml(fragment) {
  return decodeHtml(String(fragment || "")
    .replace(/<br\s*\/?\s*>/gi, " ")
    .replace(/<img\b[^>]*>/gi, " ")
    .replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ").replace(/\s+([。，；：！？])/g, "$1").trim();
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function indexEntries(html, locale) {
  const markers = [];
  const groupPattern = /<div data-page-group="true" data-group-id="([^"]*)" data-group-name="([^"]*)">/g;
  let groupMatch;
  while ((groupMatch = groupPattern.exec(html))) markers.push({ id: groupMatch[1], name: decodeHtml(groupMatch[2]), start: groupMatch.index });
  const output = [];
  markers.forEach((marker, index) => {
    const body = html.slice(marker.start, markers[index + 1] ? markers[index + 1].start : html.length);
    const linkPattern = new RegExp('<a data-page-link="true"[^>]*data-page-id="([^"]+)"[^>]*data-page-name="([^"]+)"[^>]*href="\\/' + locale + '\\/gathering-storm\\/governments\\/([^/]+)\\/"', "g");
    let link;
    while ((link = linkPattern.exec(body))) output.push({ groupId: marker.id, groupName: marker.name, pageId: link[1], name: decodeHtml(link[2]), slug: link[3] });
  });
  return output;
}

function firstDescription(html) {
  const match = html.match(/<div class="_1k50iii3 _1kgron9">(?:說明|Description)<\/div>[\s\S]*?<div class="_1k50iii1 _1kgron9">([\s\S]*?)<\/div>/);
  return match ? cleanHtml(match[1]) : "";
}

function labeledDescription(html, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = html.match(new RegExp('<p class="_1k50iii4 _1kgron9">' + escaped + '<\\/p>\\s*<p class="_1k50iii5 _1kgron9">([\\s\\S]*?)<\\/p>'));
  return match ? cleanHtml(match[1]) : "";
}

function contentBody(html) {
  const start = html.indexOf("civilopedia_portraitsquare.png");
  return start >= 0 ? html.slice(start) : html;
}

function linkedNames(body, section, prefix) {
  const pattern = new RegExp('<a href="/zh-HK/gathering-storm/' + section + '/(' + prefix + '[^/]+?)/"[^>]*>([\\s\\S]*?)<\\/a>', "g");
  const values = [];
  let match;
  while ((match = pattern.exec(body))) {
    const name = match[2].match(/<div class="_8lp4s98">([^<]+)<\/div>/);
    if (name) values.push({ id: match[1].replace(prefix, "").replace(/_/g, "-"), name: cleanHtml(name[1]) });
  }
  return values.filter((item, index) => values.findIndex((other) => other.id === item.id) === index);
}

function ogImage(html) {
  const match = html.match(/<meta property="og:image" content="([^"]+)"/);
  if (match) return match[1];
  const contentMatch = contentBody(html).match(/src="(https:\/\/static\.civilopedia\.net\/images\/core\/icon_policy_[^"]+\.png)"/);
  return contentMatch ? contentMatch[1] : "";
}

function traitLines(html) {
  const body = contentBody(html);
  const matches = Array.from(body.matchAll(/<div class="_8lp4s95 _1kgron9">([\s\S]*?)<\/div>/g)).map((match) => cleanHtml(match[1]));
  return unique(matches);
}

async function saveIcon(url, folder, filename, fallbackUrl) {
  if (!url) throw new Error(`缺少圖示網址：${folder}/${filename}`);
  const target = path.join(root, "assets", "game-icons", folder, filename);
  if (fs.existsSync(target)) {
    const existing = fs.readFileSync(target);
    const isPng = existing.length >= 8 && existing.toString("hex", 0, 8) === "89504e470d0a1a0a";
    const isWebp = existing.length >= 12 && existing.toString("ascii", 0, 4) === "RIFF" && existing.toString("ascii", 8, 12) === "WEBP";
    if (isPng || isWebp) return;
  }
  let buffer;
  try { buffer = await fetchWithRetry(url); }
  catch (error) {
    if (!fallbackUrl) throw error;
    buffer = await fetchWithRetry(fallbackUrl);
  }
  const isPng = buffer.length >= 8 && buffer.toString("hex", 0, 8) === "89504e470d0a1a0a";
  const isWebp = buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
  if (!isPng && !isWebp) throw new Error(`不是有效的 PNG／WebP：${url}`);
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
    fetchWithRetry(`${base}/zh-HK/gathering-storm/governments/`),
    fetchWithRetry(`${base}/en-US/gathering-storm/governments/`)
  ]);
  const zhEntries = indexEntries(zhIndexBuffer.toString("utf8"), "zh-HK");
  const enEntries = indexEntries(enIndexBuffer.toString("utf8"), "en-US");
  const englishNames = Object.fromEntries(enEntries.map((item) => [item.slug, item.name]));
  const governmentEntries = zhEntries.filter((item) => item.slug.startsWith("government_"));
  const policyEntries = zhEntries.filter((item) => item.slug.startsWith("policy_") && categoryMap[item.groupId]);
  if (governmentEntries.length !== 13) throw new Error(`政體數量錯誤：${governmentEntries.length}`);
  if (policyEntries.length !== 157) throw new Error(`政策卡數量錯誤：${policyEntries.length}`);

  const governments = [];
  await runPool(governmentEntries, 6, async (entry) => {
    const html = (await fetchWithRetry(`${base}/zh-HK/gathering-storm/governments/${entry.slug}/`)).toString("utf8");
    const body = contentBody(html);
    const id = entry.slug.replace("government_", "");
    const traits = traitLines(html);
    const slots = { military: 0, economic: 0, diplomatic: 0, wildcard: 0 };
    traits.forEach((line) => {
      const match = line.match(/(\d+)個(軍事|經濟|外交|通用)槽位/);
      if (match) slots[{ 軍事: "military", 經濟: "economic", 外交: "diplomatic", 通用: "wildcard" }[match[2]]] = Number(match[1]);
    });
    const civics = linkedNames(body, "civics", "civic_");
    const policies = linkedNames(body, "governments", "policy_");
    const tier = governmentTiers[id];
    const record = {
      id: id.replace(/_/g, "-"),
      name: entry.name,
      en: englishNames[entry.slug] || "",
      tier: tier.tier,
      era: tier.era,
      unlock: civics[0] ? civics[0].name : "開局可用",
      inherent: labeledDescription(html, "內在加成"),
      legacy: labeledDescription(html, "遺產加成"),
      slots,
      traits: traits.filter((line) => !/\d+個(?:軍事|經濟|外交|通用)槽位/.test(line)),
      uniquePolicies: policies.map((item) => item.name)
    };
    governments.push(record);
    process.stdout.write(`政體 ${record.name}\n`);
  });

  const policies = [];
  await runPool(policyEntries, 8, async (entry) => {
    const html = (await fetchWithRetry(`${base}/zh-HK/gathering-storm/governments/${entry.slug}/`)).toString("utf8");
    const body = contentBody(html);
    const id = entry.slug.replace("policy_", "").replace(/_/g, "-");
    const civics = linkedNames(body, "civics", "civic_");
    const governmentLinks = linkedNames(body, "governments", "government_");
    const replacementLinks = linkedNames(body, "governments", "policy_");
    const category = categoryMap[entry.groupId];
    const unlock = civics.length ? civics.map((item) => item.name).join("、") : governmentLinks.length ? governmentLinks.map((item) => item.name).join("、") : category.id === "golden" ? "黃金或英勇時代限定" : category.id === "dark" ? "黑暗時代限定" : "特殊條件";
    const record = {
      id,
      name: entry.name,
      en: englishNames[entry.slug] || "",
      category: category.id,
      categoryName: category.name,
      effect: firstDescription(html),
      unlock,
      civicIds: civics.map((item) => item.id),
      replacedBy: replacementLinks.map((item) => item.name),
      icon: `${id}.${category.id === "golden" || category.id === "dark" ? "webp" : "png"}`
    };
    if (!record.effect) throw new Error(`缺少政策說明：${entry.slug}`);
    await saveIcon(ogImage(html), "policies", record.icon, categoryIconFallbacks[category.id]);
    policies.push(record);
    process.stdout.write(`政策 ${record.name}\n`);
  });

  governments.sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name, "zh-Hant"));
  const categoryOrder = ["military", "economic", "diplomatic", "great-person", "wildcard", "golden", "dark"];
  policies.sort((a, b) => categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category) || a.name.localeCompare(b.name, "zh-Hant"));
  const data = {
    meta: {
      ruleset: "Gathering Storm",
      source: "Civilopedia.net zh-HK",
      generated: new Date().toISOString().slice(0, 10),
      note: "政策效果採遊戲繁體中文 Civilopedia 文字；黃金與黑暗時代政策另列，並非一般市政卡槽常駐卡。"
    },
    categories: categoryOrder.map((id) => ({ id, name: Object.values(categoryMap).find((item) => item.id === id).name })),
    governments,
    policies
  };
  fs.writeFileSync(path.join(root, "data", "governments.json"), JSON.stringify(data, null, 2) + "\n", "utf8");
  console.log(`完成：${governments.length} 種政體，${policies.length} 張政策卡。`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
