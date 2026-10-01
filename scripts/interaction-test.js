#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "assets/app.js"), "utf8");
const styles = fs.readFileSync(path.join(root, "assets/styles.css"), "utf8");
const bundle = fs.readFileSync(path.join(root, "assets/data.bundle.js"), "utf8");
const dataContext = { window: {} };
vm.createContext(dataContext);
vm.runInContext(bundle, dataContext, { filename: "data.bundle.js" });
const DATA = dataContext.window.CIV6_DATA;

function sourceBetween(start, end) {
  const from = app.indexOf(start);
  const to = app.indexOf(end, from);
  assert.ok(from >= 0 && to > from, `找到測試片段：${start}`);
  return app.slice(from, to);
}

function normalize(value) {
  return String(value || "").toLowerCase().replace(/[\s·・.,，。()（）/\-_:：]+/g, "");
}

// 全站只有右上角搜尋對話框含有文字搜尋欄；各目錄只保留分類控制。
const localQueryIds = ["leader", "basics", "infrastructure", "government", "religion", "people", "governor"];
for (const id of localQueryIds) assert.doesNotMatch(app, new RegExp(`id="${id}-query"`), `${id} 頁內搜尋已移除`);
assert.equal((index.match(/type="search"/g) || []).length, 1, "全站只有一個文字搜尋輸入框");
assert.match(index, /id="global-search"/, "右上角全站搜尋保留");

// 模擬全站搜尋涵蓋的資料類型，確認常用關鍵字能命中預期條目。
const searchCases = [
  ["領袖", DATA.leaders, "六日夫人", "六日夫人"],
  ["地形", DATA.basics.terrains, "草原", "草原"],
  ["資源", DATA.basics.resources, "香蕉", "香蕉"],
  ["改良", DATA.basics.improvements, "農場", "農場"],
  ["區域", DATA.infrastructure.districts, "學院", "學院"],
  ["建築", DATA.infrastructure.buildings, "紀念碑", "紀念碑"],
  ["城市項目", DATA.infrastructure.projects, "碳捕獲", "碳捕獲"],
  ["政體", DATA.governments.governments, "法西斯", "法西斯主義"],
  ["政策卡", DATA.governments.policies, "邊界", "邊界"],
  ["宗教", DATA.religions.religions, "佛教", "佛教"],
  ["信條", DATA.religions.beliefs, "極光之舞", "極光之舞"],
  ["偉人", DATA.people.people, "牛頓", "以撒·牛頓"],
  ["總督", DATA.people.governors, "平加拉", "平加拉"]
];
for (const [label, list, query, expected] of searchCases) {
  const matches = list.filter(item => normalize(JSON.stringify(item)).includes(normalize(query)));
  assert.ok(matches.length, `${label}搜尋「${query}」有結果`);
  assert.ok(matches.some(item => item.name === expected), `${label}搜尋命中正確條目`);
}
for (const query of ["忠誠度", "貿易路線", "學院", "碳捕獲", "六日夫人"]) {
  assert.ok(DATA.searchIndex.some(item => normalize(item.text + item.title + item.subtitle).includes(normalize(query))), `全站搜尋「${query}」有索引`);
}

// 以假的 DETAILS 與 Web Animations 物件模擬：兩卡同開同關、快速反向點擊。
const detailsSource = sourceBetween("  function prefersReducedMotion", "  document.addEventListener(\"click\"");
const detailsContext = {
  window: { matchMedia() { return { matches: false }; } },
  requestAnimationFrame(callback) { callback(); },
  positionBasicsIndicator() {},
  routeParts() { return ["wiki", "systems"]; }
};
vm.createContext(detailsContext);
vm.runInContext(detailsSource, detailsContext);

