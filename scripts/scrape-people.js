#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const site = "https://www.civilopedia.net";
const staticSite = "https://static.civilopedia.net/images/core";
const localeRoot = "/zh-HK/gathering-storm";
const englishRoot = "/en-US/gathering-storm";

const classMeta = {
  GREAT_PERSON_CLASS_ENGINEER: { id: "engineer", icon: "icon_unit_great_engineer.png", color: "#d79a47" },
  GREAT_PERSON_CLASS_WRITER: { id: "writer", icon: "icon_unit_great_writer.png", color: "#8e6dac" },
  GREAT_PERSON_CLASS_SCIENTIST: { id: "scientist", icon: "icon_unit_great_scientist.png", color: "#4c8ec3" },
  GREAT_PERSON_CLASS_MUSICIAN: { id: "musician", icon: "icon_unit_great_musician.png", color: "#bf6b9a" },
  GREAT_PERSON_CLASS_MERCHANT: { id: "merchant", icon: "icon_unit_great_merchant.png", color: "#c4a245" },
  GREAT_PERSON_CLASS_GENERAL: { id: "general", icon: "icon_unit_great_general.png", color: "#a9504c" },
  GREAT_PERSON_CLASS_PROPHET: { id: "prophet", icon: "icon_unit_great_prophet.png", color: "#d8c875" },
  GREAT_PERSON_CLASS_ARTIST: { id: "artist", icon: "icon_unit_great_artist.png", color: "#b46591" },
  GREAT_PERSON_CLASS_ADMIRAL: { id: "admiral", icon: "icon_unit_great_admiral.png", color: "#468a99" },
  GREAT_PERSON_CLASS_COMANDANTE_GENERAL: { id: "comandante", icon: "icon_unit_comandante_general.png", color: "#ad6450" }
};

const governorMeta = {
  GOVERNOR_THE_EDUCATOR: { id: "pingala", advice: "最泛用的科技與文化總督。人口已高的首都或核心城優先，科學勝利再沿太空開發案升滿。", bestFor: ["科學", "文化", "偉人"] },
  GOVERNOR_IBRAHIM: { id: "ibrahim", unique: true, advice: "鄂圖曼與蘇萊曼專屬。攻城前部署至己方前線城或敵國首都，配合攻城單位與總督忠誠壓力。", bestFor: ["統治", "攻城", "外交施壓"] },
  GOVERNOR_THE_AMBASSADOR: { id: "amani", advice: "早期派往城邦即可視同額外使者；要搶宗主權時升幕後黑手，文化勝利也可用富饒社會增加奢侈資源。", bestFor: ["外交", "城邦", "文化"] },
  GOVERNOR_THE_RESOURCE_MANAGER: { id: "magnus", advice: "砍伐、收穫與移民潮的核心。先用補給保證避免移民減人口，再依資源或工業城市選黑市商人、垂直整合。", bestFor: ["擴張", "生產", "太空項目"] },
  GOVERNOR_THE_BUILDER: { id: "liang", advice: "建造者與城市防災專家。新城批量出建造者時先駐守，沿海城可選水產養殖，災害頻繁地圖優先加固材料。", bestFor: ["建造者", "沿海", "防災"] },
  GOVERNOR_THE_CARDINAL: { id: "moksha", advice: "宗教勝利與信仰經濟專用。使徒生產城優先主保聖人；大量信仰也可用神聖建築師直接購買區域。", bestFor: ["宗教", "信仰購買", "神學戰"] },
  GOVERNOR_THE_MERCHANT: { id: "reyna", advice: "高金幣、港口與魅力城市的長線總督。承包商能用金幣買區域，可再生補貼適合電力與外交終局。", bestFor: ["金幣", "港口", "魅力"] },
  GOVERNOR_THE_DEFENDER: { id: "victor", advice: "三回合即可就任，最適合剛征服的前線城。駐軍指揮官穩忠誠，銃眼與防空開發案保護軍事樞紐。", bestFor: ["防守", "忠誠", "軍事生產"] }
};

function decodeHtml(value) {
  return String(value || "")
    .replace(/&#(\d+);/g, (_, number) => String.fromCodePoint(Number(number)))
    .replace(/&#x([0-9a-f]+);/gi, (_, number) => String.fromCodePoint(parseInt(number, 16)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function plainText(value) {
  return decodeHtml(String(value || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<img\b[^>]*>/gi, "")
    .replace(/<[^>]+>/g, " "))
    .replace(/[\t\r ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{2,}/g, "\n")
    .replace(/激活/g, "啟用")
    .replace(/调/g, "調")
    .replace(/•/g, "·")
    .trim();
}

function slugFromPageId(pageId) {
  return pageId.toLowerCase().replace(/_/g, "-");
}

async function fetchText(url, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { "user-agent": "Civ6OfflineGuide/1.0" } });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return await response.text();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, attempt * 300));
    }
  }
  throw lastError;
}

