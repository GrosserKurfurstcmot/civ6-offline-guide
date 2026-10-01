#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const site = "https://www.civilopedia.net";
const staticSite = "https://static.civilopedia.net/images/core";
const localeRoot = "/zh-HK/gathering-storm";
const englishRoot = "/en-US/gathering-storm";

const districtAdvice = {
  DISTRICT_CITY_CENTER: { best: "城市中心位置決定整座城市的淡水、住房與前三環地塊。沿河、湖岸或綠洲通常最穩；首都還要兼顧至少兩格可工作的 2 食物／2 生產力地塊。", target: "先看淡水，再看可工作地塊與後續區域空間；不要只為單一奢侈品犧牲整體地形。" },
  DISTRICT_CAMPUS: { best: "優先尋找地熱裂隙或礁石，每個提供 +2 科技值；山脈每格 +1。兩片雨林或兩個區域合計 +1，市政廣場另給 +1。", target: "標準城市以 +3 為合格，科學核心城力求 +4 以上。先保留礁石與地熱，山脈凹槽通常最容易形成高相鄰。" },
  DISTRICT_HOLY_SITE: { best: "每格相鄰山脈提供 +1 信仰值、每兩片樹林或兩個區域提供 +1；相鄰自然奇觀的每一格通常提供 +2。", target: "創教城市以 +3 為合格；山脈凹槽與多格自然奇觀旁通常最強。若準備用聖地相鄰轉生產力，更應追求 +4 以上。" },
  DISTRICT_COMMERCIAL_HUB: { best: "沿河放置可獲 +2 金幣，鄰接港口再 +2，市政廣場 +1，每兩個區域 +1。", target: "最佳常是河岸上同時貼著港口與城市中心的位置。沿海城通常在商業中心與港口之間擇一，除非要做高相鄰三角。" },
  DISTRICT_HARBOR: { best: "相鄰城市中心提供 +2 金幣，每個海洋資源 +1，市政廣場 +1，每兩個區域 +1。", target: "把港口貼城市中心，再盡量接觸兩個以上海洋資源；如此可同時提高金幣、住房與海軍生產效率。" },
  DISTRICT_INDUSTRIAL_ZONE: { best: "每個相鄰水渠、水壩或運河提供 +2 生產力；採石場與戰略資源通常 +1，每兩座礦場或區域合計 +1。", target: "先規劃城市中心—水渠—工業區，再把水壩或運河接入。+4 是實用目標，水渠與水壩同時相鄰時常可達 +5 以上。" },
  DISTRICT_THEATER: { best: "相鄰每座奇觀、娛樂中心或水上樂園提供 +2 文化值；市政廣場 +1，每兩個區域 +1。", target: "先預留奇觀與娛樂區，再把劇院廣場夾在中間。沒有奇觀規劃時，不要為了很低的相鄰過早建造。" },
  DISTRICT_ENCAMPMENT: { best: "營地不能緊鄰城市中心，也沒有一般產出相鄰；位置價值來自射擊覆蓋、單位部署與阻塞敵軍。", target: "放在敵軍最可能接近的隘口、河對岸或邊境高地外側，避免卡住高相鄰區域與珍貴資源。" },
  DISTRICT_ENTERTAINMENT_COMPLEX: { best: "區域本身重點是宜居度與後期區域建築覆蓋，而非地塊產出；它也能給相鄰劇院廣場 +2 文化值。", target: "選在能讓動物園與體育場覆蓋多座城市的位置，通常是城市群中央；不要每城各蓋一座造成重複覆蓋。" },
  DISTRICT_WATER_ENTERTAINMENT_COMPLEX: { best: "只能建在海岸或湖泊；後期建築的區域效果範圍比陸上娛樂中心更廣，並能給相鄰劇院廣場 +2 文化值。", target: "放在城市群中央的可用水格，優先覆蓋缺宜居度的沿海城市；先確認不會佔掉港口最佳位置。" },
  DISTRICT_GOVERNMENT: { best: "市政廣場會讓每個相鄰的專業區域獲得 +1 相鄰加成，本身只能全國建造一座。", target: "把它放在能同時接觸三至六個區域的位置；兩城或三城交界的區域群，通常比單獨塞在首都市中心旁更有價值。" },
  DISTRICT_DIPLOMATIC_QUARTER: { best: "使館特區重點是使者、外交支持與降低敵方間諜效率，通常沒有值得追逐的產出相鄰。", target: "優先放在核心、安全且能快速完成建築的城市；靠近市中心方便防守，也別佔用學院或工業區的高相鄰格。" },
  DISTRICT_AQUEDUCT: { best: "必須鄰接城市中心，另一側連到河流、湖泊、綠洲或山脈；它不佔人口區域上限，並能給相鄰工業區 +2 生產力。", target: "建城前就預留城市中心旁能同時接淡水與工業區的一格。已有淡水城市主要為住房與工業區相鄰而建。" },
  DISTRICT_DAM: { best: "只能放在洪氾平原，單元格需由同一條河至少兩邊環繞；同一條河只能建一座水壩。它能給相鄰工業區 +2 生產力。", target: "先用帝國視角確認河流歸屬，再選能同時保護多格洪氾平原並貼工業區的位置。" },
  DISTRICT_CANAL: { best: "必須讓兩側形成城市中心或可通航水域的有效連接，並能給相鄰工業區 +2 生產力。", target: "只有能打通海路、縮短艦隊航程或補足工業區相鄰時才值得高生產成本；純裝飾通常太慢。" },
  DISTRICT_PRESERVE: { best: "保留區會提高相鄰地塊魅力，建築則強化相鄰未改良且高魅力的地塊。區域旁不應堆設施或其他區域。", target: "尋找山脈、樹林、海岸或自然奇觀圍出的高魅力區；先用魅力鏡頭確認至少四格可長期保持未改良。" },
  DISTRICT_NEIGHBORHOOD: { best: "社區住房取決於落腳地塊魅力：魅力越高住房越多，不受人口區域上限限制。", target: "優先選驚艷魅力地塊並遠離工業區、礦場與雨林；若城市住房尚未卡住人口，就先把生產力用在勝利主線。" },
  DISTRICT_AERODROME: { best: "航空港需平坦陸地，沒有產出相鄰；位置重點是空軍航程、安全與不佔用核心區域格。", target: "軍事前線放在安全後方但能覆蓋戰場的位置；文化勝利則方便串聯機場空運。避免壓掉高產工作格。" },
  DISTRICT_SPACEPORT: { best: "太空中心需平坦陸地，不受人口區域上限限制，也沒有相鄰產出。", target: "只在最高生產力、能穩定供電且容易反間諜的城市建造；預留第二座作備援，不必每城都蓋。" }
};