function fakeDetails() {
  const attributes = new Map();
  const styleValues = new Map();
  const style = {
    set height(value) { styleValues.set("height", value); },
    get height() { return styleValues.get("height") || ""; },
    set overflow(value) { styleValues.set("overflow", value); },
    set willChange(value) { styleValues.set("will-change", value); },
    removeProperty(name) { styleValues.delete(name); }
  };
  const details = {
    open: false,
    style,
    classList: { contains() { return false; } },
    setAttribute(name, value) { attributes.set(name, value); },
    getAttribute(name) { return attributes.get(name) || null; },
    removeAttribute(name) { attributes.delete(name); },
    getBoundingClientRect() {
      if (styleValues.has("height")) return { height: parseFloat(styleValues.get("height")) };
      return { height: this.open ? 320 : 112 };
    },
    getAnimations() { return this._detailsAnimation ? [this._detailsAnimation] : []; },
    animate(frames) {
      const animation = {
        effect: { target: details },
        frames,
        onfinish: null,
        oncancel: null,
        cancel() { if (typeof this.oncancel === "function") this.oncancel(); }
      };
      return animation;
    }
  };
  return details;
}

function finish(details) {
  const animation = details._detailsAnimation;
  assert.ok(animation, "建立高度動畫");
  animation.onfinish();
}

const first = fakeDetails();
const second = fakeDetails();
detailsContext.animateDetails(first, true);
detailsContext.animateDetails(second, true);
finish(first);
finish(second);
assert.equal(first.open, true, "第一張卡展開");
assert.equal(second.open, true, "第二張卡展開");
detailsContext.animateDetails(first, false);
detailsContext.animateDetails(second, false);
finish(first);
finish(second);
assert.equal(first.open, false, "兩張卡同時開啟後，第一張仍可收合");
assert.equal(second.open, false, "兩張卡同時開啟後，第二張仍可收合");

const rapid = fakeDetails();
rapid.open = true;
detailsContext.animateDetails(rapid, false);
const closingAnimation = rapid._detailsAnimation;
detailsContext.animateDetails(rapid, true);
assert.equal(closingAnimation.onfinish, null, "反向點擊會解除舊動畫回呼");
if (rapid._detailsAnimation) finish(rapid);
assert.equal(rapid.open, true, "收合途中再次點擊可穩定恢復展開");

// 模擬從帶有 focus 的建築深連結點擊「文明特色區域」。同步後必須
// 保留新分類並移除舊 focus，避免重新渲染後又捲回商業中心。
const syncSource = sourceBetween("  function syncFilterRoute", "  function cancelScheduledRouteFocus");
let syncedQuery = null;
const syncContext = {
  state: {
    filters: { civ: "", dlc: "", mode: "", sort: "name", favorites: false },
    basicsFilters: { terrainKind: "", resourceType: "" },
    infrastructureFilters: { kind: "unique-district" },
    governmentFilters: { category: "", tier: "" },
    religionFilters: { category: "" },
    peopleFilters: { classId: "", era: "" },
    governorFilters: {}
  },
  routeParts() { return ["wiki", "infrastructure"]; },
  replaceRouteQuery(values) { syncedQuery = values; }
};
vm.createContext(syncContext);
vm.runInContext(syncSource, syncContext);
syncContext.syncFilterRoute();
assert.equal(syncedQuery.kind, "unique-district", "分類點擊保留新的文明特色區域條件");
assert.equal(syncedQuery.focus, null, "分類點擊清除舊的商業中心 focus");
assert.equal(syncedQuery.q, null, "同步分類時會清理舊的頁內搜尋參數");
assert.equal(syncedQuery.highlight, null, "切換分類時會清理舊的搜尋高亮");