function pageLinks(html) {
  const links = [];
  const seen = new Set();
  const re = /data-page-id="([^"]+)" data-page-name="([^"]+)"[^>]*href="([^"]+)"/g;
  let match;
  while ((match = re.exec(html))) {
    if (seen.has(match[1])) continue;
    seen.add(match[1]);
    links.push({ pageId: match[1], name: decodeHtml(match[2]), href: decodeHtml(match[3]) });
  }
  return links;
}

function pageGroups(html) {
  const markers = [];
  const re = /<div data-page-group="true" data-group-id="([^"]*)" data-group-name="([^"]*)">/g;
  let match;
  while ((match = re.exec(html))) markers.push({ groupId: match[1], name: decodeHtml(match[2]), start: match.index });
  return markers.map((marker, index) => ({
    groupId: marker.groupId,
    name: marker.name,
    links: pageLinks(html.slice(marker.start, markers[index + 1] ? markers[index + 1].start : html.length))
  }));
}

function titleFromHtml(html) {
  const match = html.match(/<title>(.*?) - [^<]+<\/title>/);
  return match ? plainText(match[1]) : "";
}

function descriptionFromHtml(html) {
  const match = html.match(/<meta name="description" content="([^"]*)"/);
  return match ? plainText(match[1]) : "";
}

function greatPersonDetails(html) {
  const eraMatch = html.match(/<div class="_8lp4s95 _1kgron9">([^<]+)<\/div>/);
  const abilityStart = html.indexOf(">特色能力<");
  const abilityEnd = abilityStart >= 0 ? html.indexOf('<div class="_1kgroni">', abilityStart) : -1;
  const abilityHtml = abilityStart >= 0 ? html.slice(abilityStart, abilityEnd > abilityStart ? abilityEnd : abilityStart + 5000) : "";
  const abilities = [];
  const abilityRe = /<p class="_1k50iii4[^"]*"[^>]*>([\s\S]*?)<\/p>\s*<p class="_1k50iii5[^"]*"[^>]*>([\s\S]*?)<\/p>/g;
  let match;
  while ((match = abilityRe.exec(abilityHtml))) abilities.push({ label: plainText(match[1]), effect: plainText(match[2]) });
  const worksStart = html.indexOf(">巨作<");
  const worksEnd = worksStart >= 0 ? html.indexOf('<div class="_1kgroni">', worksStart) : -1;
  const worksHtml = worksStart >= 0 ? html.slice(worksStart, worksEnd > worksStart ? worksEnd : worksStart + 5000) : "";
  const worksListMatch = worksHtml.match(/>巨作<\/div><\/div><\/div><div class="_1kgronf"><div>([\s\S]*?)<\/div><\/div>/);
  const works = Array.from(new Set((worksListMatch ? plainText(worksListMatch[1]).split("\n") : []).filter(Boolean)));
  if (!abilities.length && works.length) abilities.push({ label: `巨作（${works.length} 次）`, effect: "在具有可用巨作槽位的區域或奇觀上啟用。" });
  return { era: eraMatch ? plainText(eraMatch[1]) : "特殊", abilities, works };
}

function promotionDetails(html) {
  const levelMatch = html.match(/等級：([^<]+)<\/div>/);
  if (!levelMatch) throw new Error("總督技能缺少來源層級");
  const rawLevel = plainText(levelMatch[1]);
  const level = rawLevel === "基礎" ? 0 : Number(rawLevel.replace(/\D/g, ""));
  if (!Number.isInteger(level) || level < 0 || level > 3) throw new Error(`無效總督技能層級：${rawLevel}`);
  const requirementSection = html.match(/<p\b[^>]*>要求<\/p>([\s\S]*?)(?=<p\b[^>]*>|$)/);
  const requirementNames = requirementSection ? Array.from(requirementSection[1].matchAll(/<div\b[^>]*>\s*<img\b[^>]*\/bullet\.png[^>]*>\s*([^<]+)<\/div>/g), (match) => plainText(match[1])) : [];
  if (level > 0 && !requirementNames.length) throw new Error("總督晉升缺少前置技能，停止更新以免覆寫不完整資料");
  // Keep source levels for base-ability identification and maintenance; the UI uses a flat skill list.
  return { level, effect: descriptionFromHtml(html), requirementNames };
}