const buildingTips = {
  BUILDING_MONUMENT: "新城通常優先度很高：忠誠度未滿時先補忠誠，滿忠誠後提供文化值，加速取得關鍵市政與擴張邊界。",
  BUILDING_GRANARY: "城市被住房卡住，或缺食物成長時再建；有淡水且住房充足的新城不必固定排在紀念碑之前。",
  BUILDING_WATER_MILL: "沿河城市且有多個加成資源時收益最好；若城市沒有相關資源，優先度會明顯下降。",
  BUILDING_WALLS: "邊境城、可能被突襲的城市或準備文化旅遊時建；和平內陸城不必過早投入。",
  BUILDING_LIBRARY: "學院落地後最穩定的早期科技來源，科學主城與需要搶大科學家的城市優先。",
  BUILDING_UNIVERSITY: "中期科技骨幹；高學院相鄰城、人口能工作專家槽的城市先建。",
  BUILDING_RESEARCH_LAB: "後期科學勝利核心，先確保供電才能取得完整收益。",
  BUILDING_BARRACKS: "偏近戰與遠程單位的軍事城選兵營；與馬廄互斥，應依主要兵種決定。",
  BUILDING_STABLE: "偏騎兵與攻城單位的軍事城選馬廄；不要在不出兵的城市只為少量產出而建。",
  BUILDING_MARKET: "提供商路容量的早期經濟建築；新商路能立刻投入時優先度最高。",
  BUILDING_LIGHTHOUSE: "港口城市的住房、食物與商路核心；沿海擴張通常比市場更早完成。",
  BUILDING_SHIPYARD: "把港口相鄰轉成生產力，高相鄰港口的質變建築；低相鄰港口收益較慢。",
  BUILDING_WORKSHOP: "工業區的第一級建築，先在高相鄰、會繼續蓋工廠與發電廠的核心工業城完成。",
  BUILDING_FACTORY: "區域生產力可服務城市群；安排覆蓋範圍，避免多座工廠效果重複。",
  BUILDING_AMPHITHEATER: "提供早期文化與著作槽；已有大作家或正競爭文化勝利時優先。",
  BUILDING_MUSEUM_ART: "適合能穩定取得大藝術家的文明；注意藝術品主題化需求。",
  BUILDING_MUSEUM_ARTIFACT: "適合地圖大、遺址充足或大藝術家競爭激烈時；需再生產考古學家。",
  BUILDING_SHRINE: "創教與宗教勝利的第一級建築，提供信仰與傳教士；不走宗教時依信仰經濟需求決定。",
  BUILDING_TEMPLE: "解鎖使徒與崇拜建築；宗教勝利、聖物或信仰購買策略優先。",
  BUILDING_ARENA: "單城宜居度與文化的基礎建築，也是後續區域宜居度建築的前置。",
  BUILDING_FLOOD_BARRIER: "會受海平面上升影響的城市應在電腦科技後盡快完成；越晚建造成本通常越高。"
};

