#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "assets/app.js"), "utf8");
const bundle = fs.readFileSync(path.join(root, "assets/data.bundle.js"), "utf8");
const styles = fs.readFileSync(path.join(root, "assets/styles.css"), "utf8");

assert.match(index, /assets\/data\.bundle\.js/);
assert.match(index, /assets\/app\.js/);
assert.match(index, /assets\/civ6-app-icon\.png/);
assert.ok(fs.existsSync(path.join(root, "assets", "civ6-app-icon.png")));
assert.doesNotMatch(index, /type=["']module["']/i);
assert.doesNotMatch(index, /https?:\/\//i);
assert.doesNotMatch(index, /data-nav=["']modes["']/);
assert.doesNotMatch(app, /\bfetch\s*\(/);
assert.doesNotMatch(app, /\bimport\s*\(/);
assert.match(app, /filterEventsBound/);
assert.match(app, /function cleanLeaderFilters\(filters\)/);
assert.doesNotMatch(app, /id="filter-victory"/);
assert.doesNotMatch(app, /id="filter-grade"/);
assert.doesNotMatch(app, /id="filter-progress"/);
assert.doesNotMatch(app, /state\.filters\.(victory|grade|progress)/);
assert.match(app, /document\.addEventListener\("change"/);
assert.match(app, /function animateDetails\(details, shouldOpen\)/);
assert.match(app, /window\.matchMedia\("\(prefers-reduced-motion: reduce\)"\)/);
assert.match(app, /details\.animate\(\[/);
assert.match(app, /data-details-animating/);
assert.match(app, /function cancelDetailsAnimations\(details\)/);
assert.match(app, /details\.getAnimations\(\)/);
assert.match(app, /animation\.cancel\(\)/);
assert.doesNotMatch(app, /fill: "both"/);
assert.match(app, /event\.target\.closest\("summary"\)/);
assert.match(app, /data-resource-type/);
assert.match(app, /military: "agoge\.png"/);
assert.match(app, /data-policy-category/);
assert.match(app, /data-belief-category/);
assert.match(app, /data-great-person-class/);
assert.doesNotMatch(app, /great-person-effect-preview/);
assert.match(app, /class="great-people-controls"><div class="people-class-filters"[\s\S]*?<div class="people-era-filter"/);
assert.match(app, /data-infrastructure-kind/);
assert.doesNotMatch(app, /id="(?:leader|basics|infrastructure|government|religion|people|governor)-query"/);
assert.doesNotMatch(app, /type="search"/);
assert.equal((index.match(/type="search"/g) || []).length, 1);
assert.match(index, /id="global-search"/);
assert.match(app, /function routeWithSearchHighlight\(route, query\)/, "搜尋關鍵字可寫入目標網址");
assert.match(app, /function applyRouteSearchHighlights\(\)/, "目標頁支援正文高亮");
assert.match(app, /<mark class="search-highlight">/, "搜尋結果使用語意化 mark 標記");
assert.match(app, /function createRouteSearchNavigator\(query\)/, "多個命中會建立頁面尋找工具列");
assert.match(app, /id="route-search-match-select"/, "使用者可從彙總選單選擇命中位置");
assert.match(app, /search-match-prev/, "頁面尋找支援上一個命中");
assert.match(app, /search-match-next/, "頁面尋找支援下一個命中");
assert.match(app, /event\.key === "F3" && routeSearchMatches\.length/, "頁面尋找支援 F3 鍵盤切換");
assert.match(styles, /\.search-highlight \{/, "搜尋高亮具有獨立視覺樣式");
assert.match(styles, /\.route-search-navigator \{/, "頁面尋找工具列具有響應式樣式");
assert.match(styles, /prefers-reduced-motion: reduce[\s\S]*?\.search-highlight-root \.search-highlight \{ animation: none;/, "高亮動效遵守減少動態偏好");
assert.match(app, /id="leader-results-count" role="status" aria-live="polite"/);
assert.match(app, /id="leader-results"/);
const leaderFilterBindingSource = app.slice(app.indexOf("  function bindFilterEvents"), app.indexOf("  function toggleFavorite"));
assert.match(leaderFilterBindingSource, /renderLeadersPage\(favoritesOnly\)/);
assert.doesNotMatch(leaderFilterBindingSource, /query/);
assert.doesNotMatch(app, /function refreshBasicsResults\(section\)/);
assert.doesNotMatch(app, /function bindStableBasicsQuery\(/);
assert.match(app, /persistentBasicsControlSelector\(section\)/);
assert.doesNotMatch(app, /setSelectionRange/);
assert.match(app, /function animateMajorSection\(section\)/);
assert.match(app, /transform: "translateX\(" \+ \(direction \* 24\) \+ "px\)"/);
assert.match(app, /animateMajorSection\(majorSectionForRoute\(parts\)\)/);
assert.match(app, /main\.dataset\.lens = majorSection === "guide" \|\| majorSection === "wiki" \? majorSection : "home"/);
assert.match(app, /<details class="terrain-card"/);
assert.match(app, /<summary><div class="terrain-card-head">/);
assert.match(app, /<details class="resource-card resource-/);
assert.match(app, /<details class="improvement-card"/);
assert.match(app, /class="improvement-expand"/);
assert.match(app, /function renderImprovementEffect\(value\)/);
assert.match(app, /"住房": "housing"/);
assert.match(app, /"宜居度": "amenities"/);
assert.match(app, /"旅遊": "tourism"/);
assert.match(app, /"電力": "power"/);
assert.doesNotMatch(app, /"魅力": "appeal"/);
assert.match(app, /class="improvement-metric-icon"/);
assert.match(app, /class="improvement-metric-name"/);
assert.match(app, /class="improvement-yield-icon"/);
assert.match(app, /numericAmount > 0 \? "positive"/);
assert.match(app, /numericAmount < 0 \? "negative"/);
const improvementRendererSource = app.slice(app.indexOf("  function renderImprovementEffect"), app.indexOf("  function renderTerrainCard"));
const improvementRendererContext = {};
vm.createContext(improvementRendererContext);
vm.runInContext('function escapeHtml(value) { return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }\n' + improvementRendererSource, improvementRendererContext);
const improvementEffects = [
  improvementRendererContext.renderImprovementEffect("+1 食物、+0.5 住房"),
  improvementRendererContext.renderImprovementEffect("+2 產能，鄰格魅力 -1"),
  improvementRendererContext.renderImprovementEffect("+2 金幣；奢侈資源可提供宜居度"),
  improvementRendererContext.renderImprovementEffect("+1 科技，提供 4 電力"),
  improvementRendererContext.renderImprovementEffect("旅遊等於地塊魅力")
].join("\n");
for (const file of ["food.png", "housing.png", "production.png", "gold.png", "amenities.png", "science.png", "power.png", "tourism.png"]) {
  assert.match(improvementEffects, new RegExp(file.replace(".", "\\.")), `rendered ${file}`);
}
assert.match(improvementEffects, /鄰格魅力/);
assert.match(improvementEffects, /class="improvement-metric-name">魅力<\/span>/);
assert.doesNotMatch(improvementEffects, /appeal\.svg/);
assert.match(improvementEffects, /is-positive/);
assert.match(improvementEffects, /is-negative/);
assert.doesNotMatch(improvementEffects, /undefined\.(?:png|svg)/);
assert.match(app, /renderYieldGroup\(\[item\.yield\]\)/);
assert.match(app, /function renderYieldGroup\(values\)/);
assert.match(app, /renderYieldGroup\(item\.yields\)/);
assert.match(app, /var tokens = \[\]/);
assert.match(app, /function renderInlineYields\(value\)/);
assert.match(app, /function renderTerrainResources\(resourceNames\)/);
assert.match(app, /class="terrain-resource-chip"/);
assert.match(app, /class="inline-yield-term"/);
assert.match(app, /typeLabels = \{ page: "章節", leader: "領袖"/);
assert.doesNotMatch(app, /<small>' \+ \(item\.lens === "guide" \? "攻略" : "Wiki"\) \+ '<\/small>/);
assert.match(index, /class="search-trigger-label">全站搜尋<\/span>/);
assert.match(styles, /\.result-lens, \.result-kind \{/);
assert.match(styles, /\.terrain-resource-list \{/);
const inlineYieldSource = app.slice(app.indexOf("  function renderInlineYields"), app.indexOf("  function renderTerrainResources"));
const inlineYieldContext = {};
vm.createContext(inlineYieldContext);
vm.runInContext('function escapeHtml(value) { return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }\n' + inlineYieldSource, inlineYieldContext);
const decisionYieldText = inlineYieldContext.renderInlineYields("人口集中在 2 食物但沒有產能的地塊");
assert.match(decisionYieldText, /food\.png/);
assert.match(decisionYieldText, /production\.png/);
assert.doesNotMatch(decisionYieldText, />食物</);
assert.doesNotMatch(decisionYieldText, />產能</);
assert.match(app, /data-operator="\+">地貌/);
assert.match(app, /data-operator="=">最終產出/);
assert.match(app, /#\/basics\/mode\//);
assert.match(app, /policy-category-filters/);
assert.match(app, /belief-category-filters/);
assert.match(app, /class="government-policy-controls"><div class="policy-category-filters"[\s\S]*?<div class="catalog-filter-actions"/);
assert.match(app, /class="religion-belief-controls"><div class="belief-category-filters"[\s\S]*?<div class="catalog-filter-actions"/);
assert.match(app, /id: "unique-building", label: "文明特色建築"/);
assert.match(app, /id: "unique-district", label: "文明特色區域"/);
assert.match(app, /id: "district", label: "通用區域"/);
assert.match(app, /id: "building", label: "通用建築"/);
assert.match(app, /id: "project", label: "城市項目"/);
assert.match(app, /function renderProjectCard\(project\)/);
assert.match(app, /function renderProjectCatalog\(items\)/);
assert.match(app, /function infrastructureDistrictForProject\(\) \{[\s\S]*?district\.id === "district-city-center"/);
assert.doesNotMatch(app, /function infrastructureDistrictForProject\(project\)/);
assert.match(app, /renderInfrastructureList\("完成時獲得"/);
assert.match(app, /label: "地形地貌與改良"/);
assert.doesNotMatch(app, /id: "improvements", label: "建造者改良"/);
assert.match(app, /kind === "unique-building"/);
assert.match(app, /kind === "unique-district"/);
assert.match(app, /function isCivilizationUniqueDistrict\(district\)/);
assert.match(app, /function isCivilizationUniqueBuilding\(building\)/);
assert.match(app, /\["舊神方尖碑", "金箔寶庫", "鍊金術會所"\]/);
assert.doesNotMatch(app, /class="infrastructure-preview"/);
assert.match(app, /renderInfrastructureList\("完整相鄰加成"/);
assert.match(app, /renderInfrastructureList\("具體加成"/);
assert.match(app, /<details class="government-card"/);
assert.match(app, /<details class="governor-card"/);
assert.match(fs.readFileSync(path.join(root, "assets/styles.css"), "utf8"), /\.policy-category-filters \{ display: grid; grid-template-columns: repeat\(4/);
assert.match(fs.readFileSync(path.join(root, "assets/styles.css"), "utf8"), /\.belief-category-filters \{ display: grid; grid-template-columns: repeat\(3/);
assert.match(styles, /\.filters \{ position: sticky; top: calc\(var\(--header-height\) \+ 88px\)/);
assert.match(styles, /\.basics-sticky-controls \{ position: sticky; top: var\(--header-height\);/);
assert.match(styles, /\.basics-sticky-controls > \.basics-filter,[\s\S]*?\.basics-sticky-controls > \.great-people-controls \{ position: static;/);
assert.match(styles, /\.catalog-filter-actions \{ display: flex; justify-content: end;/);
assert.match(styles, /\.people-era-filter \{ display: grid; grid-template-columns:/);
assert.match(styles, /\.policy-category-filters, \.belief-category-filters \{ gap: 7px; margin: 0;/);
assert.doesNotMatch(styles, /\.policy-category-filters, \.belief-category-filters \{ position: sticky/);
assert.match(styles, /\.people-class-filters \{ display: grid; grid-template-columns: repeat\(6/);
assert.doesNotMatch(styles, /\.great-person-effect-preview/);
assert.match(styles, /\.basics-tabs \{[^}]*display: grid; grid-template-columns: repeat\(4, minmax\(0, 1fr\)\);/);
assert.match(styles, /\.basics-sticky-controls \.basics-tabs \{ position: static;/);
assert.doesNotMatch(styles, /\.basics-tabs \{ grid-template-columns: repeat\(20, minmax\(0, 1fr\)\); \}/);
assert.doesNotMatch(styles, /\.basics-tab:nth-last-child\(-n \+ 4\) \{ grid-column: span 5; \}/);
assert.doesNotMatch(styles, /\.basics-tabs \{ display: flex; overflow-x: auto/);
assert.match(styles, /\.basics-sticky-controls\.sticky-limit-exceeded \{ position: relative; top: auto; \}/);
assert.match(styles, /\.basics-sticky-controls\.sticky-limit-exceeded \.basics-tab strong \{\s+font-size: var\(--font-body\);/);
assert.match(styles, /\.basics-sticky-controls\.sticky-limit-exceeded \.basics-tab span \{\s+font-size: var\(--font-small\);/);
assert.match(styles, /\.primary-nav::before, \.mobile-nav::before, \.basics-tabs::before/);
assert.match(app, /function positionSlidingIndicator\(container, item\)/);
assert.match(app, /headerHeight \+ stackHeight > window\.innerHeight \* \.4/);
assert.match(styles, /\.infrastructure-kind-filters \{ display: grid; grid-template-columns: repeat\(3/);
assert.doesNotMatch(styles, /\.infrastructure-search \{/);
assert.match(app, /role="toolbar" aria-label="區域、建築與城市項目篩選">' \+ kindButtons \+/);
assert.doesNotMatch(app, /data-infrastructure-filter="group"/);
assert.doesNotMatch(app, /aria-label="所屬區域"/);
assert.match(styles, /@media \(max-width: 900px\)[\s\S]*?\.infrastructure-kind-filters \{ grid-template-columns: repeat\(2/);
assert.match(styles, /\.government-card summary \{ position: relative;/);
assert.match(styles, /\.government-card\[open\] summary::after \{ content: "−"; \}/);
assert.match(styles, /\.governor-card > summary \{ position: relative;/);
assert.match(styles, /\.governor-card\[open\] > summary::after \{ content: "−"; \}/);
assert.match(styles, /\.policy-grid \{ display: grid; grid-template-columns: repeat\(2/);
assert.match(styles, /\.religion-choice-grid \{ display: grid; grid-template-columns: repeat\(2/);
assert.match(styles, /\.belief-grid \{ display: grid; grid-template-columns: repeat\(2/);
assert.match(styles, /\.great-person-grid \{ display: grid; grid-template-columns: repeat\(2/);
assert.match(styles, /@media \(max-width: 680px\)[\s\S]*?\.infrastructure-kind-filters \{ grid-template-columns: repeat\(2/);
assert.doesNotMatch(styles, /\.infrastructure-kind-filters \.infrastructure-kind-button:last-child \{ grid-column: 1 \/ -1; \}/);
assert.match(styles, /\.infrastructure-card summary \{ position: relative; min-height: 112px;/);
assert.doesNotMatch(styles, /\.infrastructure-preview \{/);
assert.match(styles, /\.terrain-card summary \{ min-height: 102px;/);
assert.match(styles, /\.terrain-card\[open\] \.terrain-expand::before, \.resource-card\[open\] \.resource-expand::before, \.improvement-card\[open\] \.improvement-expand::before \{ content: "−"; \}/);
assert.match(styles, /\.resource-card summary \{ min-height: 112px;/);
assert.match(styles, /\.resource-card\[open\] summary \{/);
assert.match(styles, /\.resource-summary-yield \.yield-group \{ color: var\(--text\); \}/);
assert.match(styles, /\.resource-grid \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\); gap: 10px; \}/);
assert.match(styles, /\.improvement-grid \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\); gap: 10px; \}/);
assert.match(styles, /\.improvement-card summary \{ height: 196px; min-height: 196px;[^}]*align-items: stretch;/);
assert.match(styles, /\.improvement-summary \{[^}]*grid-template-rows: auto minmax\(56px, auto\) minmax\(62px, 1fr\);/);
assert.match(styles, /\.improvement-card summary > \.improvement-expand \{ align-self: center; \}/);
assert.match(styles, /--font-body: clamp\(16px,/);
assert.match(styles, /--surface-card: rgba\(/);
assert.match(styles, /--shadow-1:/);
assert.match(styles, /#main-content\[data-lens="wiki"\] \.basics-tabs/);
assert.doesNotMatch(styles, /background-attachment:\s*fixed/);
assert.match(styles, /\.builder-priority li \{[^}]*grid-template-columns: clamp\(36px, 3\.2vw, 46px\)/);
assert.match(styles, /\.improvement-preview \{[^}]*font-size: var\(--font-body\);/);
assert.match(styles, /\.policy-effect p,[\s\S]*?\.great-person-ability p,[\s\S]*?font-size: var\(--font-body\);/);
assert.match(styles, /\.leader-grid \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\); gap: 10px; \}/);
assert.match(styles, /@media \(max-width: 480px\) \{\s+\.leader-grid, \.resource-grid, \.improvement-grid \{ grid-template-columns: 1fr; \}/);
assert.match(styles, /\.leader-card,[\s\S]*?\.mode-mini \{\s+contain: layout paint;/);
assert.match(styles, /@media \(max-width: 900px\)[\s\S]*?\.mobile-nav \{[^}]*grid-template-columns: repeat\(3, 1fr\);/);
assert.match(styles, /\.mobile-nav a, \.mobile-nav button \{[^}]*font-size: var\(--font-small\);/);
assert.match(app, /function warmRouteImages\(\)/);
assert.match(app, /image\.loading = "eager"/);
assert.match(app, /if \(index < 10\)/);
assert.match(app, /image\.loading = "lazy"/);
assert.match(app, /function renderGuidePage\(section\)/);
assert.match(app, /function renderDecisionGuide\(\)/);
assert.match(app, /function renderProgressionGuide\(\)/);
assert.match(app, /function renderCombatGuide\(\)/);
assert.match(app, /function renderSystemsGuide\(\)/);
assert.match(app, /function renderTileCalculator\(\)/);
assert.match(app, /function renderAdjacencyCalculator\(\)/);
assert.match(app, /function syncFilterRoute\(\)/);
assert.match(styles, /@supports \(content-visibility: auto\)/);
assert.match(app, /if \(navResizeFrame\) cancelAnimationFrame\(navResizeFrame\)/);
assert.match(index, /<a href="#\/guide" data-nav="guide">攻略<\/a>/);
assert.match(index, /<a href="#\/wiki" data-nav="wiki">Wiki<\/a>/);
assert.match(index, /class="search-scope"/);
assert.match(app, /function renderHomePage\(\)/);
assert.match(app, /function renderGuideHub\(\)/);
assert.match(app, /function renderWikiHub\(\)/);
assert.match(app, /function canonicalRoute\(route\)/);
assert.match(app, /function renderVictoryHub\(routeId\)/);
assert.match(styles, /\.dual-portals,/);
assert.match(styles, /\.content-lens \{/);
const canonicalRouteSource = app.slice(app.indexOf("  function canonicalRoute"), app.indexOf("  function normalizeLegacyHash"));
const canonicalContext = {};
vm.createContext(canonicalContext);
vm.runInContext(canonicalRouteSource, canonicalContext);
assert.equal(canonicalContext.canonicalRoute("#/leaders"), "#/guide/leaders");
assert.equal(canonicalContext.canonicalRoute("#/leader/lady-six-sky/science"), "#/guide/leader/lady-six-sky/science");
assert.equal(canonicalContext.canonicalRoute("#/basics/infrastructure?focus=campus"), "#/wiki/infrastructure?focus=campus");
assert.equal(canonicalContext.canonicalRoute("#/guide/victories/culture"), "#/guide/victories/culture");
assert.doesNotMatch(index, /<nav class="mobile-nav"[\s\S]*?<button class="search-trigger"/);
assert.match(styles, /\.yield-game-icon \{/);
assert.match(styles, /\.yield-token \+ \.yield-token \{/);
assert.match(styles, /\.tile-formula \{ width: 100%;[^}]*grid-template-columns: repeat\(5, minmax\(0, 1fr\)\);[^}]*gap: 0;[^}]*overflow: hidden;/);
assert.match(styles, /\.tile-formula > :nth-child\(5\) \{ --formula-color:/);
assert.match(styles, /\.tile-formula span, \.tile-formula strong \{[^}]*font-size: clamp\(12px, 1\.15vw, 15px\);/);
assert.match(styles, /\.tile-formula \[data-operator\]::before \{[^}]*position: absolute;[^}]*left: 0;[^}]*transform: translate\(-50%, -50%\);/);
assert.doesNotMatch(styles, /\.tile-formula span, \.tile-formula strong \{[^}]*border-left:/);
assert.match(styles, /\.improvement-effect-token\.is-positive \{ color: var\(--positive\); \}/);
assert.match(styles, /\.improvement-effect-token\.is-negative \{ color: var\(--negative\); \}/);
assert.match(styles, /details\[data-details-animating\] \{ contain: layout; \}/);
assert.doesNotMatch(styles, /\.tile-formula b \{ display: none; \}/);
assert.match(app, /function consolidateBasicsStickyControls\(section\)/);
assert.match(app, /class="basics-sticky-controls">/);
assert.match(app, /new ResizeObserver\(syncHeight\)/);

const context = { window: {} };
vm.createContext(context);
vm.runInContext(bundle, context, { filename: "data.bundle.js" });
const data = context.window.CIV6_DATA;

assert.equal(data.leaders.length, 74);
assert.equal(data.modes.length, 8);
assert.ok(data.basics);
assert.equal(data.basics.resources.length, 46);
assert.equal(data.basics.terrains.length, 25);
assert.equal(data.basics.improvements.length, 18);
assert.ok(data.governments);
assert.equal(data.governments.governments.length, 13);
assert.equal(data.governments.policies.length, 157);
assert.equal(data.governments.categories.length, 7);
assert.ok(data.religions);
assert.equal(data.religions.religions.length, 12);
assert.equal(data.religions.beliefs.length, 59);
assert.equal(data.religions.categories.length, 5);
assert.ok(data.people);
assert.equal(data.people.classes.length, 10);
assert.equal(data.people.people.length, 212);
assert.equal(data.people.governors.length, 8);
assert.equal(data.people.governors.reduce((sum, governor) => sum + governor.promotions.length, 0), 48);
assert.ok(data.infrastructure);
assert.ok(data.handbook);
assert.equal(data.handbook.decisions.length, 8);
assert.equal(data.handbook.progression.eras.length, 8);
assert.equal(data.handbook.combat.classes.length, 10);
assert.equal(data.handbook.systems.length, 10);
assert.equal(data.infrastructure.districts.length, 35);
assert.equal(data.infrastructure.buildings.length, 85);
assert.equal(data.infrastructure.projects.length, 45);
assert.equal(data.meta.projectCount, 45);
assert.ok(data.infrastructure.projects.some((item) => item.name === "工業區物流"));
assert.ok(data.infrastructure.projects.some((item) => item.name === "碳捕獲"));
assert.ok(data.infrastructure.projects.some((item) => item.name === "港口運輸"));
assert.equal(data.infrastructure.districts.filter((item) => item.unique).length, 16);
assert.equal(data.infrastructure.districts.filter((item) => !item.unique).length, 19);
const societyBuildings = ["舊神方尖碑", "金箔寶庫", "鍊金術會所"];
const civilizationUniqueBuildings = data.infrastructure.buildings.filter((item) => item.unique && !societyBuildings.includes(item.name));
assert.equal(civilizationUniqueBuildings.length, 16);
assert.equal(data.infrastructure.buildings.length - civilizationUniqueBuildings.length, 69);
assert.equal(data.infrastructure.buildings.find((item) => item.name === "女王圖書館").unique, true);
assert.equal(data.infrastructure.buildings.find((item) => item.name === "工作坊").unique, false);
for (const file of ["food.png", "production.png", "gold.png", "science.png", "culture.png", "faith.png", "housing.png", "amenities.png", "tourism.png", "power.png", "appeal.svg"]) {
  assert.ok(fs.existsSync(path.join(root, "assets", "game-icons", "yields", file)), `yield icon/${file}`);
}
assert.ok(data.searchIndex.some((item) => item.type === "resource" && item.title === "香蕉"));
assert.ok(data.searchIndex.some((item) => item.type === "government" && item.title === "法西斯主義"));
assert.ok(data.searchIndex.some((item) => item.type === "policy" && item.title === "斯巴達教育"));
assert.ok(data.searchIndex.some((item) => item.type === "religion" && item.title === "佛教"));
assert.ok(data.searchIndex.some((item) => item.type === "belief" && item.title === "極光之舞"));
assert.ok(data.searchIndex.some((item) => item.type === "great-person" && item.title === "以撒·牛頓"));
assert.ok(data.searchIndex.some((item) => item.type === "governor" && item.title === "平加拉"));
assert.ok(data.searchIndex.some((item) => item.type === "governor-promotion"));
assert.ok(data.searchIndex.some((item) => item.type === "district" && item.title === "學院"));
assert.ok(data.searchIndex.some((item) => item.type === "building" && item.title === "紀念碑"));
assert.ok(data.searchIndex.some((item) => item.type === "project" && item.title === "工業區物流"));
assert.ok(data.searchIndex.some((item) => item.type === "guide" && item.title === "城市忠誠度下降"));
assert.ok(data.searchIndex.some((item) => item.type === "guide" && item.title === "攻城單位"));
assert.ok(data.searchIndex.filter((item) => item.type === "improvement").every((item) => item.route.startsWith("#/wiki/terrain")));
assert.ok(data.searchIndex.filter((item) => item.type === "mode").every((item) => item.route.startsWith("#/wiki/mode/")));
assert.ok(data.searchIndex.filter((item) => item.type === "leader").every((item) => item.route.startsWith("#/guide/leader/")));
assert.ok(data.searchIndex.some((item) => item.type === "system" && item.route.startsWith("#/wiki/systems")));
assert.equal(data.governments.policies.find((item) => item.id === "craftsmen").category, "military");
assert.equal(data.governments.policies.find((item) => item.id === "resource-management").category, "military");
for (const item of data.basics.resources) {
  assert.ok(fs.existsSync(path.join(root, "assets", "game-icons", "resources", `${item.id}.png`)), `resource icon/${item.id}.png`);
}
for (const item of data.basics.terrains) {
  assert.ok(fs.existsSync(path.join(root, "assets", "game-icons", "terrain", `${item.id}.png`)), `terrain icon/${item.id}.png`);
}
for (const item of data.basics.improvements) {
  assert.ok(fs.existsSync(path.join(root, "assets", "game-icons", "improvements", `${item.id}.png`)), `improvement icon/${item.id}.png`);
}
for (const policy of data.governments.policies) {
  assert.ok(policy.effect && policy.unlock && policy.category, `policy fields/${policy.id}`);
  assert.ok(fs.existsSync(path.join(root, "assets", "game-icons", "policies", policy.icon)), `policy icon/${policy.icon}`);
}
for (const religion of data.religions.religions) {
  assert.ok(fs.existsSync(path.join(root, "assets", "game-icons", "religions", religion.icon)), `religion icon/${religion.icon}`);
}
for (const belief of data.religions.beliefs) {
  assert.ok(belief.effect && belief.category, `belief fields/${belief.id}`);
  assert.ok(fs.existsSync(path.join(root, "assets", "game-icons", "beliefs", belief.icon)), `belief icon/${belief.icon}`);
}
for (const personClass of data.people.classes) {
  assert.ok(fs.existsSync(path.join(root, "assets", "game-icons", "people", personClass.icon)), `great person class icon/${personClass.icon}`);
}
for (const person of data.people.people) {
  assert.ok(person.name && person.en && person.era && person.classId, `great person fields/${person.id}`);
  assert.ok(Array.isArray(person.abilities) && person.abilities.length > 0, `great person ability/${person.id}`);
}
for (const governor of data.people.governors) {
  assert.ok(fs.existsSync(path.join(root, "assets", "game-icons", "people", governor.icon)), `governor portrait/${governor.icon}`);
  assert.equal(governor.promotions.length, 6, `governor promotions/${governor.id}`);
  for (const promotion of governor.promotions) assert.ok(promotion.name && promotion.effect, `governor promotion/${governor.id}/${promotion.id}`);
}
const campus = data.infrastructure.districts.find((item) => item.name === "學院");
assert.ok(campus.adjacency.some((line) => line.includes("地熱裂隙")));
assert.ok(campus.adjacency.some((line) => line.includes("礁石")));
assert.match(campus.placement.target, /\+3/);
assert.match(campus.placement.target, /\+4/);
const encampment = data.infrastructure.districts.find((item) => item.name === "營地");
assert.match(encampment.placement.best, /不能緊鄰城市中心/);
const monument = data.infrastructure.buildings.find((item) => item.name === "紀念碑");
assert.ok(monument.effects.some((line) => line.includes("文化值")));
const barracks = data.infrastructure.buildings.find((item) => item.name === "兵營");
assert.ok(barracks.effects.some((line) => line.includes("住房")));
for (const item of [...data.infrastructure.districts, ...data.infrastructure.buildings]) {
  assert.ok(item.name && item.en && item.icon && item.requirements.length, `infrastructure fields/${item.id}`);
  assert.ok(fs.existsSync(path.join(root, "assets", "game-icons", "infrastructure", item.icon)), `infrastructure icon/${item.icon}`);
}
for (const leader of data.leaders) {
  assert.ok(Array.isArray(leader.civIcons) && leader.civIcons.length > 0, `${leader.id}/civIcons`);
  for (const icon of leader.civIcons) assert.ok(fs.existsSync(path.join(root, "assets", "civ-icons", `${icon}.webp`)), `${leader.id}/${icon}.webp`);
  assert.equal(Object.keys(leader.routes).length, 6, leader.id);
  for (const route of Object.values(leader.routes)) {
    assert.equal(Object.keys(route.stages).length, 4, `${leader.id}/${route.id}`);
    for (const stage of Object.values(route.stages)) {
      for (const key of ["strategy", "techs", "civics", "policies", "districts", "wonders", "queue", "checklist"]) {
        assert.ok(Array.isArray(stage[key]) && stage[key].length > 0, `${leader.id}/${route.id}/${stage.id}/${key}`);
      }
    }
  }
}

console.log("冒煙測試通過：離線依賴、領袖路線、新手導覽、35 個區域、85 棟建築、45 種城市項目模板、8 種遊戲模式、13 種政體、157 張政策卡、12 種宗教、59 種信條、212 位偉人、8 位總督與搜尋結構均正確。");
