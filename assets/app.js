(function () {
  "use strict";

  var DATA = window.CIV6_DATA;
  if (!DATA) {
    document.getElementById("main-content").innerHTML = '<div class="page-shell"><div class="empty-state"><div><h1>攻略資料未載入</h1><p>請確認 assets/data.bundle.js 與 index.html 位於原本的相對位置。</p></div></div></div>';
    return;
  }

  var STORAGE_KEY = "civ6-guide-state-v1";
  var gradeValue = { S: 5, A: 4, B: 3, C: 2, D: 1 };
  var storageAvailable = testStorage();
  var defaultState = {
    version: 1,
    favorites: [],
    modeFavorites: [],
    progress: {},
    theme: "system",
    filters: { civ: "", dlc: "", favorites: false, mode: "", sort: "name" },
    basicsFilters: { terrainKind: "", resourceType: "", improvementEra: "" },
    governmentFilters: { category: "", tier: "" },
    religionFilters: { category: "" },
    peopleFilters: { classId: "", era: "" },
    governorFilters: {},
    infrastructureFilters: { kind: "district", group: "" },
    recent: "#/home"
  };
  var state = loadState();
  ["basicsFilters", "governmentFilters", "religionFilters", "peopleFilters", "governorFilters", "infrastructureFilters"].forEach(function (key) {
    delete state[key].query;
  });
  var main = document.getElementById("main-content");
  var toastTimer = null;
  var activeSearchIndex = -1;
  var currentSearchResults = [];
  var activeSearchScope = "all";
  var routeSearchMatches = [];
  var activeRouteSearchIndex = -1;
  var siteSearchPages = [
    { type: "page", lens: "guide", id: "guide-home", title: "攻略首頁", subtitle: "勝利路線、局勢判斷與實戰手冊", route: "#/guide", text: "攻略 科學 文化 統治 宗教 外交 分數 領袖 勝利 路線 新手 實戰" },
    { type: "page", lens: "guide", id: "guide-leaders", title: "領袖攻略", subtitle: "六種勝利路線與四個遊戲階段", route: "#/guide/leaders", text: "領袖 文明 科學 文化 統治 宗教 外交 分數 開局 中期 後期 終盤" },
    { type: "page", lens: "guide", id: "guide-decisions", title: "新手決策中心", subtitle: "從目前卡住的局勢反推下一步", route: "#/guide/decisions", text: "新手 決策 城市 生產 人口 區域 忠誠 勝利 下一步" },
    { type: "page", lens: "guide", id: "guide-progression", title: "科技與市政路線圖", subtitle: "解鎖、加速與時代轉向", route: "#/guide/progression", text: "科技 市政 尤里卡 鼓舞 解鎖 時代 路線 轉向" },
    { type: "page", lens: "guide", id: "guide-combat", title: "兵種與戰鬥手冊", subtitle: "站位、克制、升級與攻城", route: "#/guide/combat", text: "戰鬥 兵種 軍事 攻城 城牆 克制 站位 升級" },
    { type: "page", lens: "wiki", id: "wiki-home", title: "Wiki 百科首頁", subtitle: "遊戲規則與全部資料分類", route: "#/wiki", text: "百科 wiki 規則 資料 遊戲內容 查詢" },
    { type: "page", lens: "wiki", id: "wiki-terrain", title: "地形地貌與改良", subtitle: "地塊產出、常見資源與建造者設施", route: "#/wiki/terrain", text: "地形 地貌 丘陵 水域 產出 建造者 改良 設施" },
    { type: "page", lens: "wiki", id: "wiki-resources", title: "資源圖鑑", subtitle: "生成位置、揭示、改良與用途", route: "#/wiki/resources", text: "資源 加成 奢侈 戰略 生成 揭示 改良 庫存" },
    { type: "page", lens: "wiki", id: "wiki-infrastructure", title: "區域建築與城市項目", subtitle: "選址、解鎖、加成與生產項目", route: "#/wiki/infrastructure", text: "區域 建築 城市項目 選址 相鄰 加成 解鎖 生產" },
    { type: "page", lens: "wiki", id: "wiki-governments", title: "政體與政策卡", subtitle: "政體加成、卡槽與全部政策", route: "#/wiki/governments", text: "政體 政策卡 軍事 經濟 外交 偉人 通用 卡槽" },
    { type: "page", lens: "wiki", id: "wiki-religions", title: "宗教與信條", subtitle: "歷史宗教與全部宗教加成", route: "#/wiki/religions", text: "宗教 信條 萬神殿 創立者 追隨者 禮拜 建築" },
    { type: "page", lens: "wiki", id: "wiki-great-people", title: "偉人百科", subtitle: "全部偉人、時代與啟用效果", route: "#/wiki/great-people", text: "偉人 大科學家 大工程師 大作家 大將軍 啟用 效果" },
    { type: "page", lens: "wiki", id: "wiki-governors", title: "總督與晉升", subtitle: "總督能力與完整升級樹", route: "#/wiki/governors", text: "總督 晉升 升級 樹 能力 平加拉 梁 馬格努斯" },
    { type: "page", lens: "wiki", id: "wiki-systems", title: "核心機制", subtitle: "人口、忠誠、商路、外交與氣候", route: "#/wiki/systems", text: "人口 食物 住房 宜居度 忠誠 商路 外交 城邦 氣候 災害" }
  ];
  var filterEventsBound = false;
  var activeMajorSection = null;
  var basicsStickyObserver = null;
  var basicsStickySync = null;
  var previousBasicsSection = null;
  var routeImageWarmupTimer = null;
  var routeFocusTimer = null;
  var navResizeFrame = 0;
  var expandableGridSelector = [
    ".decision-grid", ".knowledge-grid", ".calculator-grid", ".terrain-grid",
    ".resource-grid", ".improvement-grid", ".infrastructure-grid", ".government-grid",
    ".policy-grid", ".belief-grid", ".great-person-grid", ".governor-grid"
  ].join(",");

  function testStorage() {
    try {
      var key = "__civ6_storage_test__";
      localStorage.setItem(key, "1");
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      return false;
    }
  }

  function loadState() {
    if (!storageAvailable) return JSON.parse(JSON.stringify(defaultState));
    try {
      var saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!saved || saved.version !== 1) return JSON.parse(JSON.stringify(defaultState));
      return {
        version: 1,
        favorites: Array.isArray(saved.favorites) ? saved.favorites : [],
        modeFavorites: Array.isArray(saved.modeFavorites) ? saved.modeFavorites : [],
        progress: saved.progress && typeof saved.progress === "object" ? saved.progress : {},
        theme: ["system", "light", "dark"].indexOf(saved.theme) >= 0 ? saved.theme : "system",
        filters: cleanLeaderFilters(saved.filters),
        basicsFilters: Object.assign({}, defaultState.basicsFilters, saved.basicsFilters || {}),
        governmentFilters: Object.assign({}, defaultState.governmentFilters, saved.governmentFilters || {}),
        religionFilters: Object.assign({}, defaultState.religionFilters, saved.religionFilters || {}),
        peopleFilters: Object.assign({}, defaultState.peopleFilters, saved.peopleFilters || {}),
        governorFilters: Object.assign({}, defaultState.governorFilters, saved.governorFilters || {}),
        infrastructureFilters: Object.assign({}, defaultState.infrastructureFilters, saved.infrastructureFilters || {}),
        recent: typeof saved.recent === "string" ? canonicalRoute(saved.recent) : "#/home"
      };
    } catch (error) {
      return JSON.parse(JSON.stringify(defaultState));
    }
  }

  function cleanLeaderFilters(filters) {
    filters = filters && typeof filters === "object" ? filters : {};
    return {
      civ: typeof filters.civ === "string" ? filters.civ : "",
      dlc: typeof filters.dlc === "string" ? filters.dlc : "",
      favorites: Boolean(filters.favorites),
      mode: typeof filters.mode === "string" ? filters.mode : "",
      sort: ["name", "grade", "progress"].indexOf(filters.sort) >= 0 ? filters.sort : "name"
    };
  }

  function saveState() {
    if (!storageAvailable) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      storageAvailable = false;
      document.getElementById("storage-warning").hidden = false;
    }
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function normalize(value) {
    return String(value || "").toLowerCase().replace(/[\s·・.,，。()（）/\-_:：]+/g, "");
  }

  function starIcon() {
    return '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z"></path></svg>';
  }

  function chevronIcon() {
    return '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m7 10 5 5 5-5"></path></svg>';
  }

  function applyTheme() {
    var actual = state.theme;
    if (actual === "system") actual = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", actual);
    document.querySelectorAll("[data-theme-choice]").forEach(function (button) {
      button.classList.toggle("active", button.getAttribute("data-theme-choice") === state.theme);
    });
    var labels = { system: "跟隨系統", light: "淺色", dark: "深色" };
    document.getElementById("theme-cycle").setAttribute("title", "目前：" + labels[state.theme]);
  }

  function warmRouteImages() {
    clearTimeout(routeImageWarmupTimer);
    routeImageWarmupTimer = setTimeout(function () {
      routeImageWarmupTimer = null;
      main.querySelectorAll('img[loading="lazy"]').forEach(function (image, index) {
        image.decoding = "async";
        if (index < 10) {
          image.loading = "eager";
          image.setAttribute("fetchpriority", "auto");
        } else {
          image.loading = "lazy";
          image.setAttribute("fetchpriority", "low");
        }
      });
    }, 0);
  }

  function showToast(message) {
    var toast = document.getElementById("toast");
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.hidden = true; }, 3600);
  }

  function routeParts() {
    var raw = location.hash || "#/home";
    return raw.replace(/^#\/?/, "").split("?")[0].split("/").filter(Boolean);
  }

  function routeQuery() {
    var raw = location.hash || "";
    var index = raw.indexOf("?");
    return new URLSearchParams(index >= 0 ? raw.slice(index + 1) : "");
  }

  function replaceRouteQuery(values) {
    var raw = location.hash || "#/home";
    var path = raw.split("?")[0];
    var current = routeQuery();
    Object.keys(values).forEach(function (key) {
      var value = values[key];
      if (value === "" || value === false || value == null) current.delete(key);
      else current.set(key, String(value));
    });
    var nextHash = path + (current.toString() ? "?" + current.toString() : "");
    if (nextHash !== raw) history.replaceState(null, "", location.href.split("#")[0] + nextHash);
  }

  function canonicalRoute(route) {
    var value = String(route || "#/home");
    if (value === "#/leaders" || value.indexOf("#/leaders?") === 0) return value.replace("#/leaders", "#/guide/leaders");
    if (value.indexOf("#/leader/") === 0) return value.replace("#/leader/", "#/guide/leader/");
    if (value === "#/modes" || value.indexOf("#/modes?") === 0) return value.replace("#/modes", "#/guide/modes");
    if (value.indexOf("#/mode/") === 0) return value.replace("#/mode/", "#/guide/mode/");
    if (value.indexOf("#/basics/mode/") === 0) return value.replace("#/basics/mode/", "#/wiki/mode/");
    if (value.indexOf("#/basics/") === 0) return value.replace("#/basics/", "#/wiki/");
    if (value.indexOf("#/guide/systems") === 0) return value.replace("#/guide/systems", "#/wiki/systems");
    return value;
  }

  function routeWithSearchHighlight(route, query) {
    var value = canonicalRoute(route);
    var parts = value.split("?");
    var params = new URLSearchParams(parts[1] || "");
    var highlight = String(query || "").trim().slice(0, 160);
    if (highlight) params.set("highlight", highlight);
    else params.delete("highlight");
    return parts[0] + (params.toString() ? "?" + params.toString() : "");
  }

  function searchHighlightTerms(query) {
    var raw = String(query || "").trim().slice(0, 160);
    if (!raw) return [];
    var terms = [raw].concat(raw.split(/\s+/));
    var seen = {};
    return terms.filter(function (term) {
      term = term.trim();
      var key = term.toLocaleLowerCase();
      if (!term || seen[key]) return false;
      seen[key] = true;
      return true;
    }).sort(function (a, b) { return b.length - a.length; });
  }

  function searchHighlightPattern(query) {
    var terms = searchHighlightTerms(query);
    if (!terms.length) return null;
    return new RegExp(terms.map(function (term) { return term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }).join("|"), "gi");
  }

  function renderSearchHighlight(value, query) {
    var text = String(value == null ? "" : value);
    var pattern = searchHighlightPattern(query);
    if (!pattern) return escapeHtml(text);
    var output = "";
    var lastIndex = 0;
    var match;
    while ((match = pattern.exec(text))) {
      output += escapeHtml(text.slice(lastIndex, match.index));
      output += '<mark class="search-highlight">' + escapeHtml(match[0]) + "</mark>";
      lastIndex = pattern.lastIndex;
    }
    return output + escapeHtml(text.slice(lastIndex));
  }

  function applyRouteSearchHighlights() {
    var params = routeQuery();
    var query = params.get("highlight") || "";
    var pattern = searchHighlightPattern(query);
    if (!pattern) return;
    var focusId = params.get("focus");
    var focusTarget = focusId ? document.getElementById(focusId) : null;
    if (focusTarget && focusTarget.tagName === "DETAILS") focusTarget.open = true;
    var root = main;
    var filters = window.NodeFilter || { SHOW_TEXT: 4, FILTER_ACCEPT: 1, FILTER_REJECT: 2 };
    var walker = document.createTreeWalker(root, filters.SHOW_TEXT, {
      acceptNode: function (node) {
        var parent = node.parentElement;
        if (!parent || !node.nodeValue.trim()) return filters.FILTER_REJECT;
        if (parent.closest("script, style, mark, input, textarea, select, option, .sr-only, [aria-hidden='true'], .basics-sticky-controls")) return filters.FILTER_REJECT;
        pattern.lastIndex = 0;
        return pattern.test(node.nodeValue) ? filters.FILTER_ACCEPT : filters.FILTER_REJECT;
      }
    });
    var nodes = [];
    var current;
    while ((current = walker.nextNode())) nodes.push(current);
    var matchCount = 0;
    routeSearchMatches = [];
    nodes.forEach(function (node) {
      var text = node.nodeValue;
      var fragment = document.createDocumentFragment();
      var lastIndex = 0;
      var match;
      pattern.lastIndex = 0;
      while ((match = pattern.exec(text))) {
        if (match.index > lastIndex) fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
        var mark = document.createElement("mark");
        mark.className = "search-highlight";
        mark.textContent = match[0];
        mark.setAttribute("data-search-match-index", String(matchCount));
        fragment.appendChild(mark);
        routeSearchMatches.push(mark);
        matchCount += 1;
        lastIndex = pattern.lastIndex;
      }
      if (lastIndex < text.length) fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
      node.parentNode.replaceChild(fragment, node);
    });
    if (matchCount) {
      root.classList.add("search-highlight-root");
      root.setAttribute("data-search-highlight-count", String(matchCount));
      createRouteSearchNavigator(query);
      var initialIndex = focusTarget ? routeSearchMatches.findIndex(function (mark) { return focusTarget.contains(mark); }) : 0;
      setActiveRouteSearchMatch(initialIndex >= 0 ? initialIndex : 0, false);
    }
  }

  function routeSearchMatchLabel(mark, index) {
    var owner = mark.closest("details[id], article[id], section[id]");
    var heading = owner && owner.querySelector("summary strong, h2, h3");
    var title = heading ? heading.textContent.trim().replace(/\s+/g, " ") : "";
    var context = mark.parentElement.textContent.trim().replace(/\s+/g, " ");
    if (context.length > 48) context = context.slice(0, 47) + "…";
    return (index + 1) + ". " + (title && context.indexOf(title) !== 0 ? title + " — " : "") + context;
  }

  function createRouteSearchNavigator(query) {
    var existing = document.getElementById("route-search-navigator");
    if (existing) existing.remove();
    var toolbar = document.createElement("aside");
    toolbar.id = "route-search-navigator";
    toolbar.className = "route-search-navigator";
    toolbar.setAttribute("aria-label", "頁面搜尋命中位置");
    toolbar.innerHTML = '<div class="route-search-query"><small>本頁找到</small><strong>' + escapeHtml(query) + '</strong></div><label class="route-search-picker"><span class="sr-only">選擇命中位置</span><select id="route-search-match-select" aria-label="選擇命中位置">' + routeSearchMatches.map(function (mark, index) { return '<option value="' + index + '">' + escapeHtml(routeSearchMatchLabel(mark, index)) + '</option>'; }).join("") + '</select></label><div class="route-search-stepper"><button type="button" data-action="search-match-prev" aria-label="上一個搜尋結果" title="上一個搜尋結果（Shift+F3）"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"></path></svg></button><span id="route-search-counter" role="status" aria-live="polite">1 / ' + routeSearchMatches.length + '</span><button type="button" data-action="search-match-next" aria-label="下一個搜尋結果" title="下一個搜尋結果（F3）"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"></path></svg></button><button class="route-search-close" type="button" data-action="clear-search-highlight" aria-label="關閉頁面搜尋高亮" title="關閉高亮">×</button></div>';
    document.body.appendChild(toolbar);
  }

  function setActiveRouteSearchMatch(index, shouldScroll) {
    if (!routeSearchMatches.length) return;
    activeRouteSearchIndex = (Number(index) + routeSearchMatches.length) % routeSearchMatches.length;
    routeSearchMatches.forEach(function (mark, matchIndex) {
      var active = matchIndex === activeRouteSearchIndex;
      mark.classList.toggle("active", active);
      if (active) mark.setAttribute("aria-current", "true");
      else mark.removeAttribute("aria-current");
    });
    var activeMark = routeSearchMatches[activeRouteSearchIndex];
    var details = activeMark.closest("details");
    while (details) {
      details.open = true;
      details = details.parentElement ? details.parentElement.closest("details") : null;
    }
    var select = document.getElementById("route-search-match-select");
    var counter = document.getElementById("route-search-counter");
    if (select) select.value = String(activeRouteSearchIndex);
    if (counter) counter.textContent = (activeRouteSearchIndex + 1) + " / " + routeSearchMatches.length;
    if (shouldScroll !== false) activeMark.scrollIntoView({ block: "center", inline: "nearest" });
  }

  function clearRouteSearchNavigator() {
    routeSearchMatches = [];
    activeRouteSearchIndex = -1;
    var toolbar = document.getElementById("route-search-navigator");
    if (toolbar) toolbar.remove();
  }

  function normalizeLegacyHash() {
    var current = location.hash || "#/home";
    var canonical = canonicalRoute(current);
    if (canonical === current) return false;
    history.replaceState(null, "", location.href.split("#")[0] + canonical);
    return true;
  }

  function hydrateFiltersFromRoute() {
    var parts = routeParts();
    var params = routeQuery();
    function assign(target, mapping) {
      Object.keys(mapping).forEach(function (parameter) {
        if (!params.has(parameter)) return;
        var key = mapping[parameter];
        target[key] = params.get(parameter);
      });
    }
    if ((parts[0] === "guide" && parts[1] === "leaders") || parts[0] === "favorites") {
      assign(state.filters, { civ: "civ", dlc: "dlc", mode: "mode", sort: "sort" });
      if (params.has("fav")) state.filters.favorites = params.get("fav") === "1";
    } else if (parts[0] === "wiki") {
      if (parts[1] === "terrain" || parts[1] === "resources") assign(state.basicsFilters, { type: parts[1] === "terrain" ? "terrainKind" : "resourceType" });
      if (parts[1] === "infrastructure") assign(state.infrastructureFilters, { kind: "kind" });
      if (parts[1] === "governments") assign(state.governmentFilters, { category: "category", tier: "tier" });
      if (parts[1] === "religions") assign(state.religionFilters, { category: "category" });
      if (parts[1] === "great-people") assign(state.peopleFilters, { class: "classId", era: "era" });
    }
    if (params.has("q") && (((parts[0] === "guide" && parts[1] === "leaders") || parts[0] === "favorites") || (parts[0] === "wiki" && ["terrain", "resources", "infrastructure", "governments", "religions", "great-people", "governors"].indexOf(parts[1]) >= 0))) replaceRouteQuery({ q: null });
  }

  function syncFilterRoute() {
    var parts = routeParts();
    if ((parts[0] === "guide" && parts[1] === "leaders") || parts[0] === "favorites") {
      replaceRouteQuery({ q: null, civ: state.filters.civ, dlc: state.filters.dlc, mode: state.filters.mode, sort: state.filters.sort === "name" ? "" : state.filters.sort, fav: state.filters.favorites ? "1" : "", focus: null, highlight: null });
    } else if (parts[0] === "wiki" && (parts[1] === "terrain" || parts[1] === "resources")) {
      replaceRouteQuery({ q: null, type: parts[1] === "terrain" ? state.basicsFilters.terrainKind : state.basicsFilters.resourceType, focus: null, highlight: null });
    } else if (parts[0] === "wiki" && parts[1] === "infrastructure") {
      replaceRouteQuery({ q: null, kind: state.infrastructureFilters.kind, focus: null, highlight: null });
    } else if (parts[0] === "wiki" && parts[1] === "governments") {
      replaceRouteQuery({ q: null, category: state.governmentFilters.category, tier: state.governmentFilters.tier, focus: null, highlight: null });
    } else if (parts[0] === "wiki" && parts[1] === "religions") {
      replaceRouteQuery({ q: null, category: state.religionFilters.category, focus: null, highlight: null });
    } else if (parts[0] === "wiki" && parts[1] === "great-people") {
      replaceRouteQuery({ q: null, class: state.peopleFilters.classId, era: state.peopleFilters.era, focus: null, highlight: null });
    }
  }

  function cancelScheduledRouteFocus() {
    clearTimeout(routeFocusTimer);
    routeFocusTimer = null;
  }

  function scheduleRouteFocus(focusId, block) {
    cancelScheduledRouteFocus();
    if (!focusId) return;
    var expectedHash = location.hash;
    routeFocusTimer = setTimeout(function () {
      routeFocusTimer = null;
      if (location.hash !== expectedHash) return;
      var target = document.getElementById(focusId);
      if (!target) return;
      if (target.tagName === "DETAILS") target.open = true;
      target.scrollIntoView({ block: block || "center" });
      target.classList.add("focus-flash");
    }, 0);
  }

  function setActiveNav(section) {
    document.querySelectorAll("[data-nav]").forEach(function (item) {
      item.classList.toggle("active", item.getAttribute("data-nav") === section);
      if (item.tagName === "A" && item.classList.contains("active")) item.setAttribute("aria-current", "page");
      else item.removeAttribute("aria-current");
    });
    requestAnimationFrame(function () {
      document.querySelectorAll(".primary-nav, .mobile-nav").forEach(function (nav) {
        positionSlidingIndicator(nav, nav.querySelector('[data-nav="' + section + '"]'));
      });
    });
  }

  function setIndicatorGeometry(container, item) {
    if (!container || !item) return;
    container.style.setProperty("--slider-x", item.offsetLeft + "px");
    container.style.setProperty("--slider-y", item.offsetTop + "px");
    container.style.setProperty("--slider-width", item.offsetWidth + "px");
    container.style.setProperty("--slider-height", item.offsetHeight + "px");
  }

  function positionSlidingIndicator(container, item) {
    if (!container || !item) return;
    setIndicatorGeometry(container, item);
    container.classList.add("slider-ready", "slider-animate");
  }

  function positionBasicsIndicator(section) {
    var nav = main.querySelector(".basics-tabs");
    if (!nav) return;
    var current = nav.querySelector('[href="#/wiki/' + section + '"]');
    var previous = previousBasicsSection && nav.querySelector('[href="#/wiki/' + previousBasicsSection + '"]');
    nav.classList.remove("slider-animate");
    setIndicatorGeometry(nav, previous || current);
    nav.classList.add("slider-ready");
    void nav.offsetWidth;
    nav.classList.add("slider-animate");
    requestAnimationFrame(function () { setIndicatorGeometry(nav, current); });
    previousBasicsSection = section;
  }

  function arrangeExpandableGrid(grid) {
    var nestedItems = Array.prototype.slice.call(grid.querySelectorAll(".expandable-grid-column > details"));
    var directItems = Array.prototype.slice.call(grid.children).filter(function (item) { return item.tagName === "DETAILS"; });
    var items = nestedItems.length ? nestedItems : directItems;
    if (!items.length) return;
    items.forEach(function (item, index) {
      if (!item.hasAttribute("data-expandable-index")) item.setAttribute("data-expandable-index", String(index));
    });
    items.sort(function (a, b) { return Number(a.getAttribute("data-expandable-index")) - Number(b.getAttribute("data-expandable-index")); });
    var requestedColumns = parseInt(getComputedStyle(grid).getPropertyValue("--expandable-columns"), 10) || 1;
    var columnCount = Math.max(1, Math.min(requestedColumns, items.length));
    if (grid.getAttribute("data-expandable-column-count") === String(columnCount) && nestedItems.length === items.length) {
      alignExpandableSummaryRows(grid);
      return;
    }
    var fragment = document.createDocumentFragment();
    var columns = [];
    for (var index = 0; index < columnCount; index += 1) {
      var column = document.createElement("div");
      column.className = "expandable-grid-column";
      column.setAttribute("role", "presentation");
      columns.push(column);
      fragment.appendChild(column);
    }
    items.forEach(function (item, index) { columns[index % columnCount].appendChild(item); });
    grid.replaceChildren(fragment);
    grid.setAttribute("data-expandable-column-count", String(columnCount));
    alignExpandableSummaryRows(grid);
  }

  function alignExpandableSummaryRows(grid) {
    if (!grid.classList.contains("system-grid") && !grid.classList.contains("governor-grid")) return;
    var columns = Array.prototype.slice.call(grid.querySelectorAll(":scope > .expandable-grid-column"));
    var summaries = columns.map(function (column) {
      return Array.prototype.slice.call(column.children).map(function (item) { return item.querySelector(":scope > summary"); }).filter(Boolean);
    });
    summaries.forEach(function (column) { column.forEach(function (summary) { summary.style.removeProperty("min-height"); }); });
    if (columns.length < 2) return;
    var rowHeights = [];
    summaries.forEach(function (column) {
      column.forEach(function (summary, index) {
        rowHeights[index] = Math.max(rowHeights[index] || 0, Math.ceil(summary.getBoundingClientRect().height));
      });
    });
    summaries.forEach(function (column) {
      column.forEach(function (summary, index) { summary.style.minHeight = rowHeights[index] + "px"; });
    });
  }

  function arrangeExpandableGrids(root) {
    (root || document).querySelectorAll(expandableGridSelector).forEach(arrangeExpandableGrid);
  }

  function progressPrefix(leaderId, routeId, stageId) {
    return [leaderId, routeId || "", stageId || ""].filter(Boolean).join(":");
  }

  function progressFor(leaderId, routeId) {
    var prefix = progressPrefix(leaderId, routeId);
    var leader = DATA.leaders.find(function (item) { return item.id === leaderId; });
    if (!leader) return 0;
    var total = routeId ? DATA.stageOrder.length * 5 : DATA.routeOrder.length * DATA.stageOrder.length * 5;
    var count = Object.keys(state.progress).filter(function (key) { return key.indexOf(prefix + ":") === 0 && state.progress[key]; }).length;
    return Math.round((count / total) * 100);
  }

  function favoriteButton(id, type, label) {
    var list = type === "mode" ? state.modeFavorites : state.favorites;
    var pressed = list.indexOf(id) >= 0;
    return '<button class="favorite-button" type="button" data-action="favorite" data-type="' + type + '" data-id="' + escapeHtml(id) + '" aria-label="' + (pressed ? "取消收藏" : "收藏") + escapeHtml(label) + '" aria-pressed="' + pressed + '">' + starIcon() + '</button>';
  }

  function civilizationIcon(leader, extraClass) {
    var icons = leader.civIcons || [];
    if (!icons.length) {
      return '<span class="emblem ' + (extraClass || "") + '" style="--civ-color:' + escapeHtml(leader.color) + '">' + escapeHtml(leader.emblem) + '</span>';
    }
    var civNames = leader.civ.split("／");
    var images = icons.map(function (slug, index) {
      var civName = (civNames[index] || leader.civ).trim();
      return '<img src="assets/civ-icons/' + escapeHtml(slug) + '.webp" width="96" height="96" alt="' + escapeHtml(civName + "文明圖標") + '">';
    }).join("");
    return '<span class="civ-emblem' + (icons.length > 1 ? " dual" : "") + (extraClass ? " " + extraClass : "") + '" style="--civ-color:' + escapeHtml(leader.color) + '">' + images + '</span>';
  }

  function renderLeaderCard(leader) {
    var progress = progressFor(leader.id);
    var gradeItems = DATA.routeOrder.map(function (routeId) {
      var route = leader.routes[routeId];
      return '<div class="grade-item grade-' + route.grade + '" title="' + escapeHtml(route.name + "：" + route.recommendation) + '"><span>' + escapeHtml(shortRoute(routeId)) + '</span><strong>' + route.grade + '</strong></div>';
    }).join("");
    return '<article class="leader-card">' +
      '<div class="leader-card-top">' + civilizationIcon(leader, "") +
      '<div><h2>' + escapeHtml(leader.name) + '</h2><span class="english">' + escapeHtml(leader.en) + '</span><p class="civilization">' + escapeHtml(leader.civ) + '</p></div>' +
      favoriteButton(leader.id, "leader", leader.name) + '</div>' +
      '<div><p class="leader-hook">' + escapeHtml(leader.hook) + '</p><div class="grade-row" aria-label="六種勝利適性">' + gradeItems + '</div></div>' +
      '<div class="card-footer"><div class="progress-compact">攻略進度 ' + progress + '%<div class="progress-line" aria-hidden="true"><span style="--progress:' + progress + '%"></span></div></div>' +
      '<a class="card-link" href="#/guide/leader/' + escapeHtml(leader.id) + '/' + bestRoute(leader) + '">查看攻略</a></div></article>';
  }

  function shortRoute(routeId) {
    return { science: "科技", culture: "文化", domination: "統治", religion: "宗教", diplomacy: "外交", score: "分數" }[routeId];
  }

  function bestRoute(leader) {
    return DATA.routeOrder.slice().sort(function (a, b) { return gradeValue[leader.routes[b].grade] - gradeValue[leader.routes[a].grade]; })[0];
  }

  function portalGlyph(kind) {
    var paths = {
      guide: '<path d="M5 5.5h5.5A2.5 2.5 0 0 1 13 8v11H7.5A2.5 2.5 0 0 1 5 16.5v-11Z"></path><path d="M19 5.5h-3A3 3 0 0 0 13 8v11h3.5a2.5 2.5 0 0 1 2.5-2.5v-11Z"></path>',
      wiki: '<circle cx="12" cy="12" r="9"></circle><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z"></path>',
      leader: '<circle cx="12" cy="8" r="3.5"></circle><path d="M5 20c.6-4.3 3-6.5 7-6.5s6.4 2.2 7 6.5"></path>',
      victory: '<path d="M8 4h8v3a4 4 0 0 1-8 0V4Z"></path><path d="M8 6H4v1a4 4 0 0 0 4 4M16 6h4v1a4 4 0 0 1-4 4M12 11v5M8 20h8M9 16h6"></path>',
      decision: '<path d="M6 5h12v14H6z"></path><path d="M9 9h6M9 13h4"></path>',
      combat: '<path d="m5 19 5-5M14 10l5-5M7 5l12 12M5 7l2-2 12 12-2 2Z"></path>',
      mode: '<path d="M8 8h8a5 5 0 0 1 4.8 6.5l-.7 2.2a2 2 0 0 1-3.4.7L14.5 15h-5l-2.2 2.4a2 2 0 0 1-3.4-.7l-.7-2.2A5 5 0 0 1 8 8Z"></path><path d="M7 12h4M9 10v4M16 11h.01M18 13h.01"></path>',
      terrain: '<path d="m3 18 5-7 4 5 3-4 6 6H3Z"></path><path d="M4 6h5M6.5 3.5v5"></path>',
      system: '<circle cx="12" cy="12" r="3"></circle><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"></path>'
    };
    return '<span class="portal-glyph" aria-hidden="true"><svg viewBox="0 0 24 24">' + (paths[kind] || paths.system) + '</svg></span>';
  }

  function contentPortalCard(item, kind) {
    return '<a class="content-portal ' + escapeHtml(kind || "") + '" href="' + escapeHtml(item.route) + '">' + portalGlyph(item.icon || kind) + '<span class="portal-copy"><small>' + escapeHtml(item.eyebrow || "") + '</small><strong>' + escapeHtml(item.title) + '</strong><span>' + escapeHtml(item.description) + '</span></span><span class="portal-arrow" aria-hidden="true">→</span></a>';
  }

  function renderHomePage() {
    setActiveNav("");
    var guide = { route: "#/guide", icon: "guide", eyebrow: "STRATEGY", title: "攻略", description: "從領袖、勝利條件和當前局勢出發，找到下一個有效動作。" };
    var wiki = { route: "#/wiki", icon: "wiki", eyebrow: "REFERENCE", title: "Wiki 百科", description: "查規則、效果、解鎖、數值和遊戲內各種條目的關聯。" };
    var recent = canonicalRoute(state.recent || "#/guide");
    if (recent === "#/home") recent = "#/guide";
    main.innerHTML = '<div class="page-shell home-page"><section class="home-hero"><div><p class="kicker">CIVILIZATION VI · OFFLINE COMPENDIUM</p><h1>文明 VI 戰略百科</h1><p>攻略告訴你怎麼贏，Wiki 解釋遊戲如何運作。全 DLC 繁體中文資料與進度都保存在本機。</p><button class="home-search" type="button" data-action="open-search"><svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path></svg><span><small>全站搜尋</small><strong>輸入領袖、勝利路線、政策卡或遊戲規則</strong></span><kbd>/</kbd></button></div><aside class="home-status"><span>Gathering Storm</span><strong>' + DATA.meta.leaderCount + ' 位領袖 · ' + DATA.searchIndex.length + ' 個可搜尋條目</strong><a href="' + escapeHtml(recent) + '">繼續上次閱讀 <span aria-hidden="true">→</span></a></aside></section><section class="dual-portals" aria-label="選擇內容類型">' + contentPortalCard(guide, "guide") + contentPortalCard(wiki, "wiki") + '</section><section class="home-quick"><div class="section-heading-row"><div><p class="kicker">START HERE</p><h2>你現在想完成什麼？</h2></div><p>從任務進入，比先理解整個網站更快。</p></div><div class="quick-entry-grid">' + [
      { route: "#/guide/leaders", icon: "leader", eyebrow: "攻略", title: "選擇領袖與打法", description: "比較六種勝利適性與四階段攻略。" },
      { route: "#/guide/decisions", icon: "decision", eyebrow: "攻略", title: "這局卡住了", description: "從症狀反推檢查順序和停損條件。" },
      { route: "#/wiki/terrain", icon: "terrain", eyebrow: "Wiki", title: "查地塊與改良", description: "地形、地貌、資源與建造者設施。" },
      { route: "#/wiki/infrastructure", icon: "wiki", eyebrow: "Wiki", title: "查區域與建築", description: "相鄰加成、成本、解鎖與城市項目。" }
    ].map(function (item) { return contentPortalCard(item, item.eyebrow === "攻略" ? "guide" : "wiki"); }).join("") + '</div></section><section class="home-local-note"><strong>完全離線</strong><span>不使用 CDN、線上字體或執行時網路請求；收藏、進度、主題與篩選保存在 localStorage。</span></section></div>';
  }

  function renderGuideHub() {
    setActiveNav("guide");
    var entries = [
      { route: "#/guide/leaders", icon: "leader", eyebrow: DATA.meta.leaderCount + " 位領袖", title: "領袖攻略", description: "六條勝利路線、四個時代階段與模式相性。" },
      { route: "#/guide/victories", icon: "victory", eyebrow: "6 種勝利", title: "勝利路線", description: "先選勝利條件，再比較最適合的領袖與轉線時機。" },
      { route: "#/guide/decisions", icon: "decision", eyebrow: DATA.handbook.decisions.length + " 種局勢", title: "我現在該做什麼", description: "人口停滯、產能不足、攻城失敗等即時診斷。" },
      { route: "#/guide/progression", icon: "guide", eyebrow: DATA.handbook.progression.eras.length + " 個時代", title: "科技與市政節奏", description: "解鎖、尤里卡、鼓舞與研究轉向。" },
      { route: "#/guide/combat", icon: "combat", eyebrow: DATA.handbook.combat.classes.length + " 類兵種", title: "兵種與戰鬥", description: "站位、克制、升級路線和攻城流程。" },
      { route: "#/guide/modes", icon: "mode", eyebrow: DATA.meta.modeCount + " 種模式", title: "遊戲模式攻略", description: "玩法利用、主要風險、聯動與推薦領袖。" }
    ];
    main.innerHTML = '<div class="page-shell guide-hub"><header class="hub-hero guide-hub-hero"><div><p class="kicker">STRATEGY</p><h1>攻略</h1><p>先確定你想贏什麼，或描述目前卡住的局勢。這裡提供判斷、優先順序、轉線和失敗備案。</p></div><a class="hub-search" href="#/guide/leaders">從領袖開始 <span aria-hidden="true">→</span></a></header><div class="hub-card-grid">' + entries.map(function (item) { return contentPortalCard(item, "guide"); }).join("") + '</div><section class="learning-path"><div><p class="kicker">NEW PLAYER PATH</p><h2>第一次遊玩建議順序</h2></div><ol><li><a href="#/wiki/terrain"><span>1</span>先讀懂地塊</a></li><li><a href="#/guide/decisions"><span>2</span>學會城市瓶頸</a></li><li><a href="#/guide/progression"><span>3</span>安排科技市政</a></li><li><a href="#/guide/victories"><span>4</span>確定勝利條件</a></li></ol></section></div>';
  }

  function renderVictoryHub(routeId) {
    setActiveNav("guide");
    var valid = DATA.routeOrder.indexOf(routeId) >= 0;
    if (!valid) {
      var cards = DATA.routeOrder.map(function (id) {
        var best = DATA.leaders.slice().sort(function (a, b) { return gradeValue[b.routes[id].grade] - gradeValue[a.routes[id].grade]; }).slice(0, 3);
        return '<a class="victory-card victory-' + id + '" href="#/guide/victories/' + id + '"><span class="victory-grade">' + best[0].routes[id].grade + '</span><small>' + escapeHtml(DATA.routeNames[id]) + '</small><strong>' + escapeHtml(DATA.routeNames[id]) + '勝利</strong><p>推薦領袖：' + best.map(function (leader) { return leader.name; }).join("、") + '</p><span class="portal-arrow" aria-hidden="true">→</span></a>';
      }).join("");
      main.innerHTML = '<div class="page-shell guide-page"><header class="page-header"><div><p class="kicker">VICTORY ROUTES</p><h1>六種勝利路線</h1><p>從勝利條件反查領袖適性、核心循環與常見轉線，不必先逐一打開所有領袖。</p></div><div class="page-stat"><strong>6 條路線</strong><span>依適性比較全部領袖</span></div></header><div class="victory-grid">' + cards + '</div></div>';
      return;
    }
    var ranked = DATA.leaders.slice().sort(function (a, b) { return gradeValue[b.routes[routeId].grade] - gradeValue[a.routes[routeId].grade] || a.name.localeCompare(b.name, "zh-Hant"); });
    var routeName = DATA.routeNames[routeId];
    main.innerHTML = '<div class="page-shell guide-page"><nav class="breadcrumb" aria-label="麵包屑"><a href="#/guide">攻略</a><span aria-hidden="true">/</span><a href="#/guide/victories">勝利路線</a><span aria-hidden="true">/</span><span aria-current="page">' + escapeHtml(routeName) + '</span></nav><header class="page-header"><div><p class="kicker">VICTORY ROUTE</p><h1>' + escapeHtml(routeName) + '勝利</h1><p>依領袖適性排序；選擇領袖後直接進入該勝利路線的開局、中期、後期與終盤策略。</p></div><div class="page-stat"><strong>' + ranked.filter(function (leader) { return ["S", "A"].indexOf(leader.routes[routeId].grade) >= 0; }).length + ' 位</strong><span>S／A 級適性領袖</span></div></header><nav class="victory-route-switch" aria-label="切換勝利路線">' + DATA.routeOrder.map(function (id) { return '<a class="' + (id === routeId ? "active" : "") + '" href="#/guide/victories/' + id + '"' + (id === routeId ? ' aria-current="page"' : "") + '>' + escapeHtml(DATA.routeNames[id]) + '</a>'; }).join("") + '</nav><div class="victory-leader-list">' + ranked.map(function (leader) { var route = leader.routes[routeId]; return '<a class="victory-leader-row" href="#/guide/leader/' + leader.id + '/' + routeId + '">' + civilizationIcon(leader, "") + '<span><strong>' + escapeHtml(leader.name) + '</strong><small>' + escapeHtml(leader.civ + " · " + leader.en) + '</small></span><span class="route-fit grade-' + route.grade + '">' + route.grade + '</span><p>' + escapeHtml(route.recommendation) + '</p><span class="portal-arrow" aria-hidden="true">→</span></a>'; }).join("") + '</div></div>';
  }

  function wikiEntries() {
    return [
      { route: "#/wiki/leaders", icon: "leader", eyebrow: DATA.meta.leaderCount + " 位", title: "文明與領袖", description: "文明能力、領袖能力、特色內容與出生偏好。" },
      { route: "#/wiki/terrain", icon: "terrain", eyebrow: DATA.meta.terrainCount + " + " + DATA.meta.improvementCount + " 項", title: "地形地貌與改良", description: "地塊產出、移動、防禦、資源和建造者設施。" },
      { route: "#/wiki/resources", icon: "terrain", eyebrow: DATA.meta.resourceCount + " 種", title: "資源圖鑑", description: "生成位置、揭示科技、改良與戰略庫存。" },
      { route: "#/wiki/infrastructure", icon: "wiki", eyebrow: DATA.meta.districtCount + " + " + DATA.meta.buildingCount + " + " + DATA.meta.projectCount, title: "區域建築與項目", description: "相鄰規則、成本、解鎖、建築與城市項目。" },
      { route: "#/wiki/governments", icon: "system", eyebrow: DATA.meta.governmentCount + " + " + DATA.meta.policyCount, title: "政體與政策卡", description: "政體加成、卡槽、政策效果與解鎖市政。" },
      { route: "#/wiki/religions", icon: "wiki", eyebrow: DATA.meta.religionCount + " + " + DATA.meta.beliefCount, title: "宗教與信條", description: "歷史宗教、萬神殿與四類宗教信條。" },
      { route: "#/wiki/great-people", icon: "leader", eyebrow: DATA.meta.greatPersonCount + " 位", title: "偉人", description: "時代、類型、招募與完整啟用效果。" },
      { route: "#/wiki/governors", icon: "leader", eyebrow: DATA.meta.governorCount + " 位", title: "總督", description: "任命能力、就任時間與完整晉升樹。" },
      { route: "#/wiki/modes", icon: "mode", eyebrow: DATA.meta.modeCount + " 種", title: "遊戲模式規則", description: "啟用需求、新增內容與規則變更。" },
      { route: "#/wiki/systems", icon: "system", eyebrow: DATA.handbook.systems.length + " 個系統", title: "核心機制", description: "人口、忠誠、商路、外交、氣候與戰爭疲勞。" }
    ];
  }

  function renderWikiHub() {
    setActiveNav("wiki");
    main.innerHTML = '<div class="page-shell wiki-hub"><header class="hub-hero wiki-hub-hero"><div><p class="kicker">ENCYCLOPEDIA</p><h1>Wiki 百科</h1><p>查遊戲內容本身：它是什麼、何時解鎖、提供什麼效果，以及和哪些規則或條目相關。</p></div><button class="hub-search" type="button" data-action="open-search">搜尋全部條目 <span aria-hidden="true">→</span></button></header><div class="hub-card-grid wiki-card-grid">' + wikiEntries().map(function (item) { return contentPortalCard(item, "wiki"); }).join("") + '</div><section class="wiki-principles"><article><strong>資料視角</strong><p>效果、成本、解鎖與規則優先；實戰取捨會連到攻略。</p></article><article><strong>同一份資料</strong><p>領袖與模式的 Wiki、攻略共用底層內容，避免版本不一致。</p></article><article><strong>英文別名</strong><p>繁體中文與英文名稱都能搜尋，方便對照遊戲和外部資料。</p></article></section></div>';
  }

  function renderWikiLeadersPage() {
    setActiveNav("wiki");
    var cards = DATA.leaders.map(function (leader) {
      return '<a class="wiki-leader-card" href="#/wiki/leader/' + leader.id + '">' + civilizationIcon(leader, "") + '<span><small>' + escapeHtml(leader.civ) + '</small><strong>' + escapeHtml(leader.name) + '</strong><em>' + escapeHtml(leader.en) + '</em></span><p>' + escapeHtml(leader.ability) + '</p><span class="portal-arrow" aria-hidden="true">→</span></a>';
    }).join("");
    main.innerHTML = '<div class="page-shell wiki-page"><nav class="breadcrumb" aria-label="麵包屑"><a href="#/wiki">Wiki</a><span aria-hidden="true">/</span><span aria-current="page">文明與領袖</span></nav><header class="page-header"><div><p class="kicker">CIVILIZATIONS & LEADERS</p><h1>文明與領袖百科</h1><p>本頁只呈現能力、特色內容與資料摘要；六種勝利路線與階段策略請切換到領袖攻略。</p></div><div class="page-stat"><strong>' + DATA.meta.leaderCount + ' 位領袖</strong><span>67 位不同領袖與人格</span></div></header><div class="wiki-leader-grid">' + cards + '</div></div>';
  }

  function renderWikiLeaderDetail(leaderId) {
    var leader = DATA.leaders.find(function (item) { return item.id === leaderId; });
    if (!leader) return renderNotFound("找不到這位領袖", "領袖資料可能已移動，請返回文明與領袖百科。");
    setActiveNav("wiki");
    main.innerHTML = '<div class="page-shell wiki-page"><nav class="breadcrumb" aria-label="麵包屑"><a href="#/wiki">Wiki</a><span aria-hidden="true">/</span><a href="#/wiki/leaders">文明與領袖</a><span aria-hidden="true">/</span><span aria-current="page">' + escapeHtml(leader.name) + '</span></nav><header class="leader-hero wiki-leader-hero" style="--civ-color:' + escapeHtml(leader.color) + '">' + civilizationIcon(leader, "hero-emblem") + '<div class="leader-identity"><p class="kicker">' + escapeHtml(leader.civ) + '</p><h1>' + escapeHtml(leader.name) + '</h1><p class="english-name">' + escapeHtml(leader.en) + '</p><p class="hero-hook">' + escapeHtml(leader.ability) + '</p></div><div class="hero-meta"><div class="meta-pair"><small>DLC</small><strong>' + escapeHtml(leader.dlc) + '</strong></div><div class="meta-pair"><small>出生偏好／地圖</small><strong>' + escapeHtml(leader.map) + '</strong></div><div class="hero-actions">' + favoriteButton(leader.id, "leader", leader.name) + '</div></div></header><nav class="content-lens" aria-label="領袖內容視角"><a href="#/guide/leader/' + leader.id + '/' + bestRoute(leader) + '"><small>攻略</small><strong>實戰路線與階段策略</strong></a><a class="active" href="#/wiki/leader/' + leader.id + '" aria-current="page"><small>Wiki</small><strong>能力與文明資料</strong></a></nav><section class="wiki-fact-grid"><article class="info-panel feature"><h2>領袖能力</h2><p>' + escapeHtml(leader.ability) + '</p></article><article class="info-panel"><h2>文明特色</h2><p>' + escapeHtml(leader.unique) + '</p></article><article class="info-panel"><h2>核心循環</h2><p>' + escapeHtml(leader.coreLoop) + '</p></article><article class="info-panel"><h2>推薦地圖</h2><p>' + escapeHtml(leader.map) + '</p></article><article class="info-panel"><h2>主要優勢</h2><ul>' + leader.strengths.map(li).join("") + '</ul></article><article class="info-panel"><h2>限制與弱點</h2><ul>' + leader.weaknesses.map(li).join("") + '</ul></article></section><section class="wiki-strategy-bridge"><div><p class="kicker">STRATEGY VIEW</p><h2>需要知道該怎麼玩？</h2><p>攻略視角會加入六種勝利適性、開局至終盤策略、政策卡、區域、奇觀與失敗備案。</p></div><a class="button secondary" href="#/guide/leader/' + leader.id + '/' + bestRoute(leader) + '">查看完整攻略</a></section></div>';
  }

  function filterPanel(favoritesOnly) {
    var civs = Array.from(new Set(DATA.leaders.map(function (item) { return item.civ; }))).sort(function (a, b) { return a.localeCompare(b, "zh-Hant"); });
    var dlcs = Array.from(new Set(DATA.leaders.map(function (item) { return item.dlc; }))).sort(function (a, b) { return a.localeCompare(b, "zh-Hant"); });
    function options(values, current, placeholder) {
      return '<option value="">' + placeholder + '</option>' + values.map(function (value) { return '<option value="' + escapeHtml(value) + '"' + (value === current ? " selected" : "") + '>' + escapeHtml(value) + '</option>'; }).join("");
    }
    return '<aside class="filters" id="filters-panel" aria-label="領袖篩選">' +
      '<div class="filters-top"><h2>篩選領袖</h2><button class="text-button" type="button" data-action="clear-filters">全部清除</button></div>' +
      '<div class="filter-group"><label class="field-label" for="filter-civ">文明</label><select class="filter-select" id="filter-civ" data-filter="civ">' + options(civs, state.filters.civ, "全部文明") + '</select></div>' +
      '<div class="filter-group"><label class="field-label" for="filter-dlc">DLC</label><select class="filter-select" id="filter-dlc" data-filter="dlc">' + options(dlcs, state.filters.dlc, "全部 DLC") + '</select></div>' +
      '<div class="filter-group"><label class="field-label" for="filter-mode">模式相性</label><select class="filter-select" id="filter-mode" data-filter="mode"><option value="">全部模式</option>' + DATA.modes.map(function (mode) { return '<option value="' + mode.id + '"' + (state.filters.mode === mode.id ? " selected" : "") + '>' + escapeHtml(mode.name) + '</option>'; }).join("") + '</select></div>' +
      (!favoritesOnly ? '<label class="check-row"><input type="checkbox" data-filter="favorites"' + (state.filters.favorites ? " checked" : "") + '>只顯示收藏</label>' : "") +
      '</aside>';
  }

  function filteredLeaders(favoritesOnly) {
    var list = DATA.leaders.filter(function (leader) {
      if ((favoritesOnly || state.filters.favorites) && state.favorites.indexOf(leader.id) < 0) return false;
      if (state.filters.civ && leader.civ !== state.filters.civ) return false;
      if (state.filters.dlc && leader.dlc !== state.filters.dlc) return false;
      if (state.filters.mode) {
        var match = leader.modeMatches.find(function (item) { return item.id === state.filters.mode; });
        if (!match || match.score < 4) return false;
      }
      return true;
    });
    var routeForSort = "science";
    list.sort(function (a, b) {
      if (state.filters.sort === "grade") return gradeValue[b.routes[routeForSort].grade] - gradeValue[a.routes[routeForSort].grade] || a.name.localeCompare(b.name, "zh-Hant");
      if (state.filters.sort === "progress") return progressFor(b.id) - progressFor(a.id) || a.name.localeCompare(b.name, "zh-Hant");
      return a.name.localeCompare(b.name, "zh-Hant");
    });
    return list;
  }

  function leaderGridMarkup(list) {
    return list.length ? list.map(renderLeaderCard).join("") : '<div class="empty-state"><div><h2>找不到符合條件的領袖</h2><p>請移除一項文明、DLC、收藏或模式篩選條件。</p><button class="button secondary" type="button" data-action="clear-filters">清除篩選</button></div></div>';
  }

  function renderLeadersPage(favoritesOnly) {
    setActiveNav(favoritesOnly ? "favorites" : "guide");
    var list = filteredLeaders(favoritesOnly);
    var title = favoritesOnly ? "你的收藏" : "選擇領袖，制定勝利路線";
    var description = favoritesOnly ? "集中查看已收藏的領袖與模式，閱讀進度會在本機自動保存。" : "67 位不同領袖、74 個可選人格條目，完整涵蓋六種勝利與四個遊戲階段。";
    main.innerHTML = '<div class="page-shell"><header class="page-header"><div><p class="kicker">GATHERING STORM 規則集</p><h1>' + title + '</h1><p>' + description + '</p></div><div class="page-stat"><strong>' + DATA.meta.leaderCount + ' 位領袖</strong><span>六路線、四階段、八模式聯動</span></div></header>' +
      (favoritesOnly && state.modeFavorites.length ? renderFavoriteModes() : "") +
      '<button class="button secondary filter-toggle" type="button" data-action="toggle-filters" aria-expanded="false" aria-controls="filters-panel">開啟篩選</button>' +
      '<div class="leaders-layout">' + filterPanel(favoritesOnly) + '<section aria-label="領袖結果"><div class="results-toolbar"><div class="results-count" id="leader-results-count" role="status" aria-live="polite" aria-atomic="true"><strong>' + list.length + '</strong> 位符合條件</div><select class="sort-select" data-filter="sort" aria-label="排序方式"><option value="name"' + (state.filters.sort === "name" ? " selected" : "") + '>依名稱排序</option><option value="grade"' + (state.filters.sort === "grade" ? " selected" : "") + '>依路線適性</option><option value="progress"' + (state.filters.sort === "progress" ? " selected" : "") + '>依閱讀進度</option></select></div>' +
      '<div class="leader-grid" id="leader-results">' + leaderGridMarkup(list) + '</div></section></div></div>';
  }

  function renderFavoriteModes() {
    var favoriteModes = DATA.modes.filter(function (mode) { return state.modeFavorites.indexOf(mode.id) >= 0; });
    return '<section class="mode-match-section"><h2 class="section-heading">收藏的遊戲模式</h2><div class="mode-match-grid">' + favoriteModes.map(function (mode) {
      return '<a class="mode-mini" href="#/wiki/mode/' + mode.id + '"><div class="mode-mini-top"><h3>' + escapeHtml(mode.name) + '</h3><span class="mode-score">Wiki</span></div><p>' + escapeHtml(mode.summary) + '</p></a>';
    }).join("") + '</div></section>';
  }

  function renderLeaderDetail(leaderId, routeId) {
    var leader = DATA.leaders.find(function (item) { return item.id === leaderId; });
    if (!leader) return renderNotFound("找不到這位領袖", "領袖資料可能已移動，請返回領袖選擇頁。");
    if (DATA.routeOrder.indexOf(routeId) < 0) routeId = bestRoute(leader);
    setActiveNav("guide");
    var route = leader.routes[routeId];
    var tabs = DATA.routeOrder.map(function (id) {
      var item = leader.routes[id];
      return '<a class="route-tab' + (id === routeId ? " active" : "") + '" href="#/guide/leader/' + leader.id + '/' + id + '"' + (id === routeId ? ' aria-current="page"' : "") + '><span>' + escapeHtml(item.name) + '</span><strong>' + item.grade + '</strong></a>';
    }).join("");
    var progress = progressFor(leader.id);
    main.innerHTML = '<div class="page-shell"><nav class="breadcrumb" aria-label="麵包屑"><a href="#/guide">攻略</a><span aria-hidden="true">/</span><a href="#/guide/leaders">領袖攻略</a><span aria-hidden="true">/</span><span aria-current="page">' + escapeHtml(leader.name) + '</span></nav>' +
      '<header class="leader-hero" style="--civ-color:' + escapeHtml(leader.color) + '">' + civilizationIcon(leader, "hero-emblem") + '<div class="leader-identity"><p class="kicker">' + escapeHtml(leader.civ) + '</p><h1>' + escapeHtml(leader.name) + '</h1><p class="english-name">' + escapeHtml(leader.en) + '</p><p class="hero-hook">' + escapeHtml(leader.hook) + '</p></div><div class="hero-meta"><div class="meta-pair"><small>內容來源</small><strong>' + escapeHtml(leader.dlc) + '</strong></div><div class="meta-pair"><small>推薦地圖</small><strong>' + escapeHtml(leader.map) + '</strong></div><div class="meta-pair"><small>總進度</small><strong>' + progress + '%</strong></div><div class="hero-actions">' + favoriteButton(leader.id, "leader", leader.name) + '</div></div></header>' +
      '<nav class="content-lens" aria-label="領袖內容視角"><a class="active" href="#/guide/leader/' + leader.id + '/' + routeId + '" aria-current="page"><small>攻略</small><strong>實戰路線與階段策略</strong></a><a href="#/wiki/leader/' + leader.id + '"><small>Wiki</small><strong>能力與文明資料</strong></a></nav>' +
      '<section class="summary-grid" aria-label="領袖摘要"><article class="info-panel feature"><h2>核心循環</h2><strong>' + escapeHtml(leader.coreLoop) + '</strong><p>' + escapeHtml(leader.ability) + '</p></article><article class="info-panel"><h2>文明特色</h2><p>' + escapeHtml(leader.unique) + '</p></article><article class="info-panel"><h2>主要優勢</h2><ul>' + leader.strengths.map(li).join("") + '</ul></article><article class="info-panel"><h2>弱點</h2><ul>' + leader.weaknesses.map(li).join("") + '</ul></article><article class="info-panel"><h2>常見失誤</h2><ul>' + leader.mistakes.map(li).join("") + '</ul></article></section>' +
      '<section class="route-section"><h2 class="section-heading">勝利路線</h2><nav class="route-tabs" aria-label="勝利路線">' + tabs + '</nav>' + renderRoute(leader, route) + '</section>' + renderModeMatches(leader) + '</div>';
  }

  function li(value) { return '<li>' + escapeHtml(value) + '</li>'; }
  function handbookLi(value) { return '<li>' + renderInlineYields(value) + '</li>'; }
  function orderedList(values) { return '<ol>' + values.map(li).join("") + '</ol>'; }

  function renderRoute(leader, route) {
    var routeProgress = progressFor(leader.id, route.id);
    var stages = DATA.stageOrder.map(function (stageId, stageIndex) { return renderStage(leader, route, route.stages[stageId], stageIndex); }).join("");
    return '<div class="route-overview"><div class="route-grade grade-' + route.grade + '" aria-label="適性 ' + route.grade + '">' + route.grade + '</div><div class="route-copy"><h2>' + escapeHtml(route.name) + '勝利</h2><p>' + escapeHtml(route.overview) + '</p><p class="recommendation">' + escapeHtml(route.recommendation) + '，目前完成 ' + routeProgress + '%</p></div><div class="route-decisions"><div class="decision-item"><strong>勝利條件</strong><p>' + escapeHtml(route.winCondition) + '</p></div><div class="decision-item"><strong>轉線時機</strong><p>' + escapeHtml(route.pivot) + '</p></div><div class="decision-item"><strong>失敗備案</strong><p>' + escapeHtml(route.fallback) + '</p></div></div></div>' +
      '<div class="route-tools"><button class="text-button" type="button" data-action="reset-route" data-leader="' + leader.id + '" data-route="' + route.id + '">重設此路線進度</button></div><div class="stage-list">' + stages + '</div>';
  }

  function renderStage(leader, route, stage, stageIndex) {
    function priority(title, values) { return '<section class="priority-block"><h3>' + title + '</h3>' + orderedList(values) + '</section>'; }
    var checks = stage.checklist.map(function (label, index) {
      var key = [leader.id, route.id, stage.id, index].join(":");
      return '<label class="check-item"><input type="checkbox" data-progress="' + key + '"' + (state.progress[key] ? " checked" : "") + '><span>' + escapeHtml(label) + '</span></label>';
    }).join("");
    return '<details class="stage-card"' + (stageIndex === 0 ? " open" : "") + '><summary><span class="stage-name">' + escapeHtml(stage.name) + '</span><span class="stage-objective">' + escapeHtml(stage.objective) + '</span><span class="stage-chevron">' + chevronIcon() + '</span></summary><div class="stage-content"><section class="strategy-callout"><h3>具體策略</h3><ul>' + stage.strategy.map(li).join("") + '</ul></section><div class="priority-grid">' +
      priority("科技優先序與尤里卡", stage.techs) + priority("市政優先序與鼓舞", stage.civics) + priority("政策卡", stage.policies) + priority("區域與城市分工", stage.districts) + priority("奇觀優先序", stage.wonders) + priority("生產與購買順序", stage.queue) +
      '</div><div class="stage-notes"><div class="stage-note"><strong>外交與軍事</strong><p>' + escapeHtml(stage.diplomacy) + '</p></div><div class="stage-note"><strong>領袖特化</strong><p>' + escapeHtml(leader.hook) + '</p></div></div><section class="checklist"><h3>' + escapeHtml(stage.name) + '檢查清單</h3>' + checks + '</section></div></details>';
  }

  function renderModeMatches(leader) {
    var sorted = leader.modeMatches.slice().sort(function (a, b) { return b.score - a.score; });
    return '<section class="mode-match-section"><h2 class="section-heading">遊戲模式相性</h2><div class="mode-match-grid">' + sorted.map(function (match) {
      var mode = DATA.modes.find(function (item) { return item.id === match.id; });
      return '<a class="mode-mini" href="#/guide/mode/' + mode.id + '"><div class="mode-mini-top"><h3>' + escapeHtml(mode.name) + '</h3><span class="mode-score">' + match.score + ' / 5</span></div><p>' + escapeHtml(match.note) + '</p></a>';
    }).join("") + '</div></section>';
  }

  function renderModesPage() {
    renderGuideModesPage();
  }

  function renderModeCard(mode, lens) {
    lens = lens === "wiki" ? "wiki" : "guide";
    var impact = Object.keys(mode.victoryImpact).filter(function (key) { return ["高", "極高"].indexOf(mode.victoryImpact[key]) >= 0; }).length;
    return '<article class="mode-card"><div><div class="mode-mini-top"><h2>' + escapeHtml(mode.name) + '</h2>' + favoriteButton(mode.id, "mode", mode.name) + '</div><p class="requirement">' + escapeHtml(mode.requirement) + '</p></div><p>' + escapeHtml(mode.summary) + '</p><div class="mode-card-footer"><div class="impact-strip" title="高影響勝利路線數" aria-label="高影響勝利路線 ' + impact + ' 種">' + [0,1,2,3,4,5].map(function (i) { return '<span class="' + (i < impact ? "on" : "") + '"></span>'; }).join("") + '</div><a class="card-link" href="#/' + lens + '/mode/' + mode.id + '">' + (lens === "wiki" ? "查看規則" : "查看策略") + '</a></div></article>';
  }

  function renderSynergyMatrix() {
    var rows = DATA.modes.map(function (mode) {
      return '<tr><th scope="row"><a href="#/guide/mode/' + mode.id + '">' + escapeHtml(mode.name) + '</a></th><td>' + mode.synergies.map(function (item) { var target = DATA.modes.find(function (m) { return m.id === item.mode; }); return escapeHtml(target.name + "（" + item.rating + "）"); }).join("、") + '</td></tr>';
    }).join("");
    return '<section class="info-panel" style="margin-top:24px"><h2>模式聯動速查</h2><div style="overflow-x:auto"><table class="impact-table"><thead><tr><th>模式</th><th>主要聯動</th></tr></thead><tbody>' + rows + '</tbody></table></div></section>';
  }

  function renderGuideModesPage() {
    setActiveNav("guide");
    main.innerHTML = '<div class="page-shell guide-page"><header class="page-header"><div><p class="kicker">OPTIONAL MODES</p><h1>八種遊戲模式攻略</h1><p>從規則改變出發，整理能利用的節奏、主要風險、勝利路線影響與高風險聯動。</p></div><div class="page-stat"><strong>' + DATA.meta.modeCount + ' 種模式</strong><span>策略、風險與領袖相性</span></div></header><nav class="content-lens" aria-label="遊戲模式內容視角"><a class="active" href="#/guide/modes" aria-current="page"><small>攻略</small><strong>如何利用模式取勝</strong></a><a href="#/wiki/modes"><small>Wiki</small><strong>新增內容與規則變更</strong></a></nav><div class="mode-grid">' + DATA.modes.map(function (mode) { return renderModeCard(mode, "guide"); }).join("") + '</div>' + renderSynergyMatrix() + '</div>';
  }

  function renderModeDetail(modeId, lens) {
    var mode = DATA.modes.find(function (item) { return item.id === modeId; });
    if (!mode) return renderNotFound("找不到這個模式", "模式資料可能已移動，請返回模式總覽。");
    lens = lens === "wiki" ? "wiki" : "guide";
    setActiveNav(lens);
    var impactRows = DATA.routeOrder.map(function (routeId) { return '<tr><th scope="row">' + escapeHtml(DATA.routeNames[routeId]) + '</th><td>' + escapeHtml(mode.victoryImpact[routeId]) + '</td></tr>'; }).join("");
    var synergies = mode.synergies.map(function (item) {
      var target = DATA.modes.find(function (candidate) { return candidate.id === item.mode; });
      return '<div class="synergy-item"><a href="#/' + lens + '/mode/' + target.id + '">' + escapeHtml(target.name) + '</a><span class="rating">' + escapeHtml(item.rating) + '</span><p>' + escapeHtml(item.note) + '</p></div>';
    }).join("");
    var recommended = DATA.leaders.map(function (leader) { return { leader: leader, match: leader.modeMatches.find(function (item) { return item.id === mode.id; }) }; }).filter(function (item) { return item.match && item.match.score >= 4; }).sort(function (a, b) { return b.match.score - a.match.score; }).slice(0, 14);
    main.innerHTML = '<div class="page-shell basics-page"><nav class="breadcrumb" aria-label="麵包屑"><a href="#/' + lens + '">' + (lens === "wiki" ? "Wiki" : "攻略") + '</a><span aria-hidden="true">/</span><a href="#/' + lens + '/modes">遊戲模式</a><span aria-hidden="true">/</span><span aria-current="page">' + escapeHtml(mode.name) + '</span></nav><header class="mode-hero basics-mode-hero"><div><p class="kicker">' + (lens === "wiki" ? "GAME MODE REFERENCE" : "GAME MODE STRATEGY") + '</p><h1>' + escapeHtml(mode.name) + '</h1><p class="english-name">' + escapeHtml(mode.en) + '</p><p class="summary">' + escapeHtml(mode.summary) + '</p></div><div class="requirement-panel"><small>啟用需求</small><strong>' + escapeHtml(mode.requirement) + '</strong><div class="hero-actions">' + favoriteButton(mode.id, "mode", mode.name) + '</div></div></header><nav class="content-lens" aria-label="模式內容視角"><a class="' + (lens === "guide" ? "active" : "") + '" href="#/guide/mode/' + mode.id + '"' + (lens === "guide" ? ' aria-current="page"' : "") + '><small>攻略</small><strong>玩法、風險與聯動</strong></a><a class="' + (lens === "wiki" ? "active" : "") + '" href="#/wiki/mode/' + mode.id + '"' + (lens === "wiki" ? ' aria-current="page"' : "") + '><small>Wiki</small><strong>新增內容與規則</strong></a></nav>' +
      '<div class="mode-content-grid"><article class="info-panel"><h2>新增內容</h2><ol>' + mode.newContent.map(li).join("") + '</ol></article><article class="info-panel"><h2>規則</h2><ol>' + mode.rules.map(li).join("") + '</ol></article><article class="info-panel"><h2>玩法利用</h2><ol>' + mode.exploits.map(li).join("") + '</ol></article><article class="info-panel"><h2>主要風險</h2><ol>' + mode.risks.map(li).join("") + '</ol></article></div>' +
      '<div class="mode-content-grid"><section class="info-panel"><h2>勝利路線影響</h2><table class="impact-table"><thead><tr><th>路線</th><th>影響</th></tr></thead><tbody>' + impactRows + '</tbody></table></section><section class="info-panel"><h2>模式聯動</h2><div class="synergy-list">' + synergies + '</div></section></div>' +
      '<section class="info-panel" style="margin-top:14px"><h2>推薦領袖</h2><div class="recommended-leaders">' + recommended.map(function (item) { return '<a class="leader-chip" href="#/guide/leader/' + item.leader.id + '/' + bestRoute(item.leader) + '"><span class="chip-dot" style="--chip-color:' + escapeHtml(item.leader.color) + '"></span>' + escapeHtml(item.leader.name) + ' ' + item.match.score + '/5</a>'; }).join("") + '</div></section></div>';
  }

  function basicTypeName(type) {
    return { bonus: "加成資源", luxury: "奢侈資源", strategic: "戰略資源", terrain: "基礎地形", hills: "丘陵", water: "水域", feature: "地貌" }[type] || type;
  }

  function gameIcon(folder, item, className) {
    return '<img class="' + escapeHtml(className) + '" src="assets/game-icons/' + escapeHtml(folder) + '/' + escapeHtml(item.id) + '.png" width="96" height="96" loading="lazy" decoding="async" alt="" aria-hidden="true">';
  }

  function handbookRouteLabel(route) {
    route = canonicalRoute(route);
    if (route.indexOf("#/wiki/terrain") === 0) return "地形地貌與改良";
    if (route.indexOf("#/wiki/resources") === 0) return "資源圖鑑";
    if (route.indexOf("#/wiki/infrastructure") === 0) return "區域、建築與城市項目";
    if (route.indexOf("#/wiki/governments") === 0) return "政體與政策卡";
    if (route.indexOf("#/wiki/religions") === 0) return "宗教與信條";
    if (route.indexOf("#/wiki/governors") === 0) return "總督";
    if (route.indexOf("#/wiki/modes") === 0 || route.indexOf("#/wiki/mode/") === 0) return "遊戲模式";
    if (route.indexOf("#/guide/decisions") === 0) return "局勢診斷";
    if (route.indexOf("#/guide/progression") === 0) return "科技市政節奏";
    if (route.indexOf("#/guide/combat") === 0) return "兵種與戰鬥";
    if (route.indexOf("#/wiki/systems") === 0) return "核心機制";
    if (route.indexOf("#/guide/leaders") === 0) return "領袖攻略";
    return "相關攻略";
  }

  function handbookLinks(links) {
    return '<div class="handbook-links">' + links.map(function (link) {
      var route = typeof link === "string" ? link : link.route;
      var label = typeof link === "string" ? handbookRouteLabel(link) : link.label;
      return '<a href="' + escapeHtml(canonicalRoute(route)) + '">' + escapeHtml(label) + '<span aria-hidden="true">→</span></a>';
    }).join("") + '</div>';
  }

  function renderHandbookShortcuts(active) {
    if (!DATA.handbook) return "";
    var items = [
      { id: "decisions", title: "我現在該做什麼", meta: DATA.handbook.decisions.length + " 種常見局勢", note: "從症狀反推行動順序" },
      { id: "progression", title: "科技與市政節奏", meta: DATA.handbook.progression.eras.length + " 個時代", note: "解鎖、尤里卡與轉向" },
      { id: "combat", title: "兵種與戰鬥", meta: DATA.handbook.combat.classes.length + " 類兵種", note: "站位、克制與攻城" },
      { id: "systems", title: "核心機制", meta: DATA.handbook.systems.length + " 個系統", note: "忠誠、商路、氣候等" }
    ];
    return '<nav class="handbook-shortcuts" aria-label="新手決策工具">' + items.map(function (item) {
      var route = item.id === "systems" ? "#/wiki/systems" : "#/guide/" + item.id;
      return '<a class="handbook-shortcut' + (active === item.id ? " active" : "") + '" href="' + route + '"' + (active === item.id ? ' aria-current="page"' : "") + '><span>' + escapeHtml(item.meta) + '</span><strong>' + escapeHtml(item.title) + '</strong><small>' + escapeHtml(item.note) + '</small></a>';
    }).join("") + '</nav>';
  }

  function renderTileCalculator() {
    var layers = ["基礎地形", "地貌", "資源", "改良與科技"];
    return '<details class="calculator-card" id="tile-calculator"><summary><span><small>INTERACTIVE TOOL</small><strong>地塊產出加總器</strong><em>把地圖上的食物與產能逐層相加</em></span></summary><div class="calculator-details"><div class="tile-calc-grid"><span class="calc-heading">來源</span><span class="calc-heading">食物</span><span class="calc-heading">產能</span>' + layers.map(function (layer, index) {
      return '<label><span>' + layer + '</span></label><label><span class="sr-only">' + layer + '食物</span><input type="number" inputmode="decimal" step="0.5" value="0" data-tile-yield="food" data-layer="' + index + '"></label><label><span class="sr-only">' + layer + '產能</span><input type="number" inputmode="decimal" step="0.5" value="0" data-tile-yield="production" data-layer="' + index + '"></label>';
    }).join("") + '<strong>最終產出</strong><output data-tile-total="food">0 食物</output><output data-tile-total="production">0 產能</output></div><p class="calculator-note">人口必須實際工作該格，城市才會收到一般地塊產出；收穫與砍伐是一次性收益，不加入這裡。</p></div></details>';
  }

  function renderAdjacencyCalculator() {
    return '<details class="calculator-card" id="adjacency-calculator"><summary><span><small>INTERACTIVE TOOL</small><strong>區域相鄰加成估算器</strong><em>快速比較學院、聖地、工業區等候選位置</em></span></summary><div class="calculator-details"><label class="calculator-select"><span>選擇區域</span><select id="adjacency-district"><option value="campus">學院</option><option value="holy-site">聖地</option><option value="industrial-zone">工業區</option><option value="commercial-hub">商業中心</option><option value="harbor">港口</option><option value="theater-square">劇院廣場</option></select></label><div class="adjacency-inputs" id="adjacency-inputs"></div><div class="calculator-result"><span>估算相鄰加成</span><output id="adjacency-total">+0</output></div><p class="calculator-note">此工具按常見 Gathering Storm 基礎規則估算；領袖能力、萬神殿、政策卡與特色區域可能再改變結果。</p></div></details>';
  }

  function renderDecisionGuide() {
    var decisions = DATA.handbook.decisions.map(function (item) {
      return '<details class="knowledge-card decision-card" id="decision-' + escapeHtml(item.id) + '"><summary><span><small>局勢診斷</small><strong>' + escapeHtml(item.title) + '</strong><em>' + escapeHtml(item.question) + '</em></span></summary><div class="knowledge-details"><p class="knowledge-summary">' + renderInlineYields(item.summary) + '</p><div class="decision-columns"><section><h3>先檢查</h3><ul>' + item.diagnosis.map(handbookLi).join("") + '</ul></section><section><h3>建議順序</h3><ol>' + item.actions.map(handbookLi).join("") + '</ol></section></div><aside class="avoid-note"><strong>避免</strong><p>' + renderInlineYields(item.avoid) + '</p></aside>' + handbookLinks(item.links) + '</div></details>';
    }).join("");
    return '<section class="guide-intro"><div><p class="kicker">DECISION FIRST</p><h2>先描述問題，再找到下一個回合的動作</h2><p>不必先讀完整本百科。從目前卡住的情況開始，依序檢查原因、操作與停損條件。</p></div><span class="version-badge">內容版 ' + escapeHtml(DATA.handbook.meta.version) + '</span></section><div class="decision-grid">' + decisions + '</div><section class="calculator-section"><div class="section-heading-row"><div><p class="kicker">QUICK CALCULATORS</p><h2>把常見心算變成可重複檢查的工具</h2></div><p>所有輸入只在目前頁面計算，不會上傳或離開瀏覽器。</p></div><div class="calculator-grid">' + renderTileCalculator() + renderAdjacencyCalculator() + '</div></section>';
  }

  function renderProgressionGuide() {
    var principles = DATA.handbook.progression.principles.map(function (item) { return '<article><h3>' + escapeHtml(item.title) + '</h3><p>' + escapeHtml(item.detail) + '</p></article>'; }).join("");
    var eras = DATA.handbook.progression.eras.map(function (era) {
      return '<details class="knowledge-card era-card" id="era-' + escapeHtml(era.id) + '"><summary><span><small>科技 × 市政</small><strong>' + escapeHtml(era.name) + '</strong><em>' + escapeHtml(era.pivot) + '</em></span></summary><div class="knowledge-details progression-columns"><section><h3>科技優先</h3><ul>' + era.techFocus.map(handbookLi).join("") + '</ul></section><section><h3>市政優先</h3><ul>' + era.civicFocus.map(handbookLi).join("") + '</ul></section><section><h3>尤里卡／鼓舞安排</h3><ul>' + era.boosts.map(handbookLi).join("") + '</ul></section><aside><strong>轉向判斷</strong><p>' + renderInlineYields(era.pivot) + '</p></aside></div></details>';
    }).join("");
    return '<section class="guide-intro"><div><p class="kicker">TECH & CIVIC ROADMAP</p><h2>兩棵樹服務同一個十至二十回合目標</h2><p>每個時代列出高價值解鎖、容易安排的加速，以及何時應停止照表研究並轉向戰局需求。</p></div></section><div class="principle-grid">' + principles + '</div><div class="knowledge-grid era-grid">' + eras + '</div>';
  }

  function renderCombatGuide() {
    var classes = DATA.handbook.combat.classes.map(function (item) {
      return '<details class="knowledge-card combat-card" id="combat-' + escapeHtml(item.id) + '"><summary><span><small>' + escapeHtml(item.en) + '</small><strong>' + escapeHtml(item.name) + '</strong><em>' + escapeHtml(item.role) + '</em></span></summary><div class="knowledge-details"><dl class="combat-facts"><div><dt>站位</dt><dd>' + escapeHtml(item.position) + '</dd></div><div><dt>弱點</dt><dd>' + escapeHtml(item.counter) + '</dd></div><div><dt>升級線</dt><dd>' + escapeHtml(item.upgrade) + '</dd></div></dl></div></details>';
    }).join("");
    var rules = DATA.handbook.combat.rules.map(function (rule) { return '<article><h3>' + escapeHtml(rule.title) + '</h3><p>' + escapeHtml(rule.detail) + '</p></article>'; }).join("");
    return '<section class="guide-intro"><div><p class="kicker">COMBAT MANUAL</p><h2>先看角色與站位，不再只比面板戰鬥力</h2><p>兵種卡片說明它應該站在哪裡、克制什麼以及何時升級；後面再整理攻城的完整順序。</p></div></section><div class="knowledge-grid combat-grid">' + classes + '</div><section class="combat-rules"><div class="section-heading-row"><h2>六條會反覆用到的戰鬥規則</h2></div><div class="principle-grid">' + rules + '</div></section><section class="siege-plan" id="siege-plan"><p class="kicker">SIEGE PLAN</p><h2>攻下一座有城牆城市</h2><ol>' + DATA.handbook.combat.siege.map(handbookLi).join("") + '</ol>' + handbookLinks([{ label: "忠誠度與佔領後處理", route: "#/wiki/systems?focus=system-loyalty" }, { label: "軍事政策卡", route: "#/wiki/governments?category=military" }]) + '</section>';
  }

  function renderSystemsGuide() {
    return '<section class="guide-intro"><div><p class="kicker">CORE SYSTEMS</p><h2>看懂數值背後的因果，才能判斷真正瓶頸</h2><p>每個系統只保留監控指標、可執行動作與相關章節，適合遊戲中快速查閱。</p></div></section><div class="knowledge-grid system-grid">' + DATA.handbook.systems.map(function (item) {
      return '<details class="knowledge-card system-card" id="system-' + escapeHtml(item.id) + '"><summary><span><small>' + escapeHtml(item.en) + '</small><strong>' + escapeHtml(item.name) + '</strong><em>' + renderInlineYields(item.summary) + '</em></span></summary><div class="knowledge-details"><div class="system-columns"><section><h3>觀察什麼</h3><ul>' + item.watch.map(handbookLi).join("") + '</ul></section><section><h3>可以做什麼</h3><ol>' + item.actions.map(handbookLi).join("") + '</ol></section></div>' + handbookLinks(item.links) + '</div></details>';
    }).join("") + '</div>';
  }

  function renderGuidePage(section) {
    if (["decisions", "progression", "combat", "systems"].indexOf(section) < 0) section = "decisions";
    setActiveNav("guide");
    var titles = {
      decisions: ["新手決策中心", "遇到問題時，先找到下一個有效動作"],
      progression: ["科技與市政路線圖", "用時代節奏串起解鎖、加速與轉向"],
      combat: ["兵種與戰鬥手冊", "從站位、克制到攻城完整拆解"],
      systems: ["文明核心機制", "把人口、忠誠、商路、外交與氣候連起來"]
    }[section];
    var content = section === "decisions" ? renderDecisionGuide() : section === "progression" ? renderProgressionGuide() : section === "combat" ? renderCombatGuide() : renderSystemsGuide();
    main.innerHTML = '<div class="page-shell guide-page"><header class="page-header"><div><p class="kicker">BEGINNER FIELD MANUAL</p><h1>' + titles[0] + '</h1><p>' + titles[1] + '。所有內容均以 Gathering Storm、標準速度與單人中高難度為基準。</p></div><div class="page-stat"><strong>' + escapeHtml(DATA.handbook.meta.version) + '</strong><span>攻略內容版本</span></div></header>' + renderHandbookShortcuts(section) + '<div class="guide-content">' + content + '</div></div>';
    scheduleRouteFocus(routeQuery().get("focus"), "center");
  }

  function renderWikiSystemsPage() {
    setActiveNav("wiki");
    main.innerHTML = '<div class="page-shell wiki-page"><nav class="breadcrumb" aria-label="麵包屑"><a href="#/wiki">Wiki</a><span aria-hidden="true">/</span><span aria-current="page">核心機制</span></nav><header class="page-header"><div><p class="kicker">CORE SYSTEMS</p><h1>文明核心機制</h1><p>整理人口、忠誠、商路、城邦、間諜、時代分數、氣候、外交、奇觀與戰爭疲勞的因果關係。</p></div><div class="page-stat"><strong>' + DATA.handbook.systems.length + ' 個系統</strong><span>觀察指標與可執行動作</span></div></header><div class="guide-content">' + renderSystemsGuide() + '</div></div>';
    scheduleRouteFocus(routeQuery().get("focus"), "center");
  }

  function basicsTabs(section) {
    var tabs = [
      { id: "terrain", label: "地形地貌與改良", meta: DATA.meta.terrainCount + " + " + DATA.meta.improvementCount },
      { id: "resources", label: "資源圖鑑", meta: DATA.meta.resourceCount + " 項" },
      { id: "infrastructure", label: "區域建築與項目", meta: DATA.meta.districtCount + " + " + DATA.meta.buildingCount + " + " + DATA.meta.projectCount },
      { id: "governments", label: "政體與政策卡", meta: DATA.meta.governmentCount + " + " + DATA.meta.policyCount },
      { id: "religions", label: "宗教與信條", meta: DATA.meta.religionCount + " + " + DATA.meta.beliefCount },
      { id: "great-people", label: "偉人", meta: DATA.meta.greatPersonCount + " 位" },
      { id: "governors", label: "總督", meta: DATA.meta.governorCount + " 位" },
      { id: "modes", label: "遊戲模式", meta: DATA.meta.modeCount + " 種" }
    ];
    var current = tabs.find(function (tab) { return tab.id === section; }) || tabs[0];
    return '<details class="wiki-section-switcher"><summary><span><small>Wiki 百科分類</small><strong>' + current.label + '</strong></span><span class="wiki-section-switcher-action">切換 ' + tabs.length + ' 類</span></summary><nav class="basics-tabs" aria-label="Wiki 百科分類">' + tabs.map(function (tab) {
      return '<a class="basics-tab' + (tab.id === section ? " active" : "") + '" href="#/wiki/' + tab.id + '"' + (tab.id === section ? ' aria-current="page"' : "") + '><strong>' + tab.label + '</strong><span>' + tab.meta + '</span></a>';
    }).join("") + '</nav></details>';
  }

  function basicsFilterBar(section) {
    if (section === "resources") return "";
    var select = "";
    if (section === "terrain") {
      select = '<label><span class="field-label">地塊類型</span><select class="filter-select" data-basics-filter="terrainKind"><option value="">全部類型</option>' +
        [["terrain", "基礎地形"], ["hills", "丘陵"], ["water", "水域"], ["feature", "地貌"], ["improvement", "改良設施"]].map(function (item) { return '<option value="' + item[0] + '"' + (state.basicsFilters.terrainKind === item[0] ? " selected" : "") + '>' + item[1] + '</option>'; }).join("") + '</select></label>';
    } else {
      var eras = Array.from(new Set(DATA.basics.improvements.map(function (item) { return item.era; })));
      select = '<label><span class="field-label">解鎖時期</span><select class="filter-select" data-basics-filter="improvementEra"><option value="">全部時期</option>' + eras.map(function (era) { return '<option value="' + escapeHtml(era) + '"' + (state.basicsFilters.improvementEra === era ? " selected" : "") + '>' + escapeHtml(era) + '</option>'; }).join("") + '</select></label>';
    }
    return '<div class="basics-filter basics-filter-' + escapeHtml(section) + '" role="group" aria-label="本章分類篩選">' + select + '<button class="button secondary" type="button" data-action="clear-basics-filters">清除篩選</button></div>';
  }

  function matchesBasics(item) {
    return Boolean(item);
  }

  function renderYieldGroup(values) {
    var iconIds = { "食物": "food", "產能": "production", "金幣": "gold", "科技": "science", "文化": "culture", "信仰": "faith" };
    var pattern = /([+-]?\d+)\s*(食物|產能|金幣|科技|文化|信仰)/g;
    var tokens = [];
    values.forEach(function (value) {
      var match;
      pattern.lastIndex = 0;
      while ((match = pattern.exec(value))) tokens.push({ amount: match[1], type: match[2] });
    });
    if (!tokens.length) {
      return '<span class="yield-group yield-group-text">' + escapeHtml(values.join("、")) + '</span>';
    }
    var label = tokens.map(function (token) { return token.amount + " " + token.type; }).join("、");
    var output = tokens.map(function (token) {
      return '<span class="yield-token"><b class="yield-number">' + escapeHtml(token.amount) + '</b><img class="yield-game-icon" src="assets/game-icons/yields/' + iconIds[token.type] + '.png" width="22" height="22" loading="lazy" decoding="async" alt="" aria-hidden="true"></span>';
    }).join("");
    return '<span class="yield-group" aria-label="' + escapeHtml(label) + '">' + output + '</span>';
  }

  function renderInlineYields(value) {
    var iconIds = { "食物": "food", "產能": "production", "金幣": "gold", "科技": "science", "科技值": "science", "文化": "culture", "文化值": "culture", "信仰": "faith", "信仰值": "faith" };
    var pattern = /([+−-]?\d+(?:\.\d+)?\s*)?(食物|產能|金幣)|([+−-]?\d+(?:\.\d+)?)\s*(科技值?|文化值?|信仰值?)/g;
    var output = "";
    var lastIndex = 0;
    var match;
    while ((match = pattern.exec(String(value || "")))) {
      output += escapeHtml(String(value || "").slice(lastIndex, match.index));
      var amount = (match[1] || match[3] || "").trim();
      var type = match[2] || match[4];
      var accessible = (amount ? amount + " " : "") + type;
      output += '<span class="inline-yield-term" role="img" aria-label="' + escapeHtml(accessible) + '">' + (amount ? '<b>' + escapeHtml(amount) + '</b>' : '') + '<img src="assets/game-icons/yields/' + iconIds[type] + '.png" width="22" height="22" loading="lazy" decoding="async" alt="" aria-hidden="true"></span>';
      lastIndex = pattern.lastIndex;
    }
    return output + escapeHtml(String(value || "").slice(lastIndex));
  }

  function scrollFilteredResultIntoView(selector) {
    requestAnimationFrame(function () {
      var target = main.querySelector(selector);
      if (!target) return;
      var header = document.querySelector(".topbar");
      var sticky = main.querySelector(".basics-sticky-controls");
      var offset = (header ? header.getBoundingClientRect().height : 0) + 14;
      if (sticky && !sticky.classList.contains("sticky-limit-exceeded") && getComputedStyle(sticky).position === "sticky") {
        offset += sticky.getBoundingClientRect().height + 10;
      }
      var top = window.scrollY + target.getBoundingClientRect().top - offset;
      window.scrollTo({ top: Math.max(0, top), behavior: prefersReducedMotion() ? "auto" : "smooth" });
    });
  }

  function renderTerrainResources(resourceNames) {
    return '<span class="terrain-resource-list">' + resourceNames.map(function (name) {
      var compactName = name.replace(/可能延伸.*$/, "").replace(/^離岸/, "");
      var resource = DATA.basics.resources.find(function (item) { return item.name === name || item.name === compactName || compactName.indexOf(item.name) >= 0; });
      if (!resource) return '<span class="terrain-resource-chip">' + escapeHtml(name) + '</span>';
      return '<a class="terrain-resource-chip" href="#/wiki/resources?focus=basic-' + escapeHtml(resource.id) + '" aria-label="查看資源：' + escapeHtml(name) + '" title="' + escapeHtml(name) + '">' + gameIcon("resources", resource, "terrain-resource-icon") + '<span>' + escapeHtml(name) + '</span></a>';
    }).join("") + '</span>';
  }

  function renderImprovementEffect(value) {
    var iconIds = {
      "食物": "food",
      "產能": "production",
      "金幣": "gold",
      "科技": "science",
      "文化": "culture",
      "信仰": "faith",
      "住房": "housing",
      "宜居度": "amenities",
      "旅遊": "tourism",
      "電力": "power"
    };
    var pattern = /([+−-]?\d+(?:\.\d+)?)\s*(食物|產能|金幣|科技|文化|信仰|住房|宜居度|旅遊|電力)|((?:鄰格)?魅力)\s*([+−-]\d+(?:\.\d+)?)|((?:鄰格)?魅力|住房|宜居度|旅遊|電力)/g;
    var output = "";
    var lastIndex = 0;
    var match;

    function metricVisual(type) {
      var iconId = iconIds[type];
      if (!iconId) return '<span class="improvement-metric-name">' + escapeHtml(type) + '</span>';
      return '<img class="improvement-yield-icon" src="assets/game-icons/yields/' + iconId + '.png" width="22" height="22" loading="lazy" decoding="async" alt="" aria-hidden="true">';
    }

    while ((match = pattern.exec(value))) {
      output += escapeHtml(value.slice(lastIndex, match.index));
      if (match[5]) {
        output += iconIds[match[5]]
          ? '<span class="improvement-metric-icon" role="img" aria-label="' + escapeHtml(match[5]) + '">' + metricVisual(match[5]) + '</span>'
          : metricVisual(match[5]);
        lastIndex = pattern.lastIndex;
        continue;
      }
      var amount = match[1] || match[4];
      var type = match[2] || match[3];
      var numericAmount = Number(amount.replace("−", "-"));
      var direction = numericAmount > 0 ? "positive" : numericAmount < 0 ? "negative" : "neutral";
      var label = (match[3] ? type + " " + amount : amount + " " + type);
      var metric = metricVisual(type);
      output += '<span class="improvement-effect-token is-' + direction + '" aria-label="' + escapeHtml(label) + '">' + (match[3] ? metric : "") + '<b>' + escapeHtml(amount) + '</b>' + (match[3] ? "" : metric) + '</span>';
      lastIndex = pattern.lastIndex;
    }

    output += escapeHtml(value.slice(lastIndex));
    return '<span class="improvement-effect">' + output + '</span>';
  }

  function renderTerrainCard(item) {
    return '<details class="terrain-card" id="basic-' + escapeHtml(item.id) + '"><summary><div class="terrain-card-head"><div class="terrain-icon-frame">' + gameIcon("terrain", item, "terrain-game-icon") + '</div><div><span class="basic-kind">' + escapeHtml(basicTypeName(item.kind)) + '</span><h2>' + escapeHtml(item.name) + '</h2><p class="english">' + escapeHtml(item.en) + '</p></div></div>' +
      '<div class="yield-row" aria-label="地塊產出">' + renderYieldGroup(item.yields) + '</div><span class="terrain-expand" aria-hidden="true"></span></summary><div class="terrain-details"><p class="terrain-role">' + escapeHtml(item.role) + '</p>' +
      '<dl class="tile-facts"><div><dt>移動</dt><dd>' + escapeHtml(item.movement) + '</dd></div><div><dt>魅力</dt><dd>' + escapeHtml(item.appeal) + '</dd></div><div><dt>防禦</dt><dd>' + escapeHtml(item.defense) + '</dd></div></dl>' +
      '<div class="basic-detail"><strong>建造者能做什麼</strong><p>' + escapeHtml(item.build) + '</p></div>' + (item.resources.length ? '<div class="basic-detail"><strong>常見資源</strong>' + renderTerrainResources(item.resources) + '</div>' : "") + '</div></details>';
  }

  function renderTerrainGuide() {
    var terrainKind = state.basicsFilters.terrainKind;
    var terrainList = DATA.basics.terrains.filter(function (item) { return matchesBasics(item) && (!terrainKind || (terrainKind !== "improvement" && item.kind === terrainKind)); });
    var improvementList = DATA.basics.improvements.filter(matchesBasics);
    var showTerrains = terrainKind !== "improvement";
    var showImprovements = !terrainKind || terrainKind === "improvement";
    var rules = DATA.basics.quickRules.map(function (rule) { return '<article><h2>' + escapeHtml(rule.title) + '</h2><p>' + escapeHtml(rule.detail) + '</p></article>'; }).join("");
    var terrainCatalog = showTerrains ? '<section class="merged-basics-catalog" id="terrain-catalog"><div class="section-heading-row"><div><p class="kicker">TERRAIN & FEATURES</p><h2>地形與地貌</h2></div><p>顯示 <strong>' + terrainList.length + '</strong> 項；點開查看產出、移動、防禦、資源與可用改良。</p></div><div class="terrain-grid">' + (terrainList.length ? terrainList.map(renderTerrainCard).join("") : renderBasicsEmpty()) + '</div></section>' : "";
    var improvementCatalog = showImprovements ? '<section class="merged-basics-catalog improvement-catalog" id="improvement-catalog">' + renderBuilderPriority() + '<div class="section-heading-row"><div><p class="kicker">BUILDER IMPROVEMENTS</p><h2>建造者改良設施</h2></div><p>顯示 <strong>' + improvementList.length + '</strong> 項；點開查看解鎖、可建地塊、立即效果與後續升級。</p></div><div class="improvement-grid">' + (improvementList.length ? improvementList.map(renderImprovementCard).join("") : renderBasicsEmpty()) + '</div>' + renderFeatureActions() + '</section>' : "";
    return '<section class="basics-equation" aria-labelledby="tile-formula-title"><div><h2 id="tile-formula-title">一格地的產出怎麼算</h2><p>先看基礎地形，再疊加地貌、資源與改良。人口工作該格後，城市才會收到最終產出。</p></div><div class="tile-formula" aria-label="基礎地形加地貌加資源加改良等於最終地塊產出"><span>基礎地形</span><span data-operator="+">地貌</span><span data-operator="+">資源</span><span data-operator="+">改良</span><strong data-operator="=">最終產出</strong></div></section><section class="quick-rule-grid" aria-label="新手必讀規則">' + rules + '</section>' + basicsFilterBar("terrain") + terrainCatalog + improvementCatalog;
  }

  function renderResourceCard(item) {
    return '<details class="resource-card resource-' + escapeHtml(item.type) + '" id="basic-' + escapeHtml(item.id) + '"><summary><div class="resource-summary"><span class="resource-type">' + escapeHtml(basicTypeName(item.type)) + '</span><div class="entity-title-line"><h2>' + escapeHtml(item.name) + '</h2><span class="resource-icon-frame">' + gameIcon("resources", item, "resource-game-icon") + '</span></div><p class="english">' + escapeHtml(item.en) + '</p></div><div class="resource-summary-yield" aria-label="資源增加的地塊產出">' + renderYieldGroup([item.yield]) + '</div><span class="resource-expand" aria-hidden="true"></span></summary><div class="resource-details"><div class="resource-placement"><strong>生成地塊</strong><p>' + escapeHtml(item.placements.join("、")) + '</p></div><dl class="resource-facts"><div><dt>改良</dt><dd>' + escapeHtml(item.improvement) + '</dd></div><div><dt>施工解鎖</dt><dd>' + escapeHtml(item.unlock) + '</dd></div><div><dt>揭示</dt><dd>' + escapeHtml(item.reveal) + '</dd></div></dl><p class="beginner-tip">' + escapeHtml(item.use) + '</p></div></details>';
  }

  function renderResourceGuide() {
    var list = DATA.basics.resources.filter(function (item) { return matchesBasics(item) && (!state.basicsFilters.resourceType || item.type === state.basicsFilters.resourceType); });
    var counts = ["bonus", "luxury", "strategic"].map(function (type) {
      var active = state.basicsFilters.resourceType === type;
      return '<button type="button" class="resource-type-button' + (active ? " active" : "") + '" data-resource-type="' + type + '" aria-pressed="' + active + '" aria-controls="resource-results"><strong>' + DATA.basics.resources.filter(function (item) { return item.type === type; }).length + '</strong><span>' + basicTypeName(type) + '</span><small>' + (active ? "目前顯示" : "查看全部") + '</small></button>';
    }).join("");
    return '<section class="resource-intro"><div><h2>三類資源，三種處理方式</h2><p>點選類型即可跳到對應圖鑑。加成資源提高地塊產出且能收穫；奢侈資源改良後提供宜居度；戰略資源需先被科技揭示，再進入庫存供單位與電力使用。</p></div><div class="resource-counts" role="group" aria-label="依資源類型篩選">' + counts + '</div></section>' + basicsFilterBar("resources") + '<div class="resource-grid" id="resource-results" aria-label="' + escapeHtml(state.basicsFilters.resourceType ? basicTypeName(state.basicsFilters.resourceType) : "全部資源") + '">' + (list.length ? list.map(renderResourceCard).join("") : renderBasicsEmpty()) + '</div>';
  }

  function renderImprovementCard(item) {
    return '<details class="improvement-card" id="basic-' + escapeHtml(item.id) + '"><summary><div class="improvement-summary"><span class="unlock-type">' + escapeHtml(item.unlockType) + '</span><div class="improvement-heading"><span class="improvement-icon-frame">' + gameIcon("improvements", item, "improvement-game-icon") + '</span><span><h2>' + escapeHtml(item.name) + '</h2><span class="english">' + escapeHtml(item.en) + '</span></span></div><span class="improvement-preview"><strong>立即效果</strong>' + renderImprovementEffect(item.effect) + '</span></div><span class="improvement-expand" aria-hidden="true"></span></summary><div class="improvement-details"><div class="unlock-badge"><small>解鎖</small><strong>' + escapeHtml(item.unlock) + '</strong></div><div class="improvement-main"><div><strong>可建地塊</strong><p>' + escapeHtml(item.valid) + '</p></div><div><strong>立即效果</strong><p>' + renderImprovementEffect(item.effect) + '</p></div><div><strong>後續升級</strong><p>' + escapeHtml(item.later) + '</p></div></div><p class="beginner-tip"><strong>新手判斷：</strong>' + escapeHtml(item.tip) + '</p></div></details>';
  }

  function renderBuilderPriority() {
    return '<section class="builder-priority"><div><h2>建造者先跟著瓶頸走</h2><p>缺食物先農場與漁船，缺產能先礦場與伐木場，需要宜居度就先開發一種尚未擁有的奢侈品。不要為了用完次數而改良沒有人口工作的地塊。</p></div><ol><li><strong>先接通資源</strong><span>奢侈品與戰略資源優先</span></li><li><strong>再改良工作格</strong><span>城市目前有人口工作的地塊</span></li><li><strong>最後整理規劃</strong><span>農場群、魅力與區域位置</span></li></ol></section>';
  }

  function renderFeatureActions() {
    var actions = DATA.basics.actions.map(function (item) { return '<article><strong>' + escapeHtml(item.unlock) + '</strong><h3>' + escapeHtml(item.action) + '</h3><p>' + escapeHtml(item.result) + '</p></article>'; }).join("");
    return '<section class="feature-actions"><div class="section-heading-row"><h2>科技與市政還會改變地貌操作</h2><p>這些不是新的改良設施，但會直接改變建造者能否清除、保留或重新種植地貌。</p></div><div class="action-grid">' + actions + '</div></section>';
  }

  function renderImprovementGuide() {
    var list = DATA.basics.improvements.filter(function (item) { return matchesBasics(item) && (!state.basicsFilters.improvementEra || item.era === state.basicsFilters.improvementEra); });
    return renderBuilderPriority() + basicsFilterBar("improvements") + '<div class="improvement-grid">' + (list.length ? list.map(renderImprovementCard).join("") : renderBasicsEmpty()) + '</div>' + renderFeatureActions();
  }

  function infrastructureIcon(item, className) {
    return '<img class="' + escapeHtml(className) + '" src="assets/game-icons/infrastructure/' + escapeHtml(item.icon) + '" width="96" height="96" loading="lazy" decoding="async" alt="" aria-hidden="true">';
  }

  function renderInfrastructureRequirements(items) {
    return items.length ? '<dl class="infrastructure-facts">' + items.map(function (item) {
      return '<div><dt>' + escapeHtml(item.label) + '</dt><dd>' + escapeHtml(item.value) + '</dd></div>';
    }).join("") + '</dl>' : "";
  }

  function renderInfrastructureList(title, values, className) {
    return values && values.length ? '<section class="infrastructure-list ' + escapeHtml(className || "") + '"><strong>' + escapeHtml(title) + '</strong><ul>' + values.map(li).join("") + '</ul></section>' : "";
  }

  function renderDistrictCard(district) {
    var replacements = district.replacedBy.length ? '<div class="replacement-row"><strong>特色替代</strong>' + district.replacedBy.map(function (name) { return '<span>' + escapeHtml(name) + '</span>'; }).join("") + '</div>' : "";
    return '<details class="infrastructure-card district-card' + (district.unique ? " unique" : "") + '" id="infrastructure-' + escapeHtml(district.id) + '"><summary><span class="infrastructure-icon district-icon">' + infrastructureIcon(district, "infrastructure-game-icon") + '</span><span class="infrastructure-summary"><span class="infrastructure-kind">' + (district.unique ? "文明特色區域" : "區域") + '</span><strong>' + escapeHtml(district.name) + '</strong><small>' + escapeHtml(district.en) + '</small></span></summary><div class="infrastructure-details"><p class="infrastructure-description">' + escapeHtml(district.description) + '</p><section class="placement-guide"><div><span>最高收益位置</span><p>' + escapeHtml(district.placement.best) + '</p></div><div><span>新手判斷標準</span><p>' + escapeHtml(district.placement.target) + '</p></div></section>' + renderInfrastructureList("完整相鄰加成", district.adjacency, "adjacency-list") + renderInfrastructureList("區域效果", district.effects, "effect-list") + renderInfrastructureList("專家產出", district.citizenYields, "citizen-list") + renderInfrastructureList("商路產出", district.tradeYields, "trade-list") + replacements + renderInfrastructureRequirements(district.requirements) + '</div></details>';
  }

  function isCivilizationUniqueBuilding(building) {
    var societyBuildings = ["舊神方尖碑", "金箔寶庫", "鍊金術會所"];
    return Boolean(building.unique && societyBuildings.indexOf(building.name) < 0);
  }

  function isCivilizationUniqueDistrict(district) {
    return Boolean(district.unique);
  }

  function renderBuildingCard(building) {
    var replacements = building.replacedBy.length ? '<div class="replacement-row"><strong>特色替代</strong>' + building.replacedBy.map(function (name) { return '<span>' + escapeHtml(name) + '</span>'; }).join("") + '</div>' : "";
    var kindLabel = isCivilizationUniqueBuilding(building) ? "文明特色建築" : building.unique ? "特殊建築" : building.districtName + "建築";
    return '<details class="infrastructure-card building-card' + (building.unique ? " unique" : "") + '" id="infrastructure-' + escapeHtml(building.id) + '"><summary><span class="infrastructure-icon building-icon">' + infrastructureIcon(building, "infrastructure-game-icon") + '</span><span class="infrastructure-summary"><span class="infrastructure-kind">' + escapeHtml(kindLabel) + '</span><strong>' + escapeHtml(building.name) + '</strong><small>' + escapeHtml(building.en) + '</small></span></summary><div class="infrastructure-details">' + (building.description ? '<p class="infrastructure-description">' + escapeHtml(building.description) + '</p>' : "") + '<aside class="building-tip"><strong>什麼時候建</strong><p>' + escapeHtml(building.tip) + '</p></aside>' + renderInfrastructureList("具體加成", building.effects, "effect-list") + replacements + renderInfrastructureRequirements(building.requirements) + '</div></details>';
  }

  function renderDistrictCatalog(items, uniqueOnly) {
    if (!items.length) return "";
    return '<section class="infrastructure-catalog' + (uniqueOnly ? " unique-infrastructure-catalog" : "") + '" id="' + (uniqueOnly ? "unique-district-catalog" : "district-catalog") + '"><div class="section-heading-row"><div><p class="kicker">' + (uniqueOnly ? "UNIQUE DISTRICTS" : "DISTRICTS") + '</p><h2>' + (uniqueOnly ? "文明特色區域" : "通用區域效果與最佳選址") + '</h2></div><p>顯示 <strong>' + items.length + '</strong> 個區域；' + (uniqueOnly ? "集中查看各文明用來取代通用區域的特色版本。" : "只列出通用區域，展開卡片查看完整相鄰規則與選址門檻。") + '</p></div><div class="infrastructure-grid district-grid">' + items.map(renderDistrictCard).join("") + '</div></section>';
  }

  function renderBuildingCatalog(items, uniqueOnly) {
    if (!items.length) return "";
    return '<section class="infrastructure-catalog building-catalog' + (uniqueOnly ? " unique-infrastructure-catalog" : "") + '" id="' + (uniqueOnly ? "unique-building-catalog" : "building-catalog") + '"><div class="section-heading-row"><div><p class="kicker">' + (uniqueOnly ? "UNIQUE BUILDINGS" : "BUILDINGS") + '</p><h2>' + (uniqueOnly ? "文明特色建築" : "通用建築效果與建造時機") + '</h2></div><p>顯示 <strong>' + items.length + '</strong> 棟建築；' + (uniqueOnly ? "集中查看由特定文明或領袖能力提供的特色建築。" : "包含一般、政府、宗教與模式建築，不包含文明特色建築。") + '</p></div><div class="infrastructure-grid building-grid">' + items.map(renderBuildingCard).join("") + '</div></section>';
  }

  function infrastructureDistrictForProject() {
    return DATA.infrastructure.districts.find(function (district) { return district.id === "district-city-center"; });
  }

  function renderProjectCard(project) {
    var district = infrastructureDistrictForProject();
    return '<details class="infrastructure-card project-card" id="infrastructure-project-' + escapeHtml(project.id) + '"><summary><span class="infrastructure-icon project-icon">' + infrastructureIcon(district, "infrastructure-game-icon") + '</span><span class="infrastructure-summary"><span class="infrastructure-kind">' + escapeHtml(project.categoryName) + '</span><strong>' + escapeHtml(project.name) + '</strong><small>' + escapeHtml(project.en) + '</small></span></summary><div class="infrastructure-details"><p class="infrastructure-description">' + escapeHtml(project.description) + '</p>' + renderInfrastructureList("進行期間", project.whileActive, "project-active-list") + renderInfrastructureList("完成時獲得", project.onComplete, "project-complete-list") + renderInfrastructureRequirements(project.requirements) + '<aside class="building-tip project-tip"><strong>什麼時候做</strong><p>' + escapeHtml(project.tip) + '</p></aside></div></details>';
  }

  function renderProjectCatalog(items) {
    if (!items.length) return "";
    return '<section class="infrastructure-catalog project-catalog" id="project-catalog"><div class="section-heading-row"><div><p class="kicker">CITY PROJECTS</p><h2>城市可生產項目</h2></div><p>顯示 <strong>' + items.length + '</strong> 種項目；展開查看解鎖條件、進行期間收益、完成獎勵與適合投入的時機。</p></div><div class="infrastructure-grid project-grid">' + items.map(renderProjectCard).join("") + '</div></section>';
  }

  function renderInfrastructureGuide() {
    var kind = state.infrastructureFilters.kind;
    function matches(item, itemKind) {
      if (kind === "district" && (itemKind !== "district" || isCivilizationUniqueDistrict(item))) return false;
      if (kind === "unique-district" && (itemKind !== "district" || !isCivilizationUniqueDistrict(item))) return false;
      if (kind === "building" && (itemKind !== "building" || isCivilizationUniqueBuilding(item))) return false;
      if (kind === "unique-building" && (itemKind !== "building" || !isCivilizationUniqueBuilding(item))) return false;
      if (kind === "project" && itemKind !== "project") return false;
      if (kind && ["district", "unique-district", "building", "unique-building", "project"].indexOf(kind) < 0) return false;
      return true;
    }
    var districts = DATA.infrastructure.districts.filter(function (item) { return matches(item, "district"); });
    var buildings = DATA.infrastructure.buildings.filter(function (item) { return matches(item, "building"); });
    var projects = DATA.infrastructure.projects.filter(function (item) { return matches(item, "project"); });
    var kindButtons = [
      { id: "", label: "全部條目", count: DATA.meta.districtCount + DATA.meta.buildingCount + DATA.meta.projectCount },
      { id: "district", label: "通用區域", count: DATA.infrastructure.districts.filter(function (item) { return !isCivilizationUniqueDistrict(item); }).length },
      { id: "unique-district", label: "文明特色區域", count: DATA.infrastructure.districts.filter(isCivilizationUniqueDistrict).length },
      { id: "building", label: "通用建築", count: DATA.infrastructure.buildings.filter(function (item) { return !isCivilizationUniqueBuilding(item); }).length },
      { id: "unique-building", label: "文明特色建築", count: DATA.infrastructure.buildings.filter(isCivilizationUniqueBuilding).length },
      { id: "project", label: "城市項目", count: DATA.meta.projectCount }
    ].map(function (item) {
      var active = kind === item.id;
      return '<button type="button" class="infrastructure-kind-button' + (active ? " active" : "") + '" data-infrastructure-kind="' + item.id + '" aria-pressed="' + active + '"><span>' + item.label + '</span><strong>' + item.count + '</strong></button>';
    }).join("");
    var sections = "";
    if (!kind) {
      sections += renderDistrictCatalog(districts.filter(function (item) { return !isCivilizationUniqueDistrict(item); }), false);
      sections += renderDistrictCatalog(districts.filter(isCivilizationUniqueDistrict), true);
      sections += renderBuildingCatalog(buildings.filter(function (item) { return !isCivilizationUniqueBuilding(item); }), false);
      sections += renderBuildingCatalog(buildings.filter(isCivilizationUniqueBuilding), true);
      sections += renderProjectCatalog(projects);
    } else if (kind === "district" || kind === "unique-district") {
      sections += renderDistrictCatalog(districts, kind === "unique-district");
    } else if (kind === "project") {
      sections += renderProjectCatalog(projects);
    } else {
      sections += renderBuildingCatalog(buildings, kind === "unique-building");
    }
    var rules = DATA.infrastructure.districtRules.map(function (rule) { return '<article><h3>' + escapeHtml(rule.title) + '</h3><p>' + escapeHtml(rule.detail) + '</p></article>'; }).join("");
    return '<section class="infrastructure-primer"><div><p class="kicker">PRODUCTION & PLACEMENT</p><h2>生產力先花在能解決城市瓶頸的地方</h2><p>區域決定城市分工與地圖布局，建築把區域效果逐級放大；城市項目則把閒置產能轉成偉人點數、外交支持、太空競賽進度或其他一次性成果。</p></div><div class="district-rule-grid">' + rules + '</div></section>' +
      '<div class="infrastructure-kind-filters" role="toolbar" aria-label="區域、建築與城市項目篩選">' + kindButtons + '</div>' + (sections || renderInfrastructureEmpty());
  }

  function renderInfrastructureEmpty() {
    return '<div class="empty-state basics-empty"><div><h2>此分類目前沒有可顯示的條目</h2><p>請切換其他區域、建築或城市項目分類。</p><button class="button secondary" type="button" data-action="clear-infrastructure-filters">顯示預設分類</button></div></div>';
  }

  function renderModesGuide() {
    return '<section class="mode-basics-primer"><div><p class="kicker">OPTIONAL GAME MODES</p><h2>模式會改寫規則，但不取代基本勝利條件</h2><p>本頁以百科視角整理新增內容、啟用需求與規則；實戰利用、聯動與推薦領袖可切換到攻略視角。</p></div><div><strong>8</strong><span>種可選模式</span></div></section><nav class="content-lens" aria-label="遊戲模式內容視角"><a href="#/guide/modes"><small>攻略</small><strong>如何利用模式取勝</strong></a><a class="active" href="#/wiki/modes" aria-current="page"><small>Wiki</small><strong>新增內容與規則變更</strong></a></nav><section class="mode-grid">' + DATA.modes.map(function (mode) { return renderModeCard(mode, "wiki"); }).join("") + '</section>';
  }

  function policyCategoryName(id) {
    var category = DATA.governments.categories.find(function (item) { return item.id === id; });
    return category ? category.name : id;
  }

  function renderPolicySlots(slots) {
    var labels = { military: "軍事", economic: "經濟", diplomatic: "外交", wildcard: "通用" };
    return Object.keys(labels).map(function (id) {
      var count = Number(slots[id] || 0);
      return '<span class="policy-slot slot-' + id + (count ? "" : " empty") + '"><b>' + count + '</b>' + labels[id] + '</span>';
    }).join("");
  }

  function renderGovernmentCard(government) {
    var traits = government.traits.length ? '<ul class="government-traits">' + government.traits.map(function (trait) { return '<li>' + escapeHtml(trait) + '</li>'; }).join("") + '</ul>' : "";
    var policies = government.uniquePolicies.length ? '<div class="government-unique"><strong>特有政策</strong><div>' + government.uniquePolicies.map(function (name) {
      var policy = DATA.governments.policies.find(function (item) { return item.name === name; });
      return policy ? '<a href="#/wiki/governments?focus=policy-' + escapeHtml(policy.id) + '">' + escapeHtml(name) + '</a>' : '<span>' + escapeHtml(name) + '</span>';
    }).join("") + '</div></div>' : "";
    return '<details class="government-card" id="government-' + escapeHtml(government.id) + '"><summary><span class="government-summary"><span class="government-tier">第 ' + government.tier + ' 級 · ' + escapeHtml(government.era) + '</span><strong>' + escapeHtml(government.name) + '</strong><small>' + escapeHtml(government.en) + '</small></span><span class="government-unlock"><small>解鎖市政</small><strong>' + escapeHtml(government.unlock) + '</strong></span></summary><div class="government-details"><div class="policy-slots" aria-label="政策槽位">' + renderPolicySlots(government.slots) + '</div><dl class="government-bonuses"><div><dt>內在加成</dt><dd>' + escapeHtml(government.inherent) + '</dd></div><div><dt>遺產加成</dt><dd>' + escapeHtml(government.legacy) + '</dd></div></dl>' + traits + policies + '</div></details>';
  }

  function renderPolicyCard(policy) {
    var replaced = policy.replacedBy.length ? '<p class="policy-replaced"><strong>後續替換：</strong>' + escapeHtml(policy.replacedBy.join("、")) + '</p>' : "";
    var categoryIcon = { military: "agoge.png", economic: "craftsmen.png", diplomatic: "diplomatic-league.png", "great-person": "inspiration.png", wildcard: "revelation.png", golden: "monumentality.webp", dark: "isolationism.webp" }[policy.category] || policy.icon;
    return '<details class="policy-card policy-' + escapeHtml(policy.category) + '" id="policy-' + escapeHtml(policy.id) + '"><summary><span class="policy-image-frame"><img src="assets/game-icons/policies/' + escapeHtml(categoryIcon) + '" width="84" height="112" loading="lazy" decoding="async" alt="' + escapeHtml(policy.categoryName + "卡面") + '"></span><span class="policy-summary-text"><span class="policy-category">' + escapeHtml(policy.categoryName) + '</span><strong>' + escapeHtml(policy.name) + '</strong><small>' + escapeHtml(policy.en) + '</small><span class="policy-unlock">解鎖：' + escapeHtml(policy.unlock) + '</span></span></summary><div class="policy-effect"><strong>卡片效果</strong><p>' + escapeHtml(policy.effect) + '</p>' + replaced + '</div></details>';
  }

  function renderGovernmentPolicyGuide() {
    var tier = state.governmentFilters.tier;
    var governmentList = DATA.governments.governments.filter(function (item) {
      return !tier || String(item.tier) === tier;
    });
    var policyList = DATA.governments.policies.filter(function (item) {
      return !state.governmentFilters.category || item.category === state.governmentFilters.category;
    });
    var tierButtons = [{ id: "", name: "全部政體" }, { id: "0", name: "初始" }, { id: "1", name: "一級" }, { id: "2", name: "二級" }, { id: "3", name: "三級" }, { id: "4", name: "未來" }].map(function (item) {
      var active = tier === item.id;
      return '<button type="button" class="government-filter-chip' + (active ? " active" : "") + '" data-government-tier="' + item.id + '" aria-pressed="' + active + '">' + item.name + '</button>';
    }).join("");
    var categoryButtons = [{ id: "", name: "全部政策" }].concat(DATA.governments.categories).map(function (item) {
      var active = state.governmentFilters.category === item.id;
      var count = item.id ? DATA.governments.policies.filter(function (policy) { return policy.category === item.id; }).length : DATA.governments.policies.length;
      return '<button type="button" class="policy-filter-button' + (item.id ? " policy-" + item.id : "") + (active ? " active" : "") + '" data-policy-category="' + item.id + '" aria-pressed="' + active + '"><span>' + escapeHtml(item.name) + '</span><strong>' + count + '</strong></button>';
    }).join("");
    return '<section class="government-primer"><div><p class="kicker">先懂這兩件事</p><h2>政體決定加成與卡槽，政策卡決定當下節奏</h2><p>解鎖新政體後不必立刻更換；先比較內在加成與槽位。政策卡則應配合移民潮、建造者批次、戰爭窗口或偉人競爭，在完成市政時免費換卡。</p></div><nav aria-label="本章段落"><button type="button" data-scroll-target="government-catalog">查看 13 種政體</button><button type="button" data-scroll-target="policy-catalog">查找 157 張政策卡</button></nav></section>' +
      '<div class="government-policy-controls"><div class="policy-category-filters" role="group" aria-label="依政策卡類型篩選">' + categoryButtons + '</div><div class="catalog-filter-actions"><button class="button secondary" type="button" data-action="clear-government-filters">清除政體與政策篩選</button></div></div>' +
      '<section class="government-catalog" id="government-catalog"><div class="section-heading-row"><div><p class="kicker">GOVERNMENTS</p><h2>全部政體</h2></div><p>內在加成立即生效；遺產加成代表該政體對應的遺產政策效果。</p></div><div class="government-tier-filters" role="group" aria-label="依政體等級篩選">' + tierButtons + '</div><div class="government-grid">' + (governmentList.length ? governmentList.map(renderGovernmentCard).join("") : renderGovernmentEmpty()) + '</div></section>' +
      '<section class="policy-catalog" id="policy-catalog"><div class="section-heading-row"><div><p class="kicker">POLICY CARDS</p><h2>全部政策卡</h2></div><p>共顯示 <strong>' + policyList.length + '</strong> 張；點開卡片查看完整效果與解鎖條件。</p></div><div class="policy-grid">' + (policyList.length ? policyList.map(renderPolicyCard).join("") : renderGovernmentEmpty()) + '</div><p class="policy-note">黃金時代與黑暗時代政策受時代狀態限制，並非一般政體卡槽可永久常駐的政策。</p></section>';
  }

  function renderGovernmentEmpty() {
    return '<div class="empty-state basics-empty"><div><h2>此分類目前沒有可顯示的條目</h2><p>請切換其他政體等級或政策卡類型。</p><button class="button secondary" type="button" data-action="clear-government-filters">清除政體與政策篩選</button></div></div>';
  }

  function renderReligionChoice(religion) {
    return '<article class="religion-choice" id="religion-' + escapeHtml(religion.id) + '"><div class="religion-symbol"><img src="assets/game-icons/religions/' + escapeHtml(religion.icon) + '" width="96" height="96" loading="lazy" decoding="async" alt="' + escapeHtml(religion.name + "宗教圖標") + '"></div><div><h3>' + escapeHtml(religion.name) + '</h3><p>' + escapeHtml(religion.en) + '</p></div></article>';
  }

  function renderBeliefCard(belief) {
    return '<details class="belief-card belief-' + escapeHtml(belief.category) + '" id="belief-' + escapeHtml(belief.id) + '"><summary><span class="belief-icon-frame"><img src="assets/game-icons/beliefs/' + escapeHtml(belief.icon) + '" width="88" height="88" loading="lazy" decoding="async" alt="' + escapeHtml(belief.name + "信條圖標") + '"></span><span class="belief-summary-text"><span class="belief-category">' + escapeHtml(belief.categoryName) + '</span><strong>' + escapeHtml(belief.name) + '</strong><small>' + escapeHtml(belief.en) + '</small></span></summary><div class="belief-effect"><strong>遊戲效果</strong><p>' + escapeHtml(belief.effect) + '</p></div></details>';
  }

  function renderReligionGuide() {
    var category = state.religionFilters.category;
    var focusMatch = location.hash.match(/[?&]focus=([^&]+)/);
    var focusId = focusMatch ? decodeURIComponent(focusMatch[1]) : "";
    var religionList = DATA.religions.religions.slice();
    var beliefList = DATA.religions.beliefs.filter(function (item) {
      var matches = !category || item.category === category;
      return matches || focusId === "belief-" + item.id;
    });
    var flow = [
      { step: "1", title: "建立萬神殿", text: "先累積信仰值並從 23 個萬神殿中選一個。萬神殿只影響自己的文明，不能傳播。" },
      { step: "2", title: "取得大先知", text: "建造聖地與神社累積大先知點數；標準地圖可建立的宗教數量有限。" },
      { step: "3", title: "創立宗教", text: "選擇名稱與圖標，再選一個追隨者信條及另外一類信條；宗教名稱本身沒有能力差異。" },
      { step: "4", title: "補完四種信條", text: "用使徒執行兩次「傳播信條」，最終補齊追隨者、創始者、崇拜與強化各一個。" }
    ].map(function (item) { return '<article><span>' + item.step + '</span><h3>' + item.title + '</h3><p>' + item.text + '</p></article>'; }).join("");
    var categoryButtons = [{ id: "", name: "全部加成", timing: "顯示全部 59 種可選項目" }].concat(DATA.religions.categories).map(function (item) {
      var active = category === item.id;
      var count = item.id ? DATA.religions.beliefs.filter(function (belief) { return belief.category === item.id; }).length : DATA.religions.beliefs.length;
      return '<button type="button" class="belief-filter-button' + (item.id ? " belief-" + item.id : "") + (active ? " active" : "") + '" data-belief-category="' + item.id + '" aria-pressed="' + active + '"><span><strong>' + escapeHtml(item.name) + '</strong><small>' + escapeHtml(item.timing) + '</small></span><b>' + count + '</b></button>';
    }).join("");
    var activeCategory = DATA.religions.categories.find(function (item) { return item.id === category; });
    return '<section class="religion-primer"><div><p class="kicker">RELIGION BASICS</p><h2>宗教圖標不決定能力，信條組合才是玩法核心</h2><p>歷史宗教和自訂宗教在機制上完全相同。先按地形選萬神殿，再讓四類宗教信條服務你的勝利路線。</p></div><nav aria-label="本章段落"><button type="button" data-scroll-target="religion-choices">12 種歷史宗教</button><button type="button" data-scroll-target="belief-catalog">59 種宗教加成</button></nav></section>' +
      '<section class="religion-flow" aria-label="創立宗教流程">' + flow + '</section>' +
      '<div class="religion-belief-controls"><div class="belief-category-filters" role="group" aria-label="依宗教加成類型篩選">' + categoryButtons + '</div><div class="catalog-filter-actions"><button class="button secondary" type="button" data-action="clear-religion-filters">清除宗教加成篩選</button></div></div>' +
      '<section class="religion-choices-section" id="religion-choices"><div class="section-heading-row"><div><p class="kicker">HISTORIC RELIGIONS</p><h2>全部歷史宗教</h2></div><p>以下 12 種選項只有名稱與圖標差異；創教時亦可使用其他遊戲圖標並自訂名稱。</p></div><div class="religion-choice-grid">' + (religionList.length ? religionList.map(renderReligionChoice).join("") : renderReligionEmpty()) + '</div></section>' +
      '<section class="belief-catalog" id="belief-catalog"><div class="section-heading-row"><div><p class="kicker">BELIEFS & PANTHEONS</p><h2>全部宗教加成</h2></div><p>共顯示 <strong>' + beliefList.length + '</strong> 項。' + escapeHtml(activeCategory ? activeCategory.timing : "點選分類後可只查看該階段的選項。") + '</p></div><div class="belief-grid">' + (beliefList.length ? beliefList.map(renderBeliefCard).join("") : renderReligionEmpty()) + '</div></section>';
  }

  function renderReligionEmpty() {
    return '<div class="empty-state basics-empty"><div><h2>此分類目前沒有可顯示的信條</h2><p>請切換其他宗教加成類型。</p><button class="button secondary" type="button" data-action="clear-religion-filters">清除宗教篩選</button></div></div>';
  }

  function greatPersonClass(classId) {
    return DATA.people.classes.find(function (item) { return item.id === classId; });
  }

  function renderGreatPersonCard(person) {
    var personClass = greatPersonClass(person.classId) || { color: "var(--accent)", name: person.className };
    var abilities = person.abilities.map(function (ability) {
      return '<div class="great-person-ability"><strong>' + escapeHtml(ability.label) + '</strong><p>' + escapeHtml(ability.effect) + '</p></div>';
    }).join("");
    var works = person.works.length ? '<div class="great-person-works"><strong>產生巨作</strong><ul>' + person.works.map(function (work) { return '<li>' + escapeHtml(work) + '</li>'; }).join("") + '</ul></div>' : "";
    return '<details class="great-person-card people-' + escapeHtml(person.classId) + '" id="great-person-' + escapeHtml(person.id) + '" style="--person-color:' + escapeHtml(personClass.color) + '"><summary><span class="great-person-icon"><img src="assets/game-icons/people/' + escapeHtml(person.icon) + '" width="88" height="88" loading="lazy" decoding="async" alt="" aria-hidden="true"></span><span class="great-person-summary"><span class="great-person-type">' + escapeHtml(person.className) + ' · ' + escapeHtml(person.era) + '</span><strong>' + escapeHtml(person.name) + '</strong><small>' + escapeHtml(person.en) + '</small></span></summary><div class="great-person-details">' + abilities + works + '</div></details>';
  }

  function renderGreatPeopleGuide() {
    var classId = state.peopleFilters.classId;
    var era = state.peopleFilters.era;
    var list = DATA.people.people.filter(function (person) {
      return (!classId || person.classId === classId) && (!era || person.era === era);
    });
    var eras = ["遠古時代", "古典時期", "中世紀", "文藝復興時期", "工業時代", "現代", "原子能時代", "資訊時代"].filter(function (name) {
      return DATA.people.people.some(function (person) { return person.era === name; });
    });
    var eraOptions = eras.map(function (name) { return '<option value="' + escapeHtml(name) + '"' + (era === name ? " selected" : "") + '>' + escapeHtml(name) + '</option>'; }).join("");
    var classButtons = [{ id: "", name: "全部類型", count: DATA.people.people.length, color: "var(--accent)" }].concat(DATA.people.classes).map(function (item) {
      var active = classId === item.id;
      return '<button type="button" class="people-class-button' + (active ? " active" : "") + '" style="--person-color:' + escapeHtml(item.color) + '" data-great-person-class="' + escapeHtml(item.id) + '" aria-pressed="' + active + '"><span>' + escapeHtml(item.name) + '</span><strong>' + item.count + '</strong></button>';
    }).join("");
    return '<section class="people-primer"><div><p class="kicker">GREAT PEOPLE</p><h2>偉人是全世界共用的競爭佇列</h2><p>區域、建築、政策卡與項目會提供對應偉人點數。你可以招募、略過或以金幣／信仰贊助；將滑鼠移到候選人前，先確認效果是否值得搶。</p></div><nav aria-label="偉人新手規則"><span><strong>招募</strong>消耗該類偉人點數</span><span><strong>略過</strong>等其他文明招募後才換人</span><span><strong>啟用</strong>依能力前往指定區域或地塊</span></nav></section>' +
      '<section class="great-people-catalog" id="great-people-catalog"><div class="section-heading-row"><div><p class="kicker">ALL GREAT PEOPLE</p><h2>全部偉人與效果</h2></div><p>共顯示 <strong>' + list.length + '</strong> 位；總指揮官是大哥倫比亞專屬，其他九類由所有符合條件的文明競爭。</p></div><div class="great-people-controls"><div class="people-class-filters" role="group" aria-label="依偉人類型篩選">' + classButtons + '</div><div class="people-era-filter" role="group" aria-label="依時代篩選偉人"><label><span class="field-label">時代</span><select class="filter-select" data-people-filter="era"><option value="">全部時代</option>' + eraOptions + '</select></label><button class="button secondary" type="button" data-action="clear-people-filters">清除偉人篩選</button></div></div><div class="great-person-grid">' + (list.length ? list.map(renderGreatPersonCard).join("") : renderPeopleEmpty()) + '</div></section>';
  }

  function renderPromotionNode(governor, promotion) {
    var levelName = promotion.level === 0 ? "任命能力" : "第 " + promotion.level + " 級";
    var promotionMap = {};
    governor.promotions.forEach(function (item) { promotionMap[item.id] = item; });
    var requirements = (promotion.requires || []).map(function (id) { return promotionMap[id]; }).filter(Boolean);
    var requirementMarkup = requirements.length ? '<div class="promotion-requires"><span>前置</span><strong>' + requirements.map(function (item) { return escapeHtml(item.name); }).join(" ＋ ") + '</strong></div>' : '<div class="promotion-requires promotion-base"><span>起點</span><strong>任命後立即生效</strong></div>';
    return '<article class="promotion-node promotion-level-' + promotion.level + '" id="promotion-' + escapeHtml(governor.id) + '-' + escapeHtml(promotion.id) + '"><span>' + levelName + '</span><h4>' + escapeHtml(promotion.name) + '</h4><small>' + escapeHtml(promotion.en) + '</small><p>' + escapeHtml(promotion.effect) + '</p>' + requirementMarkup + '</article>';
  }

  function renderPromotionTier(governor, level) {
    var promotions = governor.promotions.filter(function (promotion) { return promotion.level === level; });
    if (!promotions.length) return "";
    var label = level === 0 ? "任命" : "第 " + level + " 級";
    return '<section class="promotion-tier promotion-tier-' + level + '" data-count="' + promotions.length + '"><div class="promotion-tier-label"><span>' + label + '</span><small>' + (level === 0 ? "基礎能力" : promotions.length + " 項選擇") + '</small></div><div class="promotion-tier-nodes">' + promotions.map(function (promotion) { return renderPromotionNode(governor, promotion); }).join("") + '</div></section>';
  }

  function renderGovernorCard(governor) {
    var profile = [1, 2, 3].map(function (level) { return governor.promotions.filter(function (promotion) { return promotion.level === level; }).length; }).join("→");
    var promotions = [0, 1, 2, 3].map(function (level) { return renderPromotionTier(governor, level); }).join("");
    return '<details class="governor-card" id="governor-' + escapeHtml(governor.id) + '"><summary><span class="governor-portrait"><img src="assets/game-icons/people/' + escapeHtml(governor.icon) + '" width="128" height="128" loading="lazy" decoding="async" alt="' + escapeHtml(governor.name + "總督遊戲肖像") + '"></span><span class="governor-summary"><span class="governor-kind">' + (governor.unique ? "鄂圖曼專屬總督" : "通用總督") + '</span><strong>' + escapeHtml(governor.name) + ' <small>· ' + escapeHtml(governor.title) + '</small></strong><span class="english">' + escapeHtml(governor.en) + '</span><span class="governor-tags">' + governor.bestFor.map(function (tag) { return '<span>' + escapeHtml(tag) + '</span>'; }).join("") + '</span></span><span class="establishment-badge"><strong>' + governor.establishment + '</strong><span>回合就任</span></span></summary><div class="governor-details"><p class="governor-description">' + escapeHtml(governor.description) + '</p><aside class="governor-advice"><strong>新手用法</strong><p>' + escapeHtml(governor.advice) + '</p></aside><div class="promotion-heading"><div><span>官方晉升樹 · ' + profile + '</span><h4>任命能力＋5 項可選晉升</h4></div><small>前置列顯示實際依賴；任命或每次晉升均消耗 1 個總督頭銜</small></div><div class="promotion-tree">' + promotions + '</div></div></details>';
  }

  function renderGovernorsGuide() {
    var list = DATA.people.governors.slice();
    return '<section class="governor-primer"><div><p class="kicker">GOVERNORS</p><h2>先看城市任務，再決定分散任命或集中升級</h2><p>總督在城市就任後提供忠誠度與專屬能力。普通總督需 5 回合就任，維克托只需 3 回合；重新調派後要再次等待。</p><p class="governor-tree-note"><strong>晉升樹並非統一形狀：</strong>平加拉、瑞娜、莫克沙與維克托是 2→1→2；其餘四位是 2→2→1。頁面以每項能力的「前置」為準。<a href="https://www.civilopedia.net/en-US/gathering-storm/concepts/governors_1/" target="_blank" rel="noreferrer">查看 Gathering Storm 官方說明</a></p></div><div class="governor-rule-grid"><span><strong>1 城 1 人</strong>同一城市只能指派一位總督</span><span><strong>頭銜共用</strong>任命新人與升級舊人都消耗頭銜</span><span><strong>能力需就任</strong>調派途中不會套用城市能力</span></div></section>' +
      '<section class="governor-catalog" id="governor-catalog"><div class="section-heading-row"><div><p class="kicker">ALL GOVERNORS</p><h2>全部總督與升級樹</h2></div><p>共顯示 <strong>' + list.length + '</strong> 位總督；易卜拉欣只在蘇萊曼領導鄂圖曼時可用。</p></div><div class="governor-grid">' + list.map(renderGovernorCard).join("") + '</div></section>';
  }

  function renderPeopleEmpty() {
    return '<div class="empty-state basics-empty"><div><h2>此類型與時代沒有符合條件的偉人</h2><p>請切換偉人類型或時代。</p><button class="button secondary" type="button" data-action="clear-people-filters">清除偉人篩選</button></div></div>';
  }

  function renderBasicsEmpty() {
    return '<div class="empty-state basics-empty"><div><h2>找不到符合條件的條目</h2><p>縮短關鍵字，或清除目前的類型篩選。</p><button class="button secondary" type="button" data-action="clear-basics-filters">清除本章篩選</button></div></div>';
  }

  function basicsGuideMarkup(section) {
    return (section === "terrain" || section === "improvements") ? renderTerrainGuide() :
      section === "resources" ? renderResourceGuide() :
      section === "infrastructure" ? renderInfrastructureGuide() :
      section === "governments" ? renderGovernmentPolicyGuide() :
      section === "religions" ? renderReligionGuide() :
      section === "great-people" ? renderGreatPeopleGuide() :
      section === "governors" ? renderGovernorsGuide() : renderModesGuide();
  }

  function persistentBasicsControlSelector(section) {
    return {
      terrain: ".basics-filter",
      improvements: ".basics-filter",
      infrastructure: ".infrastructure-kind-filters",
      governments: ".government-policy-controls",
      religions: ".religion-belief-controls",
      "great-people": ".great-people-controls"
    }[section] || "";
  }

  function disconnectBasicsStickyObserver() {
    if (basicsStickyObserver) basicsStickyObserver.disconnect();
    if (basicsStickySync) window.removeEventListener("resize", basicsStickySync);
    basicsStickyObserver = null;
    basicsStickySync = null;
  }

  function consolidateBasicsStickyControls(section) {
    var stack = main.querySelector(".basics-sticky-controls");
    var content = main.querySelector(".basics-content");
    var selector = persistentBasicsControlSelector(section);
    var control = content && selector ? content.querySelector(selector) : null;
    if (stack && control) stack.appendChild(control);
    disconnectBasicsStickyObserver();
    if (!stack) return;
    function syncHeight() {
      var stackHeight = Math.ceil(stack.getBoundingClientRect().height);
      var header = document.querySelector(".topbar");
      var headerHeight = header ? Math.ceil(header.getBoundingClientRect().height) : 0;
      stack.classList.toggle("sticky-limit-exceeded", headerHeight + stackHeight > window.innerHeight * .4);
      document.documentElement.style.setProperty("--basics-sticky-height", stackHeight + "px");
    }
    basicsStickySync = syncHeight;
    syncHeight();
    window.addEventListener("resize", syncHeight, { passive: true });
    if (typeof ResizeObserver === "function") {
      basicsStickyObserver = new ResizeObserver(syncHeight);
      basicsStickyObserver.observe(stack);
    } else {
      requestAnimationFrame(syncHeight);
    }
  }

  function renderBasicsPage(section) {
    if (["terrain", "resources", "improvements", "infrastructure", "governments", "religions", "great-people", "governors", "modes"].indexOf(section) < 0) section = "terrain";
    if (section === "improvements") section = "terrain";
    setActiveNav("wiki");
    var requestedFocus = location.hash.match(/[?&]focus=([^&]+)/);
    if (section === "infrastructure" && requestedFocus) {
      var focusId = decodeURIComponent(requestedFocus[1]).replace(/^infrastructure-/, "");
      if (DATA.infrastructure.districts.some(function (item) { return item.id === focusId; })) state.infrastructureFilters.kind = "district";
      if (DATA.infrastructure.buildings.some(function (item) { return item.id === focusId; })) state.infrastructureFilters.kind = "building";
      if (DATA.infrastructure.projects.some(function (item) { return "project-" + item.id === focusId; })) state.infrastructureFilters.kind = "project";
      state.infrastructureFilters.group = "";
    }
    var content = basicsGuideMarkup(section);
    var headers = {
      terrain: { kicker: "WIKI · MAP", title: "地形地貌與改良", description: "查詢每格地形、地貌與建造者設施的原始產出、移動、防禦、科技市政解鎖與後續升級。資料以 " + escapeHtml(DATA.basics.meta.ruleset) + " 規則集為準。", stat: DATA.meta.terrainCount + " + " + DATA.meta.improvementCount + " 項", meta: "地形地貌與建造者改良" },
      resources: { kicker: "WIKI · RESOURCES", title: "資源圖鑑", description: escapeHtml(DATA.basics.meta.description) + "。集中查詢生成位置、揭示科技、改良方式與用途。", stat: DATA.meta.resourceCount + " 種資源", meta: "生成位置、揭示與改良一次查清" },
      governments: { kicker: "WIKI · GOVERNMENT", title: "政體與政策卡", description: "涵蓋 Gathering Storm 規則集的全部政體與政策卡，效果、解鎖市政及卡槽一次查清。", stat: DATA.meta.governmentCount + " 種政體", meta: DATA.meta.policyCount + " 張政策卡，七種類型" },
      religions: { kicker: "WIKI · RELIGION", title: "宗教與信條", description: "列出全部歷史宗教、萬神殿與四類宗教信條，並說明創教流程和效果適用對象。", stat: DATA.meta.religionCount + " 種宗教", meta: DATA.meta.beliefCount + " 種萬神殿與宗教加成" },
      infrastructure: { kicker: "WIKI · CITIES", title: "區域、建築與城市項目", description: "完整列出城市可生產的區域、建築與城市項目，包含加成、成本、解鎖條件、特色替代、逐格選址與完成收益。", stat: DATA.meta.districtCount + " 個區域", meta: DATA.meta.buildingCount + " 棟建築 · " + DATA.meta.projectCount + " 種城市項目" },
      "great-people": { kicker: "WIKI · GREAT PEOPLE", title: "偉人百科", description: "完整列出 Gathering Storm 全 DLC 的偉人、啟用效果、時代與巨作，並保留英文姓名方便搜尋。", stat: DATA.meta.greatPersonCount + " 位偉人", meta: DATA.meta.greatPersonClassCount + " 種類型，含總指揮官" },
      governors: { kicker: "WIKI · GOVERNORS", title: "總督與晉升", description: "列出所有通用與文明專屬總督、就任時間、能力，以及完整的可選晉升效果。", stat: DATA.meta.governorCount + " 位總督", meta: DATA.meta.governorPromotionCount + " 項任命能力與晉升" },
      modes: { kicker: "WIKI · GAME MODES", title: "遊戲模式規則", description: "集中查看八種可選模式的啟用需求、新增內容與規則變更；玩法利用與聯動另可切換到攻略視角。", stat: DATA.meta.modeCount + " 種模式", meta: "啟用需求、新增內容與規則" }
    };
    var header = headers[section] || headers.terrain;
    main.innerHTML = '<div class="page-shell basics-page"><nav class="breadcrumb" aria-label="麵包屑"><a href="#/wiki">Wiki</a><span aria-hidden="true">/</span><span aria-current="page">' + escapeHtml(header.title) + '</span></nav><header class="page-header basics-header"><div><p class="kicker">' + header.kicker + '</p><h1>' + header.title + '</h1><p>' + header.description + '</p></div><div class="page-stat"><strong>' + header.stat + '</strong><span>' + header.meta + '</span></div></header><div class="basics-sticky-controls">' + basicsTabs(section) + '</div><div class="basics-content">' + content + '</div></div>';
    consolidateBasicsStickyControls(section);
    arrangeExpandableGrids(main);
    positionBasicsIndicator(section);
    var focusMatch = location.hash.match(/[?&]focus=([^&]+)/);
    scheduleRouteFocus(focusMatch ? decodeURIComponent(focusMatch[1]) : "", "center");
    warmRouteImages();
  }

  function renderNotFound(title, message) {
    setActiveNav("");
    main.innerHTML = '<div class="page-shell"><div class="empty-state"><div><h1>' + escapeHtml(title) + '</h1><p>' + escapeHtml(message) + '</p><a class="button secondary" href="#/home">返回首頁</a></div></div></div>';
  }

  function majorSectionForRoute(parts) {
    if (!parts.length || parts[0] === "home") return "home";
    if (parts[0] === "guide") return "guide";
    if (parts[0] === "wiki") return "wiki";
    if (parts[0] === "favorites") return "favorites";
    return "";
  }

  function animateMajorSection(section) {
    var previous = activeMajorSection;
    activeMajorSection = section;
    if (!previous || !section || previous === section || prefersReducedMotion()) return;
    var page = main.firstElementChild;
    if (!page || typeof page.animate !== "function") return;
    var order = ["home", "guide", "wiki", "favorites"];
    var direction = order.indexOf(section) >= order.indexOf(previous) ? 1 : -1;
    page.animate([
      { opacity: .58, transform: "translateX(" + (direction * 24) + "px)" },
      { opacity: 1, transform: "translateX(0)" }
    ], { duration: 260, easing: "cubic-bezier(.22, 1, .36, 1)" });
  }

  function render() {
    cancelScheduledRouteFocus();
    clearRouteSearchNavigator();
    normalizeLegacyHash();
    var parts = routeParts();
    var majorSection = majorSectionForRoute(parts);
    main.dataset.lens = majorSection === "guide" || majorSection === "wiki" ? majorSection : "home";
    hydrateFiltersFromRoute();
    if (parts[0] !== "wiki" || parts[1] === "mode" || !parts[1]) disconnectBasicsStickyObserver();
    if (!parts.length || parts[0] === "home") renderHomePage();
    else if (parts[0] === "favorites") renderLeadersPage(true);
    else if (parts[0] === "guide" && !parts[1]) renderGuideHub();
    else if (parts[0] === "guide" && parts[1] === "leaders") renderLeadersPage(false);
    else if (parts[0] === "guide" && parts[1] === "leader") renderLeaderDetail(parts[2], parts[3] || "science");
    else if (parts[0] === "guide" && parts[1] === "victories") renderVictoryHub(parts[2]);
    else if (parts[0] === "guide" && parts[1] === "modes") renderGuideModesPage();
    else if (parts[0] === "guide" && parts[1] === "mode") renderModeDetail(parts[2], "guide");
    else if (parts[0] === "guide") renderGuidePage(parts[1] || "decisions");
    else if (parts[0] === "wiki" && !parts[1]) renderWikiHub();
    else if (parts[0] === "wiki" && parts[1] === "leaders") renderWikiLeadersPage();
    else if (parts[0] === "wiki" && parts[1] === "leader") renderWikiLeaderDetail(parts[2]);
    else if (parts[0] === "wiki" && parts[1] === "mode") renderModeDetail(parts[2], "wiki");
    else if (parts[0] === "wiki" && parts[1] === "systems") renderWikiSystemsPage();
    else if (parts[0] === "wiki") renderBasicsPage(parts[1] || "terrain");
    else renderNotFound("找不到這一頁", "請從攻略或 Wiki 百科重新開始。");
    arrangeExpandableGrids(main);
    applyRouteSearchHighlights();
    state.recent = location.hash || "#/home";
    saveState();
    bindFilterEvents();
    bindBasicsEvents();
    animateMajorSection(majorSectionForRoute(parts));
    warmRouteImages();
  }

  function bindBasicsEvents() {
    document.querySelectorAll("[data-basics-filter]").forEach(function (control) {
      var key = control.getAttribute("data-basics-filter");
      if (control._basicsFilterBound) return;
      control._basicsFilterBound = true;
      control.addEventListener("change", function () {
        state.basicsFilters[key] = control.value;
        saveState();
        syncFilterRoute();
        var section = routeParts()[1] || "terrain";
        renderBasicsPage(section);
        bindBasicsEvents();
      });
    });
    document.querySelectorAll("[data-resource-type]").forEach(function (button) {
      if (button._basicsResourceBound) return;
      button._basicsResourceBound = true;
      button.addEventListener("click", function () {
        state.basicsFilters.resourceType = button.getAttribute("data-resource-type");
        saveState();
        syncFilterRoute();
        renderBasicsPage("resources");
        bindBasicsEvents();
        var target = document.getElementById("resource-results");
        if (target) target.scrollIntoView({ block: "start" });
      });
    });
    document.querySelectorAll("[data-government-tier]").forEach(function (button) {
      if (button._governmentTierBound) return;
      button._governmentTierBound = true;
      button.addEventListener("click", function () { state.governmentFilters.tier = button.getAttribute("data-government-tier"); saveState(); syncFilterRoute(); renderBasicsPage("governments"); bindBasicsEvents(); });
    });
    document.querySelectorAll("[data-policy-category]").forEach(function (button) {
      if (button._policyCategoryBound) return;
      button._policyCategoryBound = true;
      button.addEventListener("click", function () { state.governmentFilters.category = button.getAttribute("data-policy-category"); saveState(); syncFilterRoute(); renderBasicsPage("governments"); bindBasicsEvents(); var target = document.getElementById("policy-catalog"); if (target) target.scrollIntoView({ block: "start" }); });
    });
    document.querySelectorAll("[data-belief-category]").forEach(function (button) {
      if (button._beliefCategoryBound) return;
      button._beliefCategoryBound = true;
      button.addEventListener("click", function () {
        state.religionFilters.category = button.getAttribute("data-belief-category");
        saveState();
        syncFilterRoute();
        renderBasicsPage("religions");
        bindBasicsEvents();
        scrollFilteredResultIntoView("#belief-catalog .belief-card");
      });
    });
    document.querySelectorAll("[data-people-filter]").forEach(function (control) {
      var key = control.getAttribute("data-people-filter");
      if (control._peopleFilterBound) return;
      control._peopleFilterBound = true;
      control.addEventListener("change", function () {
        state.peopleFilters[key] = control.value;
        saveState();
        syncFilterRoute();
        renderBasicsPage("great-people");
        bindBasicsEvents();
      });
    });
    document.querySelectorAll("[data-great-person-class]").forEach(function (button) {
      if (button._greatPersonClassBound) return;
      button._greatPersonClassBound = true;
      button.addEventListener("click", function () {
        state.peopleFilters.classId = button.getAttribute("data-great-person-class");
        saveState();
        syncFilterRoute();
        renderBasicsPage("great-people");
        bindBasicsEvents();
        var target = document.getElementById("great-people-catalog");
        if (target) target.scrollIntoView({ block: "start" });
      });
    });
    document.querySelectorAll("[data-infrastructure-kind]").forEach(function (button) {
      if (button._infrastructureKindBound) return;
      button._infrastructureKindBound = true;
      button.addEventListener("click", function () {
        state.infrastructureFilters.kind = button.getAttribute("data-infrastructure-kind");
        saveState();
        syncFilterRoute();
        renderBasicsPage("infrastructure");
        bindBasicsEvents();
        var target = document.querySelector(".infrastructure-catalog");
        if (target) target.scrollIntoView({ block: "start" });
      });
    });
    bindGuideCalculators();
  }

  function bindGuideCalculators() {
    var tileInputs = document.querySelectorAll("[data-tile-yield]");
    if (tileInputs.length) {
      function updateTileCalculator() {
        ["food", "production"].forEach(function (yieldId) {
          var total = 0;
          document.querySelectorAll('[data-tile-yield="' + yieldId + '"]').forEach(function (input) { total += Number(input.value) || 0; });
          var output = document.querySelector('[data-tile-total="' + yieldId + '"]');
          if (output) output.textContent = total + (yieldId === "food" ? " 食物" : " 產能");
        });
      }
      tileInputs.forEach(function (input) { if (!input._calculatorBound) { input._calculatorBound = true; input.addEventListener("input", updateTileCalculator); } });
    }
    var districtSelect = document.getElementById("adjacency-district");
    var inputHost = document.getElementById("adjacency-inputs");
    if (!districtSelect || !inputHost || districtSelect._calculatorBound) return;
    districtSelect._calculatorBound = true;
    var rules = {
      campus: [["山脈", 1], ["雨林", .5], ["地熱裂縫", 2], ["大堡礁", 2], ["其他區域", .5]],
      "holy-site": [["山脈", 1], ["森林", .5], ["自然奇觀", 2], ["其他區域", .5]],
      "industrial-zone": [["戰略資源", 1], ["採石場", 1], ["礦場", .5], ["水渠／水壩／運河", 2], ["其他區域", .5]],
      "commercial-hub": [["河流", 2], ["港口", 2], ["其他區域", .5]],
      harbor: [["市中心", 2], ["海洋資源", 1], ["其他區域", .5]],
      "theater-square": [["奇觀", 2], ["娛樂中心／水上樂園", 2], ["其他區域", .5]]
    };
    function updateAdjacencyTotal() {
      var total = 0;
      inputHost.querySelectorAll("[data-adjacency-value]").forEach(function (input) { total += (Number(input.value) || 0) * Number(input.getAttribute("data-adjacency-value")); });
      var output = document.getElementById("adjacency-total");
      if (output) output.textContent = "+" + total;
    }
    function renderAdjacencyInputs() {
      inputHost.innerHTML = (rules[districtSelect.value] || []).map(function (rule, index) { return '<label><span>' + escapeHtml(rule[0]) + '<small>每格 +' + rule[1] + '</small></span><input type="number" min="0" step="1" value="0" data-adjacency-value="' + rule[1] + '" aria-label="' + escapeHtml(rule[0]) + '數量"></label>'; }).join("");
      inputHost.querySelectorAll("input").forEach(function (input) { input.addEventListener("input", updateAdjacencyTotal); });
      updateAdjacencyTotal();
    }
    districtSelect.addEventListener("change", renderAdjacencyInputs);
    renderAdjacencyInputs();
  }

  function clearBasicsFilters() {
    state.basicsFilters = Object.assign({}, defaultState.basicsFilters);
    saveState();
    syncFilterRoute();
    renderBasicsPage(routeParts()[1] || "terrain");
    bindBasicsEvents();
  }

  function clearGovernmentFilters() {
    state.governmentFilters = Object.assign({}, defaultState.governmentFilters);
    saveState();
    syncFilterRoute();
    renderBasicsPage("governments");
    bindBasicsEvents();
  }

  function clearReligionFilters() {
    state.religionFilters = Object.assign({}, defaultState.religionFilters);
    saveState();
    syncFilterRoute();
    renderBasicsPage("religions");
    bindBasicsEvents();
  }

  function clearPeopleFilters() {
    state.peopleFilters = Object.assign({}, defaultState.peopleFilters);
    saveState();
    syncFilterRoute();
    renderBasicsPage("great-people");
    bindBasicsEvents();
  }

  function clearInfrastructureFilters() {
    state.infrastructureFilters = Object.assign({}, defaultState.infrastructureFilters);
    saveState();
    syncFilterRoute();
    renderBasicsPage("infrastructure");
    bindBasicsEvents();
  }

  function bindFilterEvents() {
    if (filterEventsBound) return;
    filterEventsBound = true;
    function updateLeaderFilter(control, key) {
      state.filters[key] = control.type === "checkbox" ? control.checked : control.value;
      saveState();
      syncFilterRoute();
      var favoritesOnly = routeParts()[0] === "favorites";
      renderLeadersPage(favoritesOnly);
    }
    document.addEventListener("change", function (event) {
      var control = event.target.closest("[data-filter]");
      if (!control) return;
      var key = control.getAttribute("data-filter");
      updateLeaderFilter(control, key);
    });
  }

  function toggleFavorite(id, type, button) {
    var list = type === "mode" ? state.modeFavorites : state.favorites;
    var index = list.indexOf(id);
    if (index >= 0) list.splice(index, 1); else list.push(id);
    saveState();
    button.setAttribute("aria-pressed", index < 0 ? "true" : "false");
    button.setAttribute("aria-label", (index < 0 ? "取消收藏" : "收藏") + (type === "mode" ? "此模式" : "此領袖"));
    showToast(index < 0 ? "已加入收藏" : "已取消收藏");
    if (routeParts()[0] === "favorites") renderLeadersPage(true);
  }

  function clearFilters() {
    state.filters = Object.assign({}, defaultState.filters);
    saveState();
    syncFilterRoute();
    renderLeadersPage(routeParts()[0] === "favorites");
  }

  function closeFilterDrawer() {
    var panel = document.getElementById("filters-panel");
    var scrim = document.querySelector(".drawer-scrim");
    var button = document.querySelector('[data-action="toggle-filters"]');
    if (panel) panel.classList.remove("open");
    if (scrim) scrim.remove();
    if (button) button.setAttribute("aria-expanded", "false");
  }

  function toggleFilterDrawer() {
    var panel = document.getElementById("filters-panel");
    var button = document.querySelector('[data-action="toggle-filters"]');
    if (!panel) return;
    var opening = !panel.classList.contains("open");
    panel.classList.toggle("open", opening);
    button.setAttribute("aria-expanded", String(opening));
    var existing = document.querySelector(".drawer-scrim");
    if (opening && !existing) {
      var scrim = document.createElement("div");
      scrim.className = "drawer-scrim";
      scrim.setAttribute("data-action", "close-filters");
      document.body.appendChild(scrim);
      panel.querySelector("input, select, button").focus();
    } else if (!opening && existing) existing.remove();
  }

  function resetRoute(leaderId, routeId) {
    var leader = DATA.leaders.find(function (item) { return item.id === leaderId; });
    var route = leader && leader.routes[routeId];
    if (!leader || !route) return;
    if (!window.confirm("確定要清除「" + leader.name + "」的「" + route.name + "勝利」全部檢查進度嗎？此操作無法復原。")) return;
    var prefix = leaderId + ":" + routeId + ":";
    Object.keys(state.progress).forEach(function (key) { if (key.indexOf(prefix) === 0) delete state.progress[key]; });
    saveState();
    renderLeaderDetail(leaderId, routeId);
    showToast("已重設此路線進度");
  }

  function openDialog(id) {
    var dialog = document.getElementById(id);
    if (!dialog.open) dialog.showModal();
  }

  function updateSearch() {
    var input = document.getElementById("global-search");
    var container = document.getElementById("search-results");
    var query = normalize(input.value);
    activeSearchIndex = -1;
    var pool = siteSearchPages.map(function (item) { return Object.assign({}, item); });
    DATA.searchIndex.forEach(function (item) {
      var base = Object.assign({}, item, { route: canonicalRoute(item.route) });
      if (item.type === "leader") {
        base.lens = "guide";
        pool.push(base);
        pool.push(Object.assign({}, item, { type: "wiki-leader", lens: "wiki", subtitle: item.subtitle + "｜能力百科", route: "#/wiki/leader/" + item.id }));
      } else if (item.type === "mode") {
        pool.push(Object.assign({}, item, { type: "mode-strategy", lens: "guide", subtitle: item.subtitle + "｜模式攻略", route: "#/guide/mode/" + item.id }));
        pool.push(Object.assign({}, item, { lens: "wiki", subtitle: item.subtitle + "｜模式規則", route: "#/wiki/mode/" + item.id }));
      } else {
        base.lens = item.lens || (item.type === "guide" ? "guide" : "wiki");
        pool.push(base);
      }
    });
    if (activeSearchScope !== "all") pool = pool.filter(function (item) { return item.lens === activeSearchScope; });
    if (!query) {
      currentSearchResults = pool.slice(0, 10);
      container.innerHTML = '<p class="search-hint">輸入關鍵字，或從常用條目開始。</p>' + currentSearchResults.map(searchResultButton).join("");
      return;
    }
    var rawTerms = input.value.trim().split(/\s+/).map(normalize).filter(Boolean);
    currentSearchResults = pool.map(function (item) {
      var title = normalize(item.title);
      var subtitle = normalize(item.subtitle);
      var haystack = normalize((item.text || "") + item.title + item.subtitle);
      if (haystack.indexOf(query) < 0 && !rawTerms.every(function (term) { return haystack.indexOf(term) >= 0; })) return null;
      var score = title === query ? 100 : title.indexOf(query) === 0 ? 70 : title.indexOf(query) >= 0 ? 50 : subtitle.indexOf(query) >= 0 ? 30 : 10;
      return { item: item, score: score };
    }).filter(Boolean).sort(function (a, b) { return b.score - a.score || a.item.title.localeCompare(b.item.title, "zh-Hant"); }).slice(0, 16).map(function (entry) { return entry.item; });
    container.innerHTML = currentSearchResults.length ? currentSearchResults.map(searchResultButton).join("") : '<div class="search-hint"><strong>沒有完全相符的結果</strong><br>請縮短關鍵字、切換搜尋範圍，或改搜文明、勝利路線、地形、區域、政策卡與模式名稱。</div>';
  }

  function searchResultButton(item, index) {
    var typeLabels = { page: "章節", leader: "領袖", "wiki-leader": "領袖", mode: "遊戲模式", "mode-strategy": "遊戲模式", guide: "實戰指南", system: "核心機制", terrain: "地形", resource: "資源", improvement: "改良", district: "區域", building: "建築", project: "城市項目", government: "政體", policy: "政策卡", religion: "宗教", belief: "宗教加成", "great-person": "偉人", governor: "總督", "governor-promotion": "總督晉升" };
    var query = document.getElementById("global-search").value;
    return '<button class="search-result" type="button" data-search-index="' + index + '" data-route="' + escapeHtml(item.route) + '" role="option"><span class="result-type result-' + escapeHtml(item.lens || "wiki") + '"><span class="result-lens">' + (item.lens === "guide" ? "攻略" : "Wiki") + '</span><span class="result-kind">' + (typeLabels[item.type] || "條目") + '</span></span><span><span class="result-title">' + renderSearchHighlight(item.title, query) + '</span><span class="result-subtitle">' + renderSearchHighlight(item.subtitle, query) + '</span></span></button>';
  }

  function resetFiltersForSearchTarget(route) {
    var path = canonicalRoute(route).split("?")[0];
    if (path === "#/guide/leaders" || path === "#/favorites") state.filters = Object.assign({}, defaultState.filters);
    else if (path === "#/wiki/terrain") state.basicsFilters.terrainKind = "";
    else if (path === "#/wiki/resources") state.basicsFilters.resourceType = "";
    else if (path === "#/wiki/infrastructure") state.infrastructureFilters = Object.assign({}, defaultState.infrastructureFilters);
    else if (path === "#/wiki/governments") state.governmentFilters = Object.assign({}, defaultState.governmentFilters);
    else if (path === "#/wiki/religions") state.religionFilters = Object.assign({}, defaultState.religionFilters);
    else if (path === "#/wiki/great-people") state.peopleFilters = Object.assign({}, defaultState.peopleFilters);
  }

  function navigateToSearchResult(index) {
    var item = currentSearchResults[index];
    if (!item) return;
    var input = document.getElementById("global-search");
    resetFiltersForSearchTarget(item.route);
    saveState();
    document.getElementById("search-dialog").close();
    var nextHash = routeWithSearchHighlight(item.route, input.value);
    if (location.hash === nextHash) render();
    else location.hash = nextHash;
  }

  function moveSearchSelection(delta) {
    if (!currentSearchResults.length) return;
    activeSearchIndex = (activeSearchIndex + delta + currentSearchResults.length) % currentSearchResults.length;
    document.querySelectorAll(".search-result").forEach(function (button, index) {
      button.classList.toggle("active", index === activeSearchIndex);
      button.setAttribute("aria-selected", String(index === activeSearchIndex));
      if (index === activeSearchIndex) button.scrollIntoView({ block: "nearest" });
    });
  }

  function exportData() {
    var blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "civ6-guide-backup.json";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 0);
    showToast("備份已匯出");
  }

  function importData(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var imported = JSON.parse(reader.result);
        if (!imported || imported.version !== 1 || !Array.isArray(imported.favorites) || !imported.progress || typeof imported.progress !== "object") throw new Error("格式不符");
        state = Object.assign({}, defaultState, imported, { filters: cleanLeaderFilters(imported.filters), basicsFilters: Object.assign({}, defaultState.basicsFilters, imported.basicsFilters || {}), governmentFilters: Object.assign({}, defaultState.governmentFilters, imported.governmentFilters || {}), religionFilters: Object.assign({}, defaultState.religionFilters, imported.religionFilters || {}) });
        saveState();
        applyTheme();
        render();
        showToast("備份已匯入");
      } catch (error) {
        showToast("無法匯入：請選擇本網站匯出的 JSON 備份");
      }
    };
    reader.readAsText(file, "utf-8");
  }

  function clearAllData() {
    if (!window.confirm("確定要清除全部收藏、閱讀進度、主題與篩選設定嗎？此操作無法復原。")) return;
    state = JSON.parse(JSON.stringify(defaultState));
    if (storageAvailable) localStorage.removeItem(STORAGE_KEY);
    applyTheme();
    document.getElementById("settings-dialog").close();
    render();
    showToast("全部本機資料已清除");
  }

  function prefersReducedMotion() {
    return Boolean(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  function cancelDetailsAnimations(details) {
    var animations = typeof details.getAnimations === "function" ? details.getAnimations() : [];
    var trackedAnimation = details._detailsAnimation;
    if (trackedAnimation && animations.indexOf(trackedAnimation) === -1) animations.push(trackedAnimation);
    details._detailsAnimation = null;
    animations.forEach(function (animation) {
      if (trackedAnimation && animation !== trackedAnimation && (!animation.effect || animation.effect.target !== details)) return;
      animation.onfinish = null;
      animation.oncancel = null;
      animation.cancel();
    });
  }

  function clearDetailsAnimationStyles(details) {
    details.style.removeProperty("height");
    details.style.removeProperty("overflow");
    details.style.removeProperty("will-change");
    details.removeAttribute("data-details-animating");
  }

  function finishDetailsAnimation(details, shouldOpen, animation) {
    if (animation && details._detailsAnimation !== animation) return;
    if (animation) {
      animation.onfinish = null;
      animation.oncancel = null;
      details._detailsAnimation = null;
    }
    details.open = shouldOpen;
    clearDetailsAnimationStyles(details);
    if (shouldOpen && details.classList.contains("wiki-section-switcher")) {
      requestAnimationFrame(function () { positionBasicsIndicator(routeParts()[1] || "terrain"); });
    }
  }

  function animateDetails(details, shouldOpen) {
    var startHeight = details.getBoundingClientRect().height;
    cancelDetailsAnimations(details);
    clearDetailsAnimationStyles(details);

    if (prefersReducedMotion() || typeof details.animate !== "function") {
      finishDetailsAnimation(details, shouldOpen);
      return;
    }

    // 先量出原生收合與完整展開高度，再讓每張卡片獨立完成動畫。
    details.open = false;
    var collapsedHeight = details.getBoundingClientRect().height;
    details.open = true;
    var expandedHeight = details.getBoundingClientRect().height;
    var endHeight = shouldOpen ? expandedHeight : collapsedHeight;

    if (Math.abs(endHeight - startHeight) < 1) {
      finishDetailsAnimation(details, shouldOpen);
      return;
    }

    details.style.height = startHeight + "px";
    details.style.overflow = "hidden";
    details.style.willChange = "height";
    details.setAttribute("data-details-animating", shouldOpen ? "opening" : "closing");

    var animation = details.animate([
      { height: startHeight + "px" },
      { height: endHeight + "px" }
    ], {
      duration: shouldOpen ? 260 : 190,
      easing: shouldOpen ? "cubic-bezier(.22, 1, .36, 1)" : "cubic-bezier(.4, 0, 1, 1)"
    });

    details._detailsAnimation = animation;
    animation.onfinish = function () {
      finishDetailsAnimation(details, shouldOpen, animation);
    };
    animation.oncancel = function () {
      finishDetailsAnimation(details, shouldOpen, animation);
    };
  }

  document.addEventListener("click", function (event) {
    var summary = event.target.closest("summary");
    if (summary && summary.parentElement && summary.parentElement.tagName === "DETAILS") {
      event.preventDefault();
      var details = summary.parentElement;
      var animatingTo = details.getAttribute("data-details-animating");
      var shouldOpen = animatingTo ? animatingTo === "closing" : !details.open;
      animateDetails(details, shouldOpen);
      return;
    }
    var favorite = event.target.closest('[data-action="favorite"]');
    if (favorite) { event.preventDefault(); toggleFavorite(favorite.getAttribute("data-id"), favorite.getAttribute("data-type"), favorite); return; }
    var action = event.target.closest("[data-action]");
    if (action) {
      var name = action.getAttribute("data-action");
      if (name === "clear-filters") clearFilters();
      else if (name === "toggle-filters") toggleFilterDrawer();
      else if (name === "close-filters") closeFilterDrawer();
      else if (name === "reset-route") resetRoute(action.getAttribute("data-leader"), action.getAttribute("data-route"));
      else if (name === "clear-basics-filters") clearBasicsFilters();
      else if (name === "clear-government-filters") clearGovernmentFilters();
      else if (name === "clear-religion-filters") clearReligionFilters();
      else if (name === "clear-people-filters") clearPeopleFilters();
      else if (name === "clear-infrastructure-filters") clearInfrastructureFilters();
      else if (name === "open-search") { openDialog("search-dialog"); updateSearch(); setTimeout(function () { document.getElementById("global-search").focus(); }, 0); }
      else if (name === "search-match-prev") setActiveRouteSearchMatch(activeRouteSearchIndex - 1);
      else if (name === "search-match-next") setActiveRouteSearchMatch(activeRouteSearchIndex + 1);
      else if (name === "clear-search-highlight") { replaceRouteQuery({ highlight: null }); render(); }
      return;
    }
    var scrollButton = event.target.closest("[data-scroll-target]");
    if (scrollButton) {
      var scrollTarget = document.getElementById(scrollButton.getAttribute("data-scroll-target"));
      if (scrollTarget) scrollTarget.scrollIntoView({ block: "start" });
      return;
    }
    var searchResult = event.target.closest("[data-search-index]");
    if (searchResult) {
      navigateToSearchResult(Number(searchResult.getAttribute("data-search-index")));
    }
  });

  document.addEventListener("change", function (event) {
    if (event.target.id === "route-search-match-select") {
      setActiveRouteSearchMatch(Number(event.target.value));
      return;
    }
    if (event.target.matches("[data-progress]")) {
      var key = event.target.getAttribute("data-progress");
      if (event.target.checked) state.progress[key] = true; else delete state.progress[key];
      saveState();
      var parts = routeParts();
      var leaderId = parts[0] === "guide" && parts[1] === "leader" ? parts[2] : parts[1];
      var routeId = parts[0] === "guide" && parts[1] === "leader" ? parts[3] : parts[2];
      var leader = DATA.leaders.find(function (item) { return item.id === leaderId; });
      if (leader) {
        var progressLabel = document.querySelector(".route-copy .recommendation");
        if (progressLabel && leader.routes[routeId]) progressLabel.textContent = leader.routes[routeId].recommendation + "，目前完成 " + progressFor(leaderId, routeId) + "%";
      }
    }
  });

  document.querySelectorAll(".search-trigger").forEach(function (button) {
    button.addEventListener("click", function () { openDialog("search-dialog"); updateSearch(); setTimeout(function () { document.getElementById("global-search").focus(); }, 0); });
  });
  document.querySelectorAll("[data-search-scope]").forEach(function (button) {
    button.addEventListener("click", function () {
      activeSearchScope = button.getAttribute("data-search-scope") || "all";
      document.querySelectorAll("[data-search-scope]").forEach(function (item) {
        var active = item === button;
        item.classList.toggle("active", active);
        item.setAttribute("aria-pressed", String(active));
      });
      updateSearch();
    });
  });
  document.getElementById("settings-open").addEventListener("click", function () { openDialog("settings-dialog"); applyTheme(); });
  document.getElementById("global-search").addEventListener("input", updateSearch);
  document.getElementById("global-search").addEventListener("keydown", function (event) {
    if (event.key === "ArrowDown") { event.preventDefault(); moveSearchSelection(1); }
    else if (event.key === "ArrowUp") { event.preventDefault(); moveSearchSelection(-1); }
    else if (event.key === "Enter" && activeSearchIndex >= 0) { event.preventDefault(); navigateToSearchResult(activeSearchIndex); }
  });
  document.getElementById("theme-cycle").addEventListener("click", function () {
    var themes = ["system", "light", "dark"];
    state.theme = themes[(themes.indexOf(state.theme) + 1) % themes.length];
    saveState(); applyTheme(); showToast("顯示主題：" + { system: "跟隨系統", light: "淺色", dark: "深色" }[state.theme]);
  });
  document.querySelectorAll("[data-theme-choice]").forEach(function (button) {
    button.addEventListener("click", function () { state.theme = button.getAttribute("data-theme-choice"); saveState(); applyTheme(); });
  });
  document.getElementById("export-data").addEventListener("click", exportData);
  document.getElementById("import-data").addEventListener("change", function (event) { importData(event.target.files[0]); event.target.value = ""; });
  document.getElementById("clear-data").addEventListener("click", clearAllData);
  document.addEventListener("keydown", function (event) {
    if (event.key === "F3" && routeSearchMatches.length) {
      event.preventDefault();
      setActiveRouteSearchMatch(activeRouteSearchIndex + (event.shiftKey ? -1 : 1));
      return;
    }
    if (event.key === "/" && !/input|select|textarea/i.test(document.activeElement.tagName)) { event.preventDefault(); openDialog("search-dialog"); updateSearch(); setTimeout(function () { document.getElementById("global-search").focus(); }, 0); }
    if (event.key === "Escape") closeFilterDrawer();
  });
  window.addEventListener("hashchange", function () { closeFilterDrawer(); window.scrollTo(0, 0); render(); main.focus({ preventScroll: true }); });
  window.addEventListener("resize", function () {
    if (navResizeFrame) cancelAnimationFrame(navResizeFrame);
    navResizeFrame = requestAnimationFrame(function () {
      navResizeFrame = 0;
      arrangeExpandableGrids(main);
      document.querySelectorAll(".primary-nav, .mobile-nav").forEach(function (nav) {
        positionSlidingIndicator(nav, nav.querySelector("[data-nav].active"));
      });
      var basicsNav = main.querySelector(".basics-tabs");
      if (basicsNav) positionSlidingIndicator(basicsNav, basicsNav.querySelector(".basics-tab.active"));
    });
  }, { passive: true });
  if (window.matchMedia) window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", function () { if (state.theme === "system") applyTheme(); });

  if (!storageAvailable) document.getElementById("storage-warning").hidden = false;
  applyTheme();
  if (!location.hash) location.hash = state.recent && state.recent.indexOf("#/") === 0 ? canonicalRoute(state.recent) : "#/home";
  else render();
}());