function decodeHtml(value) {
  return String(value || "")
    .replace(/&#(\d+);/g, (_, number) => String.fromCodePoint(Number(number)))
    .replace(/&#x([0-9a-f]+);/gi, (_, number) => String.fromCodePoint(parseInt(number, 16)))
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

function plainText(value) {
  return decodeHtml(String(value || "").replace(/<br\s*\/?>/gi, "\n").replace(/<img\b[^>]*>/gi, "").replace(/<[^>]+>/g, " "))
    .replace(/[\t\r ]+/g, " ").replace(/ *\n */g, "\n").replace(/\n{2,}/g, "\n")
    .replace(/激活/g, "啟用").replace(/调/g, "調").replace(/•/g, "·").trim();
}

function slug(pageId) { return pageId.toLowerCase().replace(/_/g, "-"); }

async function fetchText(url, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { "user-agent": "Civ6OfflineGuide/1.0" } });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return await response.text();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, attempt * 250));
    }
  }
  throw lastError;
}

function pageLinks(html) {
  const output = [];
  const seen = new Set();
  const re = /data-page-id="([^"]+)" data-page-name="([^"]+)"[^>]*href="([^"]+)"/g;
  let match;
  while ((match = re.exec(html))) {
    if (match[1] === "INTRO" || seen.has(match[1])) continue;
    seen.add(match[1]);
    output.push({ pageId: match[1], name: decodeHtml(match[2]), href: decodeHtml(match[3]) });
  }
  return output;
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
  const heading = html.indexOf('>說明<');
  if (heading < 0) return "";
  const match = html.slice(heading, heading + 6000).match(/<div class="_1k50iii1 _1kgron9">([\s\S]*?)<\/div>/);
  return match ? plainText(match[1]) : "";
}

function iconFromHtml(html, kind) {
  const re = new RegExp('<img alt="[^"]*" src="' + staticSite.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + '/(icon_' + kind + '_[^"]+)" width="256"');
  const match = html.match(re);
  return match ? match[1] : "";
}

function panel(html, title) {
  const marker = `<p class="_8lp4s91">${title}</p>`;
  const start = html.indexOf(marker);
  if (start < 0) return {};
  const next = html.indexOf('<p class="_8lp4s91">', start + marker.length);
  const slice = html.slice(start + marker.length, next > start ? next : start + 30000);
  const groups = { 其他: [] };
  let current = "其他";
  const re = /<div class="_8lp4s9([458])(?: [^"]*)?"[^>]*>([\s\S]*?)<\/div>/g;
  let match;
  while ((match = re.exec(slice))) {
    const text = plainText(match[2]);
    if (!text) continue;
    if (match[1] === "4") {
      current = text;
      if (!groups[current]) groups[current] = [];
    } else {
      if (!groups[current]) groups[current] = [];
      if (!groups[current].includes(text)) groups[current].push(text);
    }
  }
  return groups;
}

function flattenGroups(groups, excluded) {
  const skip = new Set(excluded || []);
  const output = [];
  for (const [label, values] of Object.entries(groups)) {
    if (skip.has(label)) continue;
    for (const value of values) output.push(label === "其他" ? value : `${label}：${value}`);
  }
  return output;
}