async function mapConcurrent(items, limit, mapper) {
  const output = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      output[index] = await mapper(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return output;
}

async function download(url, file) {
  const response = await fetch(url, { headers: { "user-agent": "Civ6OfflineGuide/1.0" } });
  if (!response.ok) throw new Error(`下載失敗 ${response.status}: ${url}`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.from(await response.arrayBuffer()));
}

async function buildGreatPeople() {
  const [zhIntro, enIntro] = await Promise.all([
    fetchText(`${site}${localeRoot}/greatpeople/intro/`),
    fetchText(`${site}${englishRoot}/greatpeople/intro/`)
  ]);
  const englishNames = new Map(pageLinks(enIntro).map((item) => [item.pageId, item.name]));
  const englishGroups = new Map(pageGroups(enIntro).map((group) => [group.groupId, group.name]));
  const groups = pageGroups(zhIntro).filter((group) => classMeta[group.groupId]);
  const classes = groups.map((group) => ({ ...classMeta[group.groupId], name: group.name, en: englishGroups.get(group.groupId) || group.name, count: group.links.length }));
  const entries = groups.flatMap((group) => group.links.map((link) => ({ ...link, classId: classMeta[group.groupId].id, className: group.name, icon: classMeta[group.groupId].icon })));
  const people = await mapConcurrent(entries, 12, async (entry, index) => {
    const html = await fetchText(`${site}${entry.href}`);
    const details = greatPersonDetails(html);
    if ((index + 1) % 25 === 0 || index === entries.length - 1) console.log(`偉人資料 ${index + 1}/${entries.length}`);
    if (!details.abilities.length && entry.classId === "prophet") {
      details.abilities.push({ label: "創立宗教", effect: "可在聖地創立一個宗教；大預言家之間沒有額外能力差異。" });
    }
    return {
      id: slugFromPageId(entry.pageId.replace(/^GREAT_PERSON_INDIVIDUAL_/, "")),
      pageId: entry.pageId,
      name: titleFromHtml(html) || entry.name,
      en: englishNames.get(entry.pageId) || entry.name,
      classId: entry.classId,
      className: entry.className,
      era: details.era,
      abilities: details.abilities,
      works: details.works,
      icon: entry.icon
    };
  });
  return { classes, people };
}

async function buildGovernors() {
  const [zhIntro, enIntro] = await Promise.all([
    fetchText(`${site}${localeRoot}/governors/intro/`),
    fetchText(`${site}${englishRoot}/governors/intro/`)
  ]);
  const zhGroups = pageGroups(zhIntro);
  const enNames = new Map(pageLinks(enIntro).map((item) => [item.pageId, item.name]));
  const governorLinks = pageLinks(zhIntro).filter((link) => governorMeta[link.pageId]);
  return mapConcurrent(governorLinks, 6, async (link) => {
    const group = zhGroups.find((candidate) => candidate.groupId === link.pageId);
    const promotionLinks = group ? group.links.filter((item) => item.pageId.startsWith("GOVERNOR_PROMOTION_")) : [];
    const governorHtml = await fetchText(`${site}${link.href}`);
    const imageMatch = governorHtml.match(/https:\/\/static\.civilopedia\.net\/images\/core\/(governornormal[^" ]+\.png)/);
    const fullName = titleFromHtml(governorHtml) || link.name;
    const nameMatch = fullName.match(/^(.+?)\s*\((.+)\)$/);
    const promotions = await mapConcurrent(promotionLinks, 4, async (promotion) => {
      const html = await fetchText(`${site}${promotion.href}`);
      const details = promotionDetails(html);
      return {
        id: slugFromPageId(promotion.pageId.replace(/^GOVERNOR_PROMOTION_/, "")),
        pageId: promotion.pageId,
        name: titleFromHtml(html) || promotion.name,
        en: enNames.get(promotion.pageId) || promotion.name,
        level: details.level,
        requires: details.requirementNames.map((name) => {
          const requirement = promotionLinks.find((item) => item.name === name);
          if (!requirement) throw new Error(`找不到總督前置技能：${name}`);
          return slugFromPageId(requirement.pageId.replace(/^GOVERNOR_PROMOTION_/, ""));
        }),
        effect: details.effect
      };
    });
    promotions.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, "zh-Hant"));
    const meta = governorMeta[link.pageId];
    return {
      id: meta.id,
      pageId: link.pageId,
      name: nameMatch ? nameMatch[1] : fullName,
      title: nameMatch ? nameMatch[2] : "總督",
      en: enNames.get(link.pageId) || fullName,
      unique: Boolean(meta.unique),
      description: descriptionFromHtml(governorHtml),
      icon: imageMatch ? imageMatch[1] : "icon_civilopedia_governors.png",
      establishment: meta.id === "victor" ? 3 : 5,
      advice: meta.advice,
      bestFor: meta.bestFor,
      promotions
    };
  });
}

async function main() {
  const greatPeople = await buildGreatPeople();
  const governors = await buildGovernors();
  const output = {
    meta: {
      ruleset: "Gathering Storm",
      locale: "zh-HK",
      source: "Civilopedia",
      greatPersonCount: greatPeople.people.length,
      governorCount: governors.length,
      promotionCount: governors.reduce((sum, governor) => sum + governor.promotions.length, 0)
    },
    classes: greatPeople.classes,
    people: greatPeople.people,
    governors
  };
  fs.writeFileSync(path.join(root, "data", "people.json"), `${JSON.stringify(output, null, 2)}\n`, "utf8");

  const iconDir = path.join(root, "assets", "game-icons", "people");
  const iconNames = Array.from(new Set([
    ...greatPeople.classes.map((item) => item.icon),
    ...governors.map((item) => item.icon)
  ]));
  await mapConcurrent(iconNames, 6, async (icon) => download(`${staticSite}/${icon}`, path.join(iconDir, icon)));
  console.log(`完成：${greatPeople.people.length} 位偉人、${governors.length} 位總督、${output.meta.promotionCount} 項總督晉升、${iconNames.length} 枚遊戲圖像。`);
}

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exit(1);
});
