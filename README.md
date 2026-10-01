# 文明 VI 戰略百科｜攻略 × Wiki

[繁體中文](#文明-vi-戰略百科攻略--wiki) · [English](#english)

《Sid Meier's Civilization VI》（文明 VI）的非官方繁體中文攻略與百科，整合全 DLC 領袖資料、六種勝利路線、遊戲模式與規則查詢。

**這是一個可直接下載使用的離線靜態網站。** 完整專案已包含網頁、資料包、樣式與圖片；解壓縮後以瀏覽器開啟 `index.html` 即可閱讀，不需要安裝套件、登入帳號、啟動伺服器或申請任何 AI／其他服務的 API 密鑰。

## 下載與使用

1. 在本 GitHub 儲存庫首頁點選綠色 **Code** 按鈕，再選擇 **Download ZIP**。
2. 將 ZIP **完整解壓縮**到電腦上的資料夾。請勿直接在壓縮檔內開啟網頁。
3. 在解壓縮後的根目錄找到 `index.html`，使用近期版本的 Microsoft Edge、Google Chrome 或 Mozilla Firefox 開啟。
4. 在首頁選擇「攻略」或「Wiki」，即可開始查閱。完成下載後，即使中斷網路也能使用內建內容與工具。

請保留 `index.html`、`assets/` 等檔案的相對位置；只下載 `index.html` 或只複製單一網頁，會缺少資料、樣式及圖片。

熟悉 Git 的使用者也可以下載完整原始碼：

```bash
git clone https://github.com/GrosserKurfurstcmot/civ6-offline-guide.git
cd civ6-offline-guide
```

接著以瀏覽器開啟該資料夾中的 `index.html`。日常閱讀不需要執行建置指令。

## 網站功能

| 入口 | 內容 |
| --- | --- |
| 攻略 | 領袖與六種勝利路線、開局至終盤規劃、局勢診斷、科技市政節奏、兵種與攻城，以及八種遊戲模式的實戰運用。 |
| Wiki | 文明與領袖能力、地形地貌、資源、改良設施、區域、建築、城市項目、政體政策、宗教信條、偉人、總督與核心機制。 |
| 全站搜尋 | 使用右上角搜尋按鈕或 `/`，以繁體中文、英文名稱或規則關鍵字查找內容，並切換攻略／Wiki 搜尋範圍。 |
| 收藏 | 保存領袖與模式收藏、階段檢查進度及最近閱讀位置。 |
| 互動工具 | 在本機估算地塊產出與區域相鄰加成。 |

資料涵蓋 74 個可選領袖／人格條目（67 位不同領袖）、六種勝利、八種遊戲模式，以及地圖、城市規劃、制度、宗教、偉人與治理資料。介面可切換深色、淺色與跟隨系統主題。

## 離線與閱讀資料

- 網站執行時不依賴 CDN、線上字型、後端服務或 AI API；網頁、圖片與內建資料均隨專案提供。
- 收藏、閱讀進度、主題與篩選條件保存在目前瀏覽器的 `localStorage`，網站不會將這些資料傳送至伺服器。
- 更換瀏覽器、使用無痕模式、移動網站資料夾或清除瀏覽器資料，可能使原有閱讀資料無法取得。
- 需要保留進度時，點選右上角「資料管理」，使用「匯出 JSON」備份；在另一個瀏覽器開啟網站後，可透過「匯入 JSON」還原。
- 閱讀資料備份屬於個人資料，請自行保存，不要提交至公開儲存庫。
- 網站中的外部參考連結需要網路；只有維護者主動執行資料抓取腳本時，才會連線取得外部資料或圖示。

若瀏覽器顯示無法保存本機資料，仍可閱讀攻略與百科，但收藏等功能可能無法持續保存。可改用一般瀏覽視窗，並檢查瀏覽器是否允許本機儲存。

## 專案結構

```text
civ6-offline-guide/
├── index.html              # 網站入口
├── assets/
│   ├── app.js              # 介面、路由、搜尋與互動功能
│   ├── styles.css          # 網站樣式
│   ├── data.bundle.js      # 已建置的離線資料包
│   └── ...                 # 本機圖示與圖片
├── data/                   # 攻略與百科的 JSON 原始資料
├── scripts/                # 建置、驗證、測試與資料維護工具
├── .gitignore              # 本機檔案、憑證及個人備份的忽略規則
├── LICENSES.md             # 第三方素材與內容來源說明
└── README.md
```

## 維護與驗證

以下指令供修改原始資料或程式碼的維護者使用。一般讀者可以跳過本節。

需要安裝 Node.js；建置與既有測試使用 Node.js 內建模組，不需要 `npm install`。涉及資料抓取的腳本使用內建 `fetch`，請使用支援此功能的 Node.js 版本。

修改 `data/` 中的 JSON 後，在專案根目錄執行：

```bash
node scripts/build.js
```

建置器會驗證資料並更新 `assets/data.bundle.js`。完成後可執行既有檢查：

```bash
node scripts/smoke-test.js
node scripts/interaction-test.js
```

需要重新取得或校對來源資料時，可在有網路的環境中執行相應腳本：

```bash
node scripts/fetch-game-icons.js
node scripts/scrape-infrastructure.js
node scripts/scrape-governments.js
node scripts/scrape-religions.js
node scripts/scrape-people.js
```

這些資料維護腳本可能更新原始資料或圖片，執行前請先保存自己的修改，並在執行後重新建置與檢查。完成版已包含正常閱讀所需的資料與素材。

## 攻略適用範圍

- 內容版本：2026.08。
- 主要規則集：Gathering Storm（風雲變幻）。
- 攻略基準：單人、皇帝至不朽難度、標準速度與標準地圖。
- 語言：繁體中文，支援以英文名稱搜尋。

不同地圖、難度、速度與模組可能改變策略適用性；使用時請配合實際局勢判斷。

## 第三方素材與聲明

本專案為非官方粉絲攻略，與 Firaxis Games、2K 或 Take-Two Interactive 無關，亦不代表上述公司背書。

專案包含用於規則識別的遊戲圖示及部分遊戲內效果文字，相關權利歸各權利人所有。第三方素材、文字及來源說明請閱讀 [LICENSES.md](LICENSES.md)。該檔案的內容聲明不等同於對整個專案或所有遊戲素材授予開源授權。

### 官方素材使用政策

[2K 的素材發佈政策](https://support.2k.com/hc/en-us/articles/201335153-Policy-on-posting-copyrighted-2K-material)表示，一般不反對非商業、且不故意劇透的粉絲素材使用，但保留要求下架與修改政策的權利。此政策並未明確說明大量圖示檔案在 GitHub 儲存庫中的再散布；本儲存庫未附針對此素材包的個別書面授權，亦不宣稱素材可自由再利用。非官方、非商業與來源標示不等同於取得所有使用權限。政策查閱日期：2026-10-02。

## English

### Civilization VI Strategy Encyclopedia — Guides & Wiki

An unofficial Traditional Chinese guide and reference website for *Sid Meier's Civilization VI*, covering leaders from all DLC, six victory paths, game modes, and gameplay rules.

**This is a downloadable offline static website.** The repository includes the HTML page, JavaScript, styles, data bundle, and images needed to use it. After downloading and extracting the full project, open `index.html` in your browser. No server, package installation, account, or AI/API key is required for normal use.

The website interface and articles are in **Traditional Chinese**. This English README explains how to use the project; it does not translate the website itself. English names are also supported in search.

### Download and open

1. On the repository page, click **Code → Download ZIP**.
2. **Extract the entire ZIP** into a folder on your computer. Do not open the page from inside the ZIP archive.
3. Open the root-level `index.html` with a recent version of Microsoft Edge, Google Chrome, or Mozilla Firefox.
4. Choose **攻略** (Guides) or **Wiki** on the home page. Once downloaded, the bundled content and tools can be used without an internet connection.

Keep the original folder structure. Downloading only `index.html`, or moving it away from `assets/`, will break the page because the data, scripts, styles, and images are stored separately.

Alternatively, clone the repository:

```bash
git clone https://github.com/GrosserKurfurstcmot/civ6-offline-guide.git
cd civ6-offline-guide
```

Then open `index.html` in your browser. You do not need to run a build to read the included version.

### Features and coverage

| Feature | Description |
| --- | --- |
| Guides | Leader strategies, six victory paths, early-to-late-game plans, common gameplay problems, research timing, combat, and eight game modes. |
| Wiki | Civilizations, leaders, terrain, resources, improvements, districts, buildings, projects, governments, policies, beliefs, great people, governors, and core rules. |
| Search | Click the search button in the top-right corner or press `/`. Search by Traditional Chinese or English names and gameplay keywords. |
| Favorites | Save favorite leaders and modes, checklist progress, and recent reading locations in the current browser. |
| Calculators | Estimate tile yields and district adjacency bonuses locally. |

The project includes 74 selectable leader/persona entries representing 67 distinct leaders. Content version: **2026.08**. Strategy guidance primarily assumes **Gathering Storm**, single-player games, Emperor to Immortal difficulty, standard speed, and a standard map. Different settings or mods may require adjustments. The interface supports dark, light, and system themes.

### Offline use and personal data

The website does not depend on a CDN, online fonts, a backend, or an AI service during normal use. Its reading data is stored in the current browser's `localStorage` and is not sent to a server.

To back up your reading data, open **資料管理** (Data management) in the top-right corner and choose **匯出 JSON** (Export JSON). Use **匯入 JSON** (Import JSON) to restore it in another browser. Keep these personal backup files private and do not commit them to a public repository.

Changing browsers, moving the project folder, using private browsing, or clearing browser storage can make previously saved data unavailable. If storage is blocked, the content remains readable, but favorites and progress may not persist.

External reference links require internet access. Optional maintenance scripts also access external sources when explicitly run; they are not needed to read the downloaded website.

### Project files and maintenance

- `index.html`: website entry point.
- `assets/`: application code, styles, the built `data.bundle.js`, and local images.
- `data/`: source JSON files for guides and reference content.
- `scripts/`: build, validation, testing, and optional data-fetching tools.
- `.gitignore`: rules for local system files, credentials, logs, and reading-data backups.
- `LICENSES.md`: third-party material and content-source notices.

Maintainers need Node.js. The build and existing tests use built-in Node.js modules; `npm install` is not required. Fetching scripts need a Node.js version with built-in `fetch` support.

After editing the source JSON files, run these commands from the project root:

```bash
node scripts/build.js
node scripts/smoke-test.js
node scripts/interaction-test.js
```

The build validates the data and updates `assets/data.bundle.js`. Optional online maintenance tools are `fetch-game-icons.js`, `scrape-infrastructure.js`, `scrape-governments.js`, `scrape-religions.js`, and `scrape-people.js` under `scripts/`. They may update data or images, so save your changes before running them, then rebuild and review the results.

### Third-party materials and copyright

This is an unofficial fan project, unaffiliated with and not endorsed by Firaxis Games, 2K, or Take-Two Interactive. Game icons, portraits, trademarks, and some in-game effect text remain the property of their respective rights holders. See [LICENSES.md](LICENSES.md). These notices do not grant an open-source license for the entire project or for the bundled game assets.

[2K's posting policy](https://support.2k.com/hc/en-us/articles/201335153-Policy-on-posting-copyrighted-2K-material) generally does not object to non-commercial fan use without intentional spoilers, but reserves takedown and policy-change rights. It does not explicitly address redistribution of a large icon collection in a GitHub repository. No project-specific written permission for this asset bundle is documented in this repository; no unrestricted reuse rights are claimed. Policy checked: **2026-10-02**.