async function mapConcurrent(items, limit, mapper) {
  const output = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      output[index] = await mapper(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return output;
}

async function download(url, file) {
  if (fs.existsSync(file)) return;
  const response = await fetch(url, { headers: { "user-agent": "Civ6OfflineGuide/1.0" } });
  if (!response.ok) throw new Error(`下載失敗 ${response.status}: ${url}`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.from(await response.arrayBuffer()));
}

function requirementSummary(groups) {
  const preferred = ["區域", "科技", "市政", "建築", "生產力消耗", "購買成本", "維護費用", "電力消耗", "位置", "鄰接地域"];
  const output = [];
  for (const key of preferred) for (const value of groups[key] || []) output.push({ label: key, value });
  return output;
}

function genericBuildingTip(building) {
  const district = building.districtName || "對應區域";
  if (buildingTips[building.pageId]) return buildingTips[building.pageId];
  const tips = {
    DISTRICT_CAMPUS: "科技主線與高學院相鄰城市優先；先確認城市人口、供電或偉人競爭能用到完整效果。",
    DISTRICT_ENCAMPMENT: "只在會持續生產軍隊的專職城市投資；經驗與戰略資源收益比單純面板產出更重要。",
    DISTRICT_COMMERCIAL_HUB: "經濟樞紐與需要商路容量的城市優先，完成前先確認新增金幣能否回收建造成本。",
    DISTRICT_HARBOR: "沿海貿易城與造船城優先；高港口相鄰能讓後續建築價值明顯提高。",
    DISTRICT_INDUSTRIAL_ZONE: "高相鄰工業城優先，區域性建築要按覆蓋範圍規劃，避免效果重複。",
    DISTRICT_THEATER: "文化勝利、偉人競爭或已有巨作時優先；先準備足夠槽位再搶人。",
    DISTRICT_HOLY_SITE: "創教、宗教勝利或信仰購買體系優先；不使用信仰時不要機械式蓋滿。",
    DISTRICT_ENTERTAINMENT_COMPLEX: "城市群宜居度不足時建造；區域性建築應集中覆蓋多城而非逐城複製。",
    DISTRICT_WATER_ENTERTAINMENT_COMPLEX: "沿海城市群缺宜居度或文化勝利需要旅遊時優先，留意區域效果覆蓋範圍。",
    DISTRICT_CITY_CENTER: "依城市當前瓶頸決定：文化擴張、住房成長、防禦或災害保護，不必照固定順序全蓋。",
    DISTRICT_GOVERNMENT: "政府廣場建築互斥且會鎖定長期戰略；選擇前先看擴張、總督、軍事或信仰經濟的主線。",
    DISTRICT_PRESERVE: "只有相鄰地塊能保持高魅力且不改良時才有高回報；一般城市不應盲目建造。"
  };
  return tips[building.districtPageId] || `建在${district}內；先確認此城市會使用卡片列出的產出、槽位或區域效果，再投入生產力。`;
}

async function main() {
  const [districtIndexZh, districtIndexEn, buildingIndexZh, buildingIndexEn] = await Promise.all([
    fetchText(`${site}${localeRoot}/districts/intro/`), fetchText(`${site}${englishRoot}/districts/intro/`),
    fetchText(`${site}${localeRoot}/buildings/intro/`), fetchText(`${site}${englishRoot}/buildings/intro/`)
  ]);
  const districtLinks = pageLinks(districtIndexZh);
  const districtNames = new Set(districtLinks.map((item) => item.name));
  const districtEnglish = new Map(pageLinks(districtIndexEn).map((item) => [item.pageId, item.name]));
  const buildingGroups = pageGroups(buildingIndexZh).filter((group) => group.groupId);
  const buildingEnglish = new Map(pageLinks(buildingIndexEn).map((item) => [item.pageId, item.name]));
  const buildingDistrict = new Map();
  for (const group of buildingGroups) for (const link of group.links) buildingDistrict.set(link.pageId, { pageId: group.groupId, name: group.name });
  const buildingLinks = pageLinks(buildingIndexZh);
  const buildingNames = new Set(buildingLinks.map((item) => item.name));

  const districts = await mapConcurrent(districtLinks, 12, async (link, index) => {
    const html = await fetchText(`${site}${link.href}`);
    const traits = panel(html, "特點");
    const requirements = panel(html, "要求");
    const icon = iconFromHtml(html, "district");
    const replacementValues = traits["取代者"] || [];
    process.stdout.write(`\r區域資料 ${index + 1}/${districtLinks.length}`);
    return {
      id: slug(link.pageId), pageId: link.pageId, name: titleFromHtml(html) || link.name,
      en: districtEnglish.get(link.pageId) || "", icon,
      description: descriptionFromHtml(html) || "城市可生產的區域。",
      effects: flattenGroups(traits, ["取代者", "鄰接地域加成", "公民收益（每位公民）", "貿易收益", "國內目的地", "國際目的地"]).concat(replacementValues.filter((value) => !districtNames.has(value))),
      adjacency: traits["鄰接地域加成"] || [],
      citizenYields: traits["公民收益（每位公民）"] || [],
      tradeYields: [].concat(traits["國內目的地"] || [], traits["國際目的地"] || []),
      replacedBy: replacementValues.filter((value) => districtNames.has(value)),
      replaces: [].concat(traits["取代"] || [], traits["替代"] || []),
      requirements: requirementSummary(requirements),
      placement: districtAdvice[link.pageId] || null
    };
  });
  process.stdout.write("\n");
  for (const district of districts) {
    if (district.icon === "icon_district_water_street_carnival.png") district.icon = "icon_district_street_carnival.png";
  }

  const replacedNameToBase = new Map();
  for (const district of districts) for (const name of district.replacedBy) replacedNameToBase.set(name, district);
  for (const district of districts) {
    const base = replacedNameToBase.get(district.name);
    district.unique = Boolean(base);
    district.baseDistrictId = base ? base.id : "";
    if (!district.placement && base && base.placement) district.placement = {
      best: `這是${base.name}的特色替代區域。先依本卡列出的實際相鄰加成選址；基礎規劃可參考：${base.placement.best}`,
      target: `特色區域通常成本更低或附帶額外效果。${base.placement.target}`
    };
    if (!district.placement) district.placement = {
      best: district.adjacency.length ? `依相鄰加成逐格比較：${district.adjacency.slice(0, 3).join("；")}` : "此區域沒有需要追逐的標準產出相鄰，先滿足放置條件並避免佔用高產地塊。",
      target: "先確認區域的全局功能、人口上限與後續建築，再選不妨礙主要區域群的位置。"
    };
  }

  const buildings = await mapConcurrent(buildingLinks, 12, async (link, index) => {
    const html = await fetchText(`${site}${link.href}`);
    const traits = panel(html, "特點");
    const requirements = panel(html, "要求");
    const district = buildingDistrict.get(link.pageId) || { pageId: "", name: "其他" };
    const icon = iconFromHtml(html, "building");
    const replacementValues = traits["取代者"] || [];
    process.stdout.write(`\r建築資料 ${index + 1}/${buildingLinks.length}`);
    const item = {
      id: slug(link.pageId), pageId: link.pageId, name: titleFromHtml(html) || link.name,
      en: buildingEnglish.get(link.pageId) || "", icon,
      districtPageId: district.pageId, districtId: district.pageId ? slug(district.pageId) : "other", districtName: district.name,
      description: descriptionFromHtml(html),
      effects: flattenGroups(traits, ["取代者"]).concat(replacementValues.filter((value) => !buildingNames.has(value))),
      replacedBy: replacementValues.filter((value) => buildingNames.has(value)),
      requirements: requirementSummary(requirements)
    };
    item.tip = genericBuildingTip(item);
    return item;
  });
  process.stdout.write("\n");

  const buildingReplacements = new Set(buildings.flatMap((building) => building.replacedBy));
  for (const building of buildings) building.unique = buildingReplacements.has(building.name);

  const iconDir = path.join(root, "assets", "game-icons", "infrastructure");
  const icons = Array.from(new Set(districts.concat(buildings).map((item) => item.icon).filter(Boolean)));
  await mapConcurrent(icons, 12, async (icon, index) => {
    await download(`${staticSite}/${icon}`, path.join(iconDir, icon));
    process.stdout.write(`\r遊戲圖像 ${index + 1}/${icons.length}`);
  });
  process.stdout.write("\n");

  const output = {
    meta: {
      title: "區域與建築", ruleset: "Gathering Storm", districtCount: districts.length,
      buildingCount: buildings.length,
      description: "城市生產選單中的區域與建築，包含效果、解鎖需求、成本與區域選址。"
    },
    districtRules: [
      { title: "人口限制", detail: "一般專業區域在 1、4、7 人口時分別開放第 1、2、3 個名額，之後每增加 3 人口再多一個。水渠、社區、運河、水壩與太空中心等不計入此上限。" },
      { title: "三環限制", detail: "區域必須建在城市中心三格內。放下區域會鎖定當下生產成本，重要的高相鄰位置可先落區再暫停建造。" },
      { title: "相鄰加成", detail: "區域卡片列出的相鄰值會先成為基礎產出，再被政策卡、建築或文明能力放大；高相鄰區域應優先集中於勝利主線。" },
      { title: "先規劃再收穫", detail: "區域會永久覆蓋地塊。若地塊有樹林、雨林或可收穫資源，先用建造者收穫，再放置區域，通常能避免浪費。" }
    ],
    districts,
    buildings
  };
  fs.writeFileSync(path.join(root, "data", "infrastructure.json"), JSON.stringify(output, null, 2) + "\n", "utf8");
  console.log(`完成：${districts.length} 個區域、${buildings.length} 棟建築、${icons.length} 枚遊戲圖像。`);
}

main().catch((error) => { console.error(error); process.exit(1); });
