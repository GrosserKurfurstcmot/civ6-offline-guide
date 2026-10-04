#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "assets/app.js"), "utf8");
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures/governor-trees.json"), "utf8"));
const source = JSON.parse(fs.readFileSync(path.join(root, "data/people.json"), "utf8"));
const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, "assets/data.bundle.js"), "utf8"), context);
const DATA = context.window.CIV6_DATA;

// Verify each named skill, not just row counts: swapping skills must fail this check.
assert.equal(fixture.promotions.length, 48);
for (const reference of fixture.promotions) {
  for (const dataset of [source, DATA.people]) {
    const governor = dataset.governors.find((item) => item.id === reference.governor);
    const promotion = governor.promotions.find((item) => item.id === reference.id);
    assert.ok(promotion, `${reference.governor}/${reference.id} exists`);
    assert.equal(promotion.level, reference.level, `${reference.id} level`);
    assert.deepEqual(Array.from(promotion.requires).sort(), reference.requires.slice().sort(), `${reference.id} prerequisites`);
  }
}

const from = app.indexOf("  function renderPromotionRow(");
const to = app.indexOf("  function renderPeopleEmpty(", from);
assert.ok(from >= 0 && to > from);
const renderContext = { DATA, escapeHtml: (value) => String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;") };
vm.createContext(renderContext);
vm.runInContext(app.slice(from, to), renderContext);

for (const governor of DATA.people.governors) {
  const card = renderContext.renderGovernorCard(governor);
  const table = renderContext.renderPromotionTable(governor);
  assert.equal((table.match(/<tr class="governor-skill-row"/g) || []).length, 6, `${governor.id} has all six rows`);
  assert.match(table, /<th scope="col">名稱<\/th><th scope="col">效果<\/th>/);
  assert.equal((table.match(/class="governor-base-label"/g) || []).length, 1, "one base ability per governor");
  assert.doesNotMatch(card, /第 [0-9] 級|前置|promotion-tier|promotion-tree|技能分層|→/, "no hierarchy in the flat table");
  for (const promotion of governor.promotions) {
    const row = renderContext.renderPromotionRow(governor, promotion);
    assert.ok(row.includes(`id="promotion-${governor.id}-${promotion.id}"`), "keep search targets");
    assert.ok(row.includes(renderContext.escapeHtml(promotion.name)), "Chinese name retained");
    assert.ok(row.includes(renderContext.escapeHtml(promotion.en)), "English name retained");
    assert.ok(row.includes(renderContext.escapeHtml(promotion.effect)), "full effect retained");
    assert.equal(row.includes("基本能力"), promotion.level === 0);
    const entry = DATA.searchIndex.find((item) => item.type === "governor-promotion" && item.id === `${governor.id}-${promotion.id}`);
    assert.doesNotMatch(entry.subtitle, /第 [0-9] 級|前置/);
    assert.ok(entry.route.endsWith(`focus=promotion-${governor.id}-${promotion.id}`));
    assert.ok(entry.subtitle.includes(promotion.level === 0 ? "基本能力" : "晉升技能"));
  }
}
const guide = renderContext.renderGovernorsGuide();
assert.equal((guide.match(/<table class="governor-skill-table"/g) || []).length, 8, "all governors use the table");
assert.doesNotMatch(guide, /第 [0-9] 級|前置|升級樹|技能分層|→/);
const styles = fs.readFileSync(path.join(root, "assets/styles.css"), "utf8");
assert.match(styles, /\.governor-skill-table \{[^}]*width: 100%;[^}]*table-layout: fixed/);
assert.match(styles, /\.governor-skill-table th, \.governor-skill-table td \{[^}]*overflow-wrap: anywhere/);
assert.match(styles, /\.governor-skill-name-column \{ width: 38%; \}/);

// Future scraper updates must preserve prerequisites and reject incomplete source pages.
const scraper = fs.readFileSync(path.join(__dirname, "scrape-people.js"), "utf8");
const parserContext = { plainText: (value) => String(value).replace(/<[^>]+>/g, "").trim(), descriptionFromHtml: () => "effect" };
vm.createContext(parserContext);
vm.runInContext(scraper.slice(scraper.indexOf("function promotionDetails("), scraper.indexOf("async function mapConcurrent(")), parserContext);
const details = parserContext.promotionDetails('<div>等級：2</div><p>要求</p><div><img src="https://static.civilopedia.net/images/core/bullet.png"> 鑑賞家</div><div><img src="https://static.civilopedia.net/images/core/bullet.png"> 研究人員</div><p>進展</p><div><img src="https://static.civilopedia.net/images/core/bullet.png"> 策展人</div>');
assert.deepEqual(Array.from(details.requirementNames), ["鑑賞家", "研究人員"]);
assert.equal(details.level, 2);
assert.equal(parserContext.promotionDetails('<div>等級：基礎</div>').level, 0);
assert.throws(() => parserContext.promotionDetails('<div>等級：2</div>'), /缺少前置技能/);
assert.throws(() => parserContext.promotionDetails('<div>未知資料</div>'), /缺少來源層級/);
assert.match(scraper, /requires: details\.requirementNames\.map/);

console.log("總督測試通過：8 位總督共 48 項技能完整呈現為名稱／效果表格，基本能力、中英文名稱、搜尋連結與窄螢幕樣式均正確。");