// 搜尋結果跳轉保留 focus，並附加可分享的高亮關鍵字。
const highlightSource = sourceBetween("  function routeWithSearchHighlight", "  function normalizeLegacyHash");
const highlightContext = {
  URLSearchParams,
  canonicalRoute(route) { return route; },
  escapeHtml(value) { return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
};
vm.createContext(highlightContext);
vm.runInContext(highlightSource, highlightContext);
const highlightedRoute = highlightContext.routeWithSearchHighlight("#/wiki/infrastructure?focus=infrastructure-district-campus", "學院 Campus");
assert.match(highlightedRoute, /^#\/wiki\/infrastructure\?/);
assert.match(highlightedRoute, /focus=infrastructure-district-campus/);
assert.match(highlightedRoute, /highlight=%E5%AD%B8%E9%99%A2\+Campus/);
const highlightedLabel = highlightContext.renderSearchHighlight("學院 Campus", "學院 Campus");
assert.match(highlightedLabel, /<mark class="search-highlight">學院 Campus<\/mark>/);

// 模擬 Word 式頁面尋找：多個命中可循環切換、開啟所屬條目並同步選單與計數。
const navigatorSource = sourceBetween("  function setActiveRouteSearchMatch", "  function clearRouteSearchNavigator");
const matchSelect = { value: "" };
const matchCounter = { textContent: "" };
function fakeSearchMark(label) {
  const classes = new Set();
  const attributes = new Map();
  const ownerDetails = { open: false, parentElement: null };
  return {
    label,
    ownerDetails,
    scrolled: false,
    classList: { toggle(name, enabled) { if (enabled) classes.add(name); else classes.delete(name); } },
    setAttribute(name, value) { attributes.set(name, value); },
    removeAttribute(name) { attributes.delete(name); },
    getAttribute(name) { return attributes.get(name) || null; },
    hasClass(name) { return classes.has(name); },
    closest(selector) { return selector === "details" ? ownerDetails : null; },
    scrollIntoView() { this.scrolled = true; }
  };
}
const simulatedMarks = [fakeSearchMark("石油一"), fakeSearchMark("石油二"), fakeSearchMark("石油三")];
const navigatorContext = {
  routeSearchMatches: simulatedMarks,
  activeRouteSearchIndex: -1,
  document: {
    getElementById(id) {
      if (id === "route-search-match-select") return matchSelect;
      if (id === "route-search-counter") return matchCounter;
      return null;
    }
  }
};
vm.createContext(navigatorContext);
vm.runInContext(navigatorSource, navigatorContext);
navigatorContext.setActiveRouteSearchMatch(-1);
assert.equal(navigatorContext.activeRouteSearchIndex, 2, "上一個結果可從首項循環至末項");
assert.equal(matchSelect.value, "2", "位置選單同步目前命中");
assert.equal(matchCounter.textContent, "3 / 3", "計數器顯示目前位置與總數");
assert.equal(simulatedMarks[2].ownerDetails.open, true, "跳轉會展開命中內容所在條目");
assert.equal(simulatedMarks[2].scrolled, true, "命中內容會捲動至可見區域");
assert.equal(simulatedMarks[2].hasClass("active"), true, "目前命中具有獨立高亮狀態");
assert.equal(simulatedMarks[2].getAttribute("aria-current"), "true", "目前命中具有輔助技術狀態");
navigatorContext.setActiveRouteSearchMatch(3, false);
assert.equal(navigatorContext.activeRouteSearchIndex, 0, "下一個結果可從末項循環至首項");
assert.equal(matchCounter.textContent, "1 / 3", "循環後計數器同步更新");
assert.equal(simulatedMarks[2].hasClass("active"), false, "舊命中會取消目前狀態");

// 版面與路由防回歸：展開卡片採獨立欄，Wiki 分類改為精簡切換器。
assert.match(styles, /\.knowledge-grid,[\s\S]*?--expandable-columns: 2/);
assert.match(styles, /\.expandable-grid-column[\s\S]*?align-content: start/);
assert.match(app, /function arrangeExpandableGrid\(grid\)/);
assert.match(app, /classList\.contains\("governor-grid"\)/, "總督卡片會按視覺列同步摘要高度");
assert.match(app, /function alignExpandableSummaryRows\(grid\)/);
assert.match(app, /scrollFilteredResultIntoView\("#belief-catalog \.belief-card"\)/);
assert.match(app, /function syncFilterRoute\(\)[\s\S]*?kind: state\.infrastructureFilters\.kind, focus: null/);
assert.match(app, /class="wiki-section-switcher"/);
assert.match(app, /function scheduleRouteFocus\(focusId, block\)/);

console.log("互動模擬通過：唯一全站搜尋、多命中高亮導覽、完整資料索引、雙卡展開收合、快速反向點擊、獨立欄布局與 focus 路由清理均正常。");
