#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const leaders = readJson("data/leaders.json");
const modes = readJson("data/modes.json");
const basics = readJson("data/basics.json");
const governments = readJson("data/governments.json");
const religions = readJson("data/religions.json");
const people = readJson("data/people.json");
const infrastructure = readJson("data/infrastructure.json");
const handbook = readJson("data/handbook.json");

const routeOrder = ["science", "culture", "domination", "religion", "diplomacy", "score"];
const routeNames = {
  science: "科學（科技）", culture: "文化", domination: "統治",
  religion: "宗教", diplomacy: "外交", score: "分數"
};
const stageOrder = ["early", "mid", "late", "end"];
const stageNames = { early: "開局", mid: "中期", late: "後期", end: "終盤" };
const civIconMap = {
  America: "america", Macedon: "macedon", Nubia: "nubia", Gaul: "gaul", Vietnam: "vietnam",
  Byzantium: "byzantium", France: "france", India: "india", Egypt: "egypt", Persia: "persia",
  Phoenicia: "phoenicia", England: "england", Germany: "germany", Mongolia: "mongolia",
  Sumeria: "sumeria", Indonesia: "indonesia", Greece: "greece", Norway: "norway",
  Japan: "japan", Poland: "poland", Khmer: "khmer", Portugal: "portugal",
  Australia: "australia", Sweden: "sweden", China: "china", "Māori": "maori",
  Maya: "maya", Mapuche: "mapuche", Mali: "mali", Hungary: "hungary", Ethiopia: "ethiopia",
  Aztec: "aztec", Kongo: "kongo", Inca: "inca", Brazil: "brazil", Russia: "russia",
  Spain: "spain", Cree: "cree", Arabia: "arabia", Korea: "korea", Zulu: "zulu",
  "Gran Colombia": "gran-colombia", Ottomans: "ottomans", Georgia: "georgia",
  Scythia: "scythia", Rome: "rome", Scotland: "scotland", Canada: "canada",
  Babylon: "babylon"
};
const gradeText = {
  S: "核心強項，應優先規劃", A: "高度適合，可穩定主攻", B: "可行，需要地圖或節奏配合",
  C: "偏弱，適合作為轉線或挑戰", D: "不建議主攻，只在特殊局勢採用"
};

const ratingEffects = {
  science: { science: 3 }, production: { science: 2, domination: 1, score: 1 },
  military: { domination: 3 }, ranged: { domination: 2 }, cavalry: { domination: 2 },
  siege: { domination: 2 }, corps: { domination: 2 }, general: { domination: 2 },
  early: { domination: 1 }, movement: { domination: 2 }, formation: { domination: 2 },
  culture: { culture: 3 }, wonder: { culture: 2 }, appeal: { culture: 2 },
  relic: { culture: 2, religion: 1 }, greatpeople: { culture: 2, science: 1 },
  greatworks: { culture: 3 }, luxury: { culture: 1, diplomacy: 1 },
  religion: { religion: 3 }, faith: { religion: 2, culture: 1 },
  diplomacy: { diplomacy: 3 }, citystate: { diplomacy: 2 }, alliance: { diplomacy: 2 },
  peace: { diplomacy: 2, culture: 1 }, trade: { science: 1, diplomacy: 1, score: 1 },
  gold: { domination: 1, diplomacy: 1, score: 1 }, growth: { science: 2, culture: 1, score: 1 },
  tall: { science: 2, culture: 1 }, district: { science: 1, culture: 1 },
  planning: { science: 2 }, naval: { domination: 1, science: 1 },
  espionage: { science: 1, culture: 1, diplomacy: 1 }, loyalty: { domination: 1, culture: 1 },
  era: { culture: 1, domination: 1 }, governor: { science: 1, culture: 1 },
  tundra: { culture: 1, diplomacy: 1 }, mountain: { science: 2 },
  continent: { domination: 1, score: 1 }, expansion: { domination: 1, score: 2 },
  builder: { science: 1, culture: 1, score: 1 }, policy: { science: 1, culture: 1, diplomacy: 1 },
  eureka: { science: 3 }, timing: { science: 1, domination: 1 }, pillaging: { domination: 2 },
  defense: { diplomacy: 1, score: 1 }, terrain: { culture: 1, domination: 1 }
};

function deriveRatings(leader) {
  const scores = { science: 2, culture: 2, domination: 1, religion: 1, diplomacy: 2, score: 2 };
  for (const tag of leader.tags) {
    const effect = ratingEffects[tag] || {};
    for (const routeId of Object.keys(effect)) scores[routeId] += effect[routeId];
  }
  return routeOrder.map((routeId) => {
    const value = scores[routeId];
    return value >= 5 ? "S" : value >= 4 ? "A" : value >= 3 ? "B" : value >= 2 ? "C" : "D";
  }).join("");
}

const sharedStages = {
  science: {
    early: { objective: "先擴張再鎖定兩座高相鄰校園，人口與生產不能落後。", techs: ["製陶術", "文字", "採礦", "畜牧業"], civics: ["法典", "對外貿易", "早期帝國", "國家勞動力"], policies: ["都市規劃", "紀律", "殖民", "天才策略"], districts: ["校園：山脈、礁石或地熱相鄰優先", "商業中心／港口：維持擴張現金", "政府廣場：祖祠支援移民潮"], wonders: ["金字塔：有沙漠且不延誤移民才搶", "神諭所：偉人核心城可考慮", "大圖書館：高難度通常不硬搶"], queue: ["斥候或投石兵", "移民", "建造者", "校園", "圖書館"] },
    mid: { objective: "形成至少六城研究網，讓學徒制生產力與教育科技同步到位。", techs: ["學徒制", "機械", "教育", "工業化"], civics: ["政治哲學", "封建主義", "歷史記錄", "探索"], policies: ["自然哲學", "理性主義", "農奴制", "貿易聯盟"], districts: ["校園：補齊圖書館與大學", "工業區：區域群共享工廠", "商業中心／港口：每城一條商路"], wonders: ["基爾瓦基斯瓦尼：控制科研城邦時最高優先", "牛津大學：高產校園城預留地塊", "魯爾山谷：只投資最強工業城"], queue: ["大學", "關鍵工業區", "商人", "間諜", "第二批移民或征服軍"] },
    late: { objective: "以科研槽位、城邦與宜居度拉高每回合科技，同時預鋪太空港城市。", techs: ["化學", "電力", "火箭技術", "電腦"], civics: ["啟蒙運動", "選舉權", "意識形態", "冷戰"], policies: ["五年計畫", "理性主義", "國際太空總署", "自由市場"], districts: ["太空港：最高生產城市先建", "工業區：發電與區域供電", "社區：只在住房確實卡人口時建"], wonders: ["牛津大學：尚未完成則最後評估", "魯爾山谷：太空主城核心", "阿蒙森史考特站：有雪地且能及時完成才做"], queue: ["研究實驗室", "太空港", "地球衛星", "間諜反諜報", "拉格朗日或雷射站準備"] },
    end: { objective: "把所有金幣、信仰、工人次數與政策槽集中在系外行星遠征。", techs: ["衛星", "機器人技術", "核融合", "奈米科技"], civics: ["全球化", "社群媒體", "創業政治", "未來市政"], policies: ["國際太空總署", "整合太空單元", "電子商務", "線上社群"], districts: ["太空港：兩至三座即可，避免全國停產", "工業區：太空城全供電", "校園：執行校園研究補最後科技"], wonders: ["終盤通常停止新奇觀", "必要時用砍伐或大工程師完成太空項目", "保留鋁供拉格朗日雷射站"], queue: ["登月計畫", "火星殖民地", "系外行星遠征", "地面／拉格朗日雷射站", "反間諜與防空"] }
  },
  culture: {
    early: { objective: "用擴張、紀念碑與第一座劇院建立文化底盤，先確保地塊魅力。", techs: ["製陶術", "占星術", "灌溉", "工程學"], civics: ["對外貿易", "早期帝國", "國家勞動力", "戲劇與詩歌"], policies: ["都市規劃", "殖民", "天才策略", "啟示"], districts: ["劇院廣場：靠奇觀或娛樂區取相鄰", "聖地：信仰支援博物學家與搖滾樂團", "商業中心／港口：維持對外商路"], wonders: ["神諭所：偉人城優先", "金字塔：建造者與魅力改良都受益", "競技場：能覆蓋多城才建"] , queue: ["斥候", "移民", "紀念碑", "劇院廣場", "圓形劇場"] },
    mid: { objective: "累積作家、藝術家與考古學家，並和所有文明建立開放邊界與商路。", techs: ["印刷術", "城堡", "飛行", "無線電"], civics: ["人文主義", "探索", "自然歷史", "文化遺產"], policies: ["美學", "偉大作品", "自由市場", "衛星廣播"], districts: ["劇院廣場：分配藝術與考古博物館", "娛樂中心：提高宜居與奇觀相鄰", "聖地：持續累積信仰"], wonders: ["基爾瓦基斯瓦尼：文化城邦網路強時優先", "大英博物館類槽位奇觀：評估主題化", "紫禁城：額外萬用政策槽極佳"], queue: ["博物館", "考古學家", "商人", "文化同盟", "國家公園地塊整理"] },
    late: { objective: "確認旅遊倍率、主題化與國家公園位置，使用飛行把改良文化轉旅遊。", techs: ["飛行", "無線電", "電腦", "鋼鐵"], civics: ["自然保育", "文化遺產", "大眾媒體", "社群媒體"], policies: ["衛星廣播", "遺產旅遊", "線上社群", "市場經濟"], districts: ["劇院廣場：全面主題化", "娛樂中心／水上樂園：提供宜居和旅遊", "航空站：放置海濱度假區所需科技配套"], wonders: ["基督像：宗教旅遊與海濱度假區核心", "艾菲爾鐵塔：全國魅力核心", "百老匯／雪梨歌劇院：有餘裕再建"], queue: ["廣播中心", "博物學家", "海濱度假區建造者", "搖滾樂團", "文化項目"] },
    end: { objective: "辨認最難超越的對手，把搖滾樂團、商路和政策集中對準該文明。", techs: ["電腦", "電信", "複合材料", "衛星"], civics: ["社群媒體", "全球化", "創業政治", "未來市政"], policies: ["線上社群", "衛星廣播", "遺產旅遊", "集體行動主義"], districts: ["劇院廣場：執行文化節慶", "聖地：只生產信仰或購買樂團", "航空站：快速運送樂團"], wonders: ["停止低影響奇觀", "保護艾菲爾鐵塔與基督像城市", "用間諜破壞文化競爭者太空與生產"], queue: ["搖滾樂團", "博物學家", "文化節慶", "商人補目標國商路", "間諜保護傑作"] }
  },
  domination: {
    early: { objective: "偵察鄰國兵力與地形，確立特色單位或劍士前的第一個進攻窗口。", techs: ["畜牧業", "弓箭術", "青銅器", "鐵器"], civics: ["法典", "技藝", "早期帝國", "軍事傳統"], policies: ["紀律", "斯巴達教育", "徵兵", "騎兵教範"], districts: ["軍營：有大將軍目標才早建", "商業中心：支付升級與維護", "校園：避免軍隊科技落後"], wonders: ["兵馬俑：大軍已成形時優先", "金字塔：砍伐與修復效率", "大將軍點數比早期奇觀更重要"], queue: ["斥候", "投石兵兩隊", "近戰單位", "攻城槌", "移民或被征服城市取代"] },
    mid: { objective: "建立大將軍、攻城器與前線商路，按十回合一城的節奏連續推進。", techs: ["機械", "軍事工程學", "火藥", "金屬鑄造"], civics: ["僱傭兵", "封建主義", "君權神授", "民族主義"], policies: ["職業軍隊", "封建契約", "大軍團", "劫掠"], districts: ["軍營：兵工廠與軍械庫", "商業中心／港口：升級資金", "娛樂中心：處理厭戰與宜居"], wonders: ["兵馬俑：免費晉升可刷新攻勢", "阿爾罕布拉宮：額外軍事槽", "威尼斯軍械庫：海戰地圖最高優先"], queue: ["主力遠程或騎兵", "攻城塔／轟石砲", "支援單位", "商人到前線", "紀念碑與糧倉修復"] },
    late: { objective: "用軍團、軍隊、觀測氣球與鐵路維持推進速度，避免補給線拉長。", techs: ["彈道學", "鋼鐵", "飛行", "合成材料"], civics: ["民族主義", "動員", "法西斯主義", "冷戰"], policies: ["全民皆兵", "閃電戰", "總體戰", "軍事研究"], districts: ["軍營：軍事學院提供軍團生產", "航空站：轟炸機轉折點", "工業區：補充高成本現代軍"], wonders: ["魯爾山谷：主兵工城", "五角大廈：空軍核心可考慮", "此時不為低戰略價值奇觀停軍備"], queue: ["砲兵與觀測氣球", "轟炸機", "坦克／現代裝甲", "防空與戰鬥機", "軍事工程師鋪鐵路"] },
    end: { objective: "只需奪取各文明原始首都，使用空軍與機動軍避開無關城市。", techs: ["先進飛行", "雷射", "機器人技術", "隱形技術"], civics: ["全球化", "資訊戰爭", "快速部署", "未來市政"], policies: ["閃電戰", "第三選擇", "整體化攻擊後勤", "國際水域"], districts: ["航空站：輪替轟炸機", "軍營：快速補充現代軍", "港口：海圖用核潛艦與飛彈巡洋艦"], wonders: ["終盤停止奇觀", "保留鋁、鈾與石油供主力", "需要時以核武打開最後首都"], queue: ["噴射轟炸機", "現代裝甲軍隊", "無人機", "核裝置或熱核裝置", "快速部署工兵"] }
  },
  religion: {
    early: { objective: "占星術後立即完成高相鄰聖地，確保大預言家並選定可擴張信條。", techs: ["占星術", "採礦", "灌溉", "航海術"], civics: ["法典", "技藝", "神秘主義", "政治哲學"], policies: ["神王", "啟示", "經文", "都市規劃"], districts: ["聖地：山脈、自然奇觀或文明特有相鄰", "政府廣場：祠堂或祖祠依擴張選擇", "商業中心／港口：支付使徒支援"], wonders: ["巨石陣：通常不如直接建聖地", "神諭所：信仰偉人混合城可建", "摩訶菩提寺：有森林且能拿兩使徒時優先"], queue: ["斥候", "神社", "聖地祈禱一至兩次", "移民", "傳教士"] },
    mid: { objective: "以使徒取得關鍵信仰強化，傳教士處理空白城市，使徒負責神學戰。", techs: ["教育", "印刷術", "製圖學", "城堡"], civics: ["神學", "改革教會", "封建主義", "探索"], policies: ["經文", "宗教教團", "宗教命令", "同盟宗教"], districts: ["聖地：寺廟與宗教建築", "政府廣場：大師禮拜堂可用信仰買軍", "商業中心／港口：開視野與補金幣"], wonders: ["摩訶菩提寺：免費使徒", "米納克希神廟：宗教單位支援", "布達拉宮：外交槽兼顧宗教外交"], queue: ["使徒取得辯論者或翻譯員", "古魯隨隊", "傳教士填空白城", "審判官守本土", "商人開通目標區域"] },
    late: { objective: "把世界分成數個傳教戰區，用宗教同盟、視野與治療點輪替使徒。", techs: ["製圖學", "蒸汽動力", "飛行", "電腦"], civics: ["改革教會", "民族主義", "冷戰", "職業體育"], policies: ["宗教命令", "同盟宗教", "經文", "集體行動主義"], districts: ["聖地：執行祈禱換信仰", "娛樂中心：保持高宜居以穩定產出", "航空站：跨洲部署宗教單位"], wonders: ["聖索菲亞大教堂：額外傳播次數", "葉里溫城邦宗主權通常比任何奇觀更關鍵", "此後停止非必要奇觀"], queue: ["高級使徒", "古魯", "審判官", "聖地祈禱", "航空站與運輸"] },
    end: { objective: "只計算尚未過半的文明，集中傳播次數而不是平均撒向全圖。", techs: ["先進飛行", "衛星", "電信", "機器人技術"], civics: ["全球化", "社群媒體", "未來市政", "職業體育"], policies: ["宗教命令", "同盟宗教", "集體行動主義", "線上社群"], districts: ["聖地：全部轉祈禱項目", "航空站：縮短跨洲時間", "港口：海圖提供安全登陸"], wonders: ["終盤不再新建宗教奇觀", "保護提供信仰或使徒能力的城邦", "必要時以軍隊清除阻塞宗教單位"], queue: ["辯論者使徒", "翻譯員使徒", "古魯", "祈禱項目", "最後一波傳教士"] }
  },
  diplomacy: {
    early: { objective: "盡快遇見文明與城邦，建立代表團、商路和第一批使者。", techs: ["航海術", "文字", "天文導航", "製圖學"], civics: ["對外貿易", "神秘主義", "政治哲學", "外交部門"], policies: ["外交聯盟", "領袖魅力", "商隊旅館", "殖民"], districts: ["外交區：遠離易被掠奪的邊境", "商業中心／港口：外貿與同盟", "政府廣場：謁見廳或祖祠依擴張方式"], wonders: ["阿帕達納宮：能連續蓋奇觀時提供使者", "馬哈菩提寺：宗教成立且能拿外交點時考慮", "奧薩卡類早期奇觀不應拖慢擴張"], queue: ["雙斥候", "移民", "商人", "外交區", "使者任務所需單位"] },
    mid: { objective: "保持至少一個高等級同盟，爭取宗主權並預判世界議會投票偏好。", techs: ["製圖學", "印刷術", "工業化", "電力"], civics: ["外交部門", "探索", "民族主義", "都市化"], policies: ["外交聯盟", "集體行動主義", "商業聯盟", "炮艦外交"], districts: ["外交區：建成領事館與外交辦公室", "商業中心／港口：維持盟友商路", "娛樂中心：參與宜居相關競賽"], wonders: ["布達拉宮：額外外交政策槽", "自由女神像：外交點數核心", "基爾瓦基斯瓦尼：宗主多個同類城邦時優先"], queue: ["外交區建築", "商人", "競賽項目", "使者任務", "少量防衛軍"] },
    late: { objective: "以外交支持換取金幣或協議，計算緊急事件與競賽能取得的外交勝利點。", techs: ["電力", "無線電", "衛星", "電信"], civics: ["意識形態", "核計畫", "全球化", "社群媒體"], policies: ["集體行動主義", "炮艦外交", "音樂審查", "國際太空總署"], districts: ["外交區：保護間諜與使者來源", "工業區：應付臨時競賽項目", "商業中心／港口：持續收購外交支持"], wonders: ["自由女神像：四點可能直接改寫終局", "奧薩卡或布達拉宮：補足外交政策", "阿蒙森站只在科研也有價值時投入"], queue: ["救援項目", "世界博覽會項目", "軍事援助", "間諜反諜報", "商人維持同盟"] },
    end: { objective: "在世界領袖大會前精算票數，必要時投票讓自己失兩點以降低總損失。", techs: ["衛星", "電信", "機器人技術", "未來科技"], civics: ["全球化", "未來市政", "創業政治", "資訊戰爭"], policies: ["集體行動主義", "炮艦外交", "國際太空總署", "電子商務"], districts: ["工業區：全國競賽衝刺", "外交區：保護外交支持庫存", "港口：快速調度救援單位"], wonders: ["已達 16 點以上時預留自由女神像完成時點", "停止無外交點奇觀", "確保競賽城市不被間諜破壞"], queue: ["外交競賽項目", "碳捕集", "救援或軍援", "防禦性間諜", "必要的海空運輸"] }
  },
  score: {
    early: { objective: "搶人口、城市數、時代分數與關鍵地塊，建立不偏科的帝國。", techs: ["製陶術", "文字", "灌溉", "青銅器"], civics: ["對外貿易", "早期帝國", "國家勞動力", "政治哲學"], policies: ["都市規劃", "殖民", "土地測量員", "徵兵"], districts: ["先按地圖最高相鄰選校園或聖地", "商業中心／港口支撐擴張", "政府廣場提高移民效率"], wonders: ["金字塔：全局建造者效率", "神諭所：偉人分數", "不為低回報奇觀犧牲兩座移民"], queue: ["斥候", "移民", "建造者", "紀念碑", "第一座高相鄰區域"] },
    mid: { objective: "保持城市數、人口、科技、市政、偉人、宗教與奇觀的綜合領先。", techs: ["學徒制", "教育", "工業化", "印刷術"], civics: ["封建主義", "探索", "人文主義", "民族主義"], policies: ["理性主義", "美學", "農奴制", "貿易聯盟"], districts: ["補齊各城市第一與第二專精區域", "工業區覆蓋城市群", "娛樂中心保持全國宜居"], wonders: ["基爾瓦基斯瓦尼：城邦綜合加成", "紫禁城：萬用政策槽", "魯爾山谷：最高生產城"], queue: ["大學或博物館", "工廠", "商人", "偉人項目", "邊境移民"] },
    late: { objective: "逐項檢查計分面板，補最容易提升的類別並削弱最高分對手。", techs: ["化學", "飛行", "電力", "火箭技術"], civics: ["啟蒙運動", "都市化", "自然保育", "意識形態"], policies: ["五年計畫", "理性主義", "衛星廣播", "市場經濟"], districts: ["校園與劇院完成最高級建築", "社區只建在能立刻增長的城市", "航空站提供戰略威懾"], wonders: ["選擇高分且能立即改善產出的奇觀", "避免為奇觀損失國土或戰略資源", "保護已建奇觀城市"], queue: ["高級區域建築", "偉人項目", "防衛軍", "間諜削弱領先者", "國家公園"] },
    end: { objective: "確認剩餘回合與分差，以最快完成的科技、市政、人口、偉人或奇觀補分。", techs: ["衛星", "機器人技術", "未來科技", "奈米科技"], civics: ["全球化", "未來市政", "社群媒體", "資訊戰爭"], policies: ["國際太空總署", "集體行動主義", "線上社群", "電子商務"], districts: ["各區域執行專案搶最後偉人", "住房與糧食集中補人口", "軍營與航空站嚇阻突襲"], wonders: ["只建能在結算前完成的奇觀", "大工程師與砍伐集中搶最後分數", "若對手接近其他勝利，優先干擾而非補分"], queue: ["偉人項目", "未來科技／市政", "快速奇觀", "人口成長項目", "防禦與間諜"] }
  }
};

const tagAdvice = {
  production: "把額外生產集中到本階段最關鍵的區域、軍隊或項目，不要平均分散。",
  military: "先用軍事優勢取得安全邊界或高價城市，再把維護費壓回可承受範圍。",
  culture: "劇院與文化改良不是附帶項目，必須提前保留地塊與偉人槽位。",
  science: "用科技領先換取更早的建築或兵種，避免只堆面板而沒有轉化。",
  religion: "信仰既是勝利資源也是購買通貨，保留一筆應急信仰比全部花完更安全。",
  faith: "把高信仰轉成最缺的資產，包含偉人、軍隊、博物學家或英雄。",
  trade: "商路先服務核心節奏，外貿求金幣與同盟，內貿求人口與生產。",
  naval: "海圖先搶製圖學與視野，艦隊必須同時保護商路和登陸點。",
  citystate: "先完成容易的城邦任務，再用關鍵使者卡跨過宗主門檻。",
  appeal: "提早標記國家公園與度假區，不要用礦山或區域破壞不可逆的魅力鏈。",
  growth: "人口只有在住房、宜居和可工作的高產地塊齊全時才值得繼續堆高。",
  gold: "金幣優先支付升級、關鍵建築與緊急購買，不為低回報項目清空國庫。",
  espionage: "間諜先升級再執行高風險任務，終盤至少一名常駐核心城反諜報。",
  wonder: "奇觀先看完成時點和機會成本，沒有砍伐或工程師保障時不要硬搶。",
  district: "先放置區域鎖定成本，城市群相鄰必須在移民落城前規劃。",
  loyalty: "總督、紀念碑、人口與宜居度要在攻城前準備，不要攻下後才處理忠誠。",
  early: "把特色窗口換成城市、建造者或停戰金，而不是為了清圖拖到單位過時。",
  late: "前期以生存和擴張為主，保留資源讓後期特色真正出場。"
};

const routeSpecific = {
  science: { win: "完成地球衛星、登月、火星殖民地與系外行星遠征，並用雷射站加速。", pivot: "若校園相鄰與生產不足，在中期轉統治取得高產城市，或轉文化利用科技解鎖飛行。", fallback: "太空港被間諜或戰爭壓制時，分散至第二太空城並啟用反諜報。" },
  culture: { win: "讓對每個文明的觀光客數超過其國內遊客，靠傑作、改良、國家公園與搖滾樂團完成。", pivot: "若偉人與奇觀競爭失利，改走高魅力國家公園，或以軍事奪取傑作和壟斷資源。", fallback: "對手文化過高時集中商路與搖滾樂團，並用間諜或戰爭削弱最高文化來源。" },
  domination: { win: "控制所有仍在遊戲中的文明原始首都，不必佔領每座城市。", pivot: "若特色兵種窗口結束仍無戰果，停戰整合城市並轉科技或文化，不要無限追加過時軍隊。", fallback: "正面攻城失敗時改用掠奪、空軍、核武或從忠誠較弱方向切入。" },
  religion: { win: "讓自己的宗教成為每個文明過半城市人口的主流宗教。", pivot: "若未能創教，立即把聖地信仰轉文化、軍事或偉人購買，不再投資宗教勝利。", fallback: "神學戰受阻時先轉化空白小城，從多方向建立治療點後再包圍對方使徒。" },
  diplomacy: { win: "透過世界議會、緊急事件、競賽與指定奇觀累積 20 點外交勝利點數。", pivot: "若城邦網路被清除或議會票數不足，保留外交優勢並轉科技或文化。", fallback: "接近 20 點而成為集火目標時，預留自由女神像或競賽完成時點一次跨線。" },
  score: { win: "在回合上限結算時，以城市、人口、科技、市政、偉人、宗教、奇觀和時代分數領先。", pivot: "若任何主動勝利已明顯更快，立刻轉向該勝利；分數勝利不應阻止提前獲勝。", fallback: "阻止領先者的太空、文化、宗教或外交終局，才能讓比賽進入回合結算。" }
};

function makeRoute(leader, routeId, index) {
  const grade = leader.ratings[index];
  const personalized = leader.tags.slice(0, 2).map((tag) => tagAdvice[tag]).filter(Boolean);
  const stages = {};
  for (const stageId of stageOrder) {
    const base = sharedStages[routeId][stageId];
    const weak = grade === "C" || grade === "D";
    stages[stageId] = {
      id: stageId,
      name: stageNames[stageId],
      objective: base.objective,
      strategy: [
        `${leader.name}的本階段核心是：${leader.hook}。`,
        ...(personalized.length ? personalized : ["先完成可穩定複製的城市循環，再投入一次性高風險項目。"]),
        weak ? `此路線評級為 ${grade}，每次投入前都要確認不會破壞領袖原本的強勢經濟。` : `此路線評級為 ${grade}，應把領袖特色直接兌換成${routeNames[routeId]}勝利進度。`
      ],
      techs: base.techs,
      civics: base.civics,
      policies: base.policies,
      districts: base.districts,
      wonders: base.wonders,
      queue: base.queue,
      diplomacy: routeId === "domination"
        ? "宣戰前先交易掉多餘資源並確認盟友關係，攻城後立即修復紀念碑與宜居度。"
        : "保持代表團、開放邊界與有利商路，避免無收益的意識形態敵對拖慢主線。",
      checklist: [
        `完成${base.techs[0]}或已安排其尤里卡`,
        `完成${base.civics[0]}或已安排其鼓舞`,
        `裝備${base.policies[0]}並確認換卡時點`,
        `已按優先序處理：${base.queue.slice(0, 2).join("、")}`,
        `已套用${leader.name}特色：${leader.hook}`
      ]
    };
  }
  return {
    id: routeId, name: routeNames[routeId], grade, recommendation: gradeText[grade],
    overview: `${leader.name}走${routeNames[routeId]}路線時，核心轉化方式是${leader.hook}。`,
    winCondition: routeSpecific[routeId].win,
    pivot: routeSpecific[routeId].pivot,
    fallback: routeSpecific[routeId].fallback,
    stages
  };
}

function enrichLeader(leader) {
  const ratedLeader = { ...leader, ratings: deriveRatings(leader) };
  const routes = {};
  routeOrder.forEach((routeId, index) => { routes[routeId] = makeRoute(ratedLeader, routeId, index); });
  const strengths = leader.tags.map((tag) => tagAdvice[tag]).filter(Boolean).slice(0, 3);
  return {
    ...ratedLeader,
    emblem: leader.en.replace(/\([^)]*\)/g, "").split(/[\s/]+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase(),
    civIcons: leader.civEn.split(" / ").map((name) => civIconMap[name]).filter(Boolean),
    coreLoop: `${leader.hook}，再把所得優勢投入當局最短的勝利路線。`,
    strengths: strengths.length ? strengths : ["特色觸發條件穩定，適合按地圖彈性轉線。"],
    weaknesses: ["若出生地無法支援特色條件，必須優先擴張或調整第一個區域。", "不要同時投資三條以上勝利路線，特色產出仍需集中才能形成終局。"],
    mistakes: ["只看領袖能力文字，卻沒有讓城市布局和生產順序配合觸發條件。", "過度追求特色單位或奇觀，延誤移民、建造者和基礎防衛。"],
    modeMatches: modes.map((mode) => {
      const overlap = leader.tags.filter((tag) => mode.recommendedTags.includes(tag)).length;
      const clash = leader.tags.filter((tag) => mode.avoidTags.includes(tag)).length;
      return { id: mode.id, score: Math.max(1, Math.min(5, 3 + overlap - clash)), note: overlap ? `「${leader.tags.find((tag) => mode.recommendedTags.includes(tag))}」特色能直接利用此模式。` : "沒有直接加成，按一般模式規則穩健處理。" };
    }),
    routes
  };
}

function validate() {
  const errors = [];
  const ids = new Set();
  if (leaders.length !== 74) errors.push(`可選領袖與人格條目應為 74，目前為 ${leaders.length}`);
  for (const leader of leaders) {
    if (ids.has(leader.id)) errors.push(`重複領袖 ID: ${leader.id}`);
    ids.add(leader.id);
    if (!leader.ratings || leader.ratings.length !== 6 || !/^[SABCD]{6}$/.test(leader.ratings)) errors.push(`${leader.id} 的 ratings 必須是六個 S-D 評級`);
    ["name", "en", "civ", "dlc", "ability", "unique", "hook", "tags", "map", "color"].forEach((key) => {
      if (!leader[key] || (Array.isArray(leader[key]) && !leader[key].length)) errors.push(`${leader.id} 缺少 ${key}`);
    });
    const iconNames = (leader.civEn || "").split(" / ").map((name) => civIconMap[name]).filter(Boolean);
    if (!iconNames.length || iconNames.length !== (leader.civEn || "").split(" / ").length) errors.push(`${leader.id} 缺少文明圖標對應`);
    for (const iconName of iconNames) {
      if (!fs.existsSync(path.join(root, "assets", "civ-icons", `${iconName}.webp`))) errors.push(`${leader.id} 缺少文明圖標檔案 ${iconName}.webp`);
    }
  }
  if (modes.length !== 8) errors.push(`模式數量應為 8，目前為 ${modes.length}`);
  const modeIds = new Set(modes.map((mode) => mode.id));
  for (const mode of modes) {
    ["newContent", "rules", "exploits", "risks", "synergies"].forEach((key) => {
      if (!Array.isArray(mode[key]) || !mode[key].length) errors.push(`${mode.id} 缺少 ${key}`);
    });
    for (const synergy of mode.synergies || []) if (!modeIds.has(synergy.mode)) errors.push(`${mode.id} 聯動不存在的模式 ${synergy.mode}`);
  }
  if (!basics.meta || !basics.meta.title) errors.push("新手導覽缺少 meta");
  if (!Array.isArray(basics.terrains) || basics.terrains.length < 20) errors.push("新手導覽地形與地貌資料不足");
  if (!Array.isArray(basics.resources) || basics.resources.length !== 46) errors.push(`新手導覽資源應為 46，目前為 ${(basics.resources || []).length}`);
  if (!Array.isArray(basics.improvements) || basics.improvements.length < 15) errors.push("新手導覽改良設施資料不足");
  if (!Array.isArray(basics.actions) || basics.actions.length < 5) errors.push("新手導覽地貌操作資料不足");
  const basicsIds = new Set();
  const basicsRequiredFields = {
    terrains: ["id", "name", "en", "kind", "tone", "yields", "movement", "appeal", "defense", "resources", "build", "role"],
    resources: ["id", "name", "en", "type", "yield", "placements", "improvement", "unlock", "reveal", "use"],
    improvements: ["id", "name", "en", "era", "unlockType", "unlock", "valid", "effect", "later", "tip"]
  };
  for (const group of ["terrains", "resources", "improvements"]) {
    for (const item of basics[group] || []) {
      if (basicsIds.has(item.id)) errors.push(`新手導覽重複 ID: ${item.id}`);
      basicsIds.add(item.id);
      basicsRequiredFields[group].forEach((key) => {
        if (item[key] === undefined || item[key] === null || item[key] === "" || (Array.isArray(item[key]) && !item[key].length && key !== "resources")) errors.push(`${group}/${item.id || "unknown"} 缺少 ${key}`);
      });
    }
  }
  if (!Array.isArray(governments.governments) || governments.governments.length !== 13) errors.push(`政體應為 13，目前為 ${(governments.governments || []).length}`);
  if (!Array.isArray(governments.policies) || governments.policies.length !== 157) errors.push(`政策卡應為 157，目前為 ${(governments.policies || []).length}`);
  if (!Array.isArray(governments.categories) || governments.categories.length !== 7) errors.push(`政策分類應為 7，目前為 ${(governments.categories || []).length}`);
  const governmentIds = new Set();
  for (const government of governments.governments || []) {
    if (governmentIds.has(government.id)) errors.push(`重複政體 ID: ${government.id}`);
    governmentIds.add(government.id);
    ["id", "name", "en", "unlock", "inherent", "legacy", "slots"].forEach((key) => { if (!government[key]) errors.push(`政體 ${government.id || "unknown"} 缺少 ${key}`); });
  }
  const categoryIds = new Set((governments.categories || []).map((category) => category.id));
  const policyIds = new Set();
  for (const policy of governments.policies || []) {
    if (policyIds.has(policy.id)) errors.push(`重複政策卡 ID: ${policy.id}`);
    policyIds.add(policy.id);
    ["id", "name", "en", "category", "effect", "unlock", "icon"].forEach((key) => { if (!policy[key]) errors.push(`政策卡 ${policy.id || "unknown"} 缺少 ${key}`); });
    if (!categoryIds.has(policy.category)) errors.push(`政策卡 ${policy.id} 的分類不存在：${policy.category}`);
    if (policy.icon && !fs.existsSync(path.join(root, "assets", "game-icons", "policies", policy.icon))) errors.push(`政策卡 ${policy.id} 缺少圖示 ${policy.icon}`);
  }
  if (!Array.isArray(religions.religions) || religions.religions.length !== 12) errors.push(`歷史宗教應為 12，目前為 ${(religions.religions || []).length}`);
  if (!Array.isArray(religions.beliefs) || religions.beliefs.length !== 59) errors.push(`宗教加成應為 59，目前為 ${(religions.beliefs || []).length}`);
  if (!Array.isArray(religions.categories) || religions.categories.length !== 5) errors.push(`宗教加成分類應為 5，目前為 ${(religions.categories || []).length}`);
  const beliefCategoryIds = new Set((religions.categories || []).map((category) => category.id));
  const religionIds = new Set();
  for (const religion of religions.religions || []) {
    if (religionIds.has(religion.id)) errors.push(`重複宗教 ID: ${religion.id}`);
    religionIds.add(religion.id);
    ["id", "name", "en", "icon"].forEach((key) => { if (!religion[key]) errors.push(`宗教 ${religion.id || "unknown"} 缺少 ${key}`); });
    if (religion.icon && !fs.existsSync(path.join(root, "assets", "game-icons", "religions", religion.icon))) errors.push(`宗教 ${religion.id} 缺少圖示 ${religion.icon}`);
  }
  const beliefIds = new Set();
  for (const belief of religions.beliefs || []) {
    if (beliefIds.has(belief.id)) errors.push(`重複宗教加成 ID: ${belief.id}`);
    beliefIds.add(belief.id);
    ["id", "name", "en", "category", "categoryName", "effect", "icon"].forEach((key) => { if (!belief[key]) errors.push(`宗教加成 ${belief.id || "unknown"} 缺少 ${key}`); });
    if (!beliefCategoryIds.has(belief.category)) errors.push(`宗教加成 ${belief.id} 的分類不存在：${belief.category}`);
    if (belief.icon && !fs.existsSync(path.join(root, "assets", "game-icons", "beliefs", belief.icon))) errors.push(`宗教加成 ${belief.id} 缺少圖示 ${belief.icon}`);
  }
  if (!Array.isArray(people.classes) || people.classes.length !== 10) errors.push(`偉人分類應為 10，目前為 ${(people.classes || []).length}`);
  if (!Array.isArray(people.people) || people.people.length !== 212) errors.push(`偉人應為 212，目前為 ${(people.people || []).length}`);
  if (!Array.isArray(people.governors) || people.governors.length !== 8) errors.push(`總督應為 8，目前為 ${(people.governors || []).length}`);
  const greatPersonIds = new Set();
  const greatPersonClassIds = new Set((people.classes || []).map((item) => item.id));
  for (const greatPerson of people.people || []) {
    if (greatPersonIds.has(greatPerson.id)) errors.push(`重複偉人 ID: ${greatPerson.id}`);
    greatPersonIds.add(greatPerson.id);
    ["id", "name", "en", "classId", "className", "era", "icon"].forEach((key) => { if (!greatPerson[key]) errors.push(`偉人 ${greatPerson.id || "unknown"} 缺少 ${key}`); });
    if (!greatPersonClassIds.has(greatPerson.classId)) errors.push(`偉人 ${greatPerson.id} 的分類不存在：${greatPerson.classId}`);
    if (!Array.isArray(greatPerson.abilities) || !greatPerson.abilities.length || greatPerson.abilities.some((ability) => !ability.label || !ability.effect)) errors.push(`偉人 ${greatPerson.id} 缺少完整能力`);
    if (greatPerson.icon && !fs.existsSync(path.join(root, "assets", "game-icons", "people", greatPerson.icon))) errors.push(`偉人 ${greatPerson.id} 缺少圖示 ${greatPerson.icon}`);
  }
  const governorIds = new Set();
  const governorPageIds = new Set();
  const governorPromotionIds = new Set();
  const governorPromotionPageIds = new Set();
  const expectedGovernorLevels = {
    pingala: [0, 1, 1, 2, 3, 3],
    ibrahim: [0, 1, 1, 2, 2, 3],
    amani: [0, 1, 1, 2, 2, 3],
    magnus: [0, 1, 1, 2, 2, 3],
    liang: [0, 1, 1, 2, 2, 3],
    moksha: [0, 1, 1, 2, 3, 3],
    reyna: [0, 1, 1, 2, 3, 3],
    victor: [0, 1, 1, 2, 3, 3]
  };
  for (const governor of people.governors || []) {
    if (governorIds.has(governor.id)) errors.push(`重複總督 ID: ${governor.id}`);
    governorIds.add(governor.id);
    ["id", "pageId", "name", "title", "en", "description", "icon", "advice", "bestFor", "promotions"].forEach((key) => { if (!governor[key] || (Array.isArray(governor[key]) && !governor[key].length)) errors.push(`總督 ${governor.id || "unknown"} 缺少 ${key}`); });
    if (governorPageIds.has(governor.pageId)) errors.push(`重複總督 pageId: ${governor.pageId}`);
    governorPageIds.add(governor.pageId);
    if (!Array.isArray(governor.promotions) || governor.promotions.length !== 6) errors.push(`總督 ${governor.id} 應有 6 項晉升`);
    const actualLevels = (governor.promotions || []).map((promotion) => promotion.level).sort((a, b) => a - b);
    if (expectedGovernorLevels[governor.id] && JSON.stringify(actualLevels) !== JSON.stringify(expectedGovernorLevels[governor.id])) errors.push(`總督 ${governor.id} 晉升層級應為 ${expectedGovernorLevels[governor.id].join("/")}，目前為 ${actualLevels.join("/")}`);
    const localPromotionMap = new Map((governor.promotions || []).map((promotion) => [promotion.id, promotion]));
    for (const promotion of governor.promotions || []) {
      ["id", "pageId", "name", "en", "effect"].forEach((key) => { if (!promotion[key]) errors.push(`總督晉升 ${governor.id}/${promotion.id || "unknown"} 缺少 ${key}`); });
      if (!Number.isInteger(promotion.level) || promotion.level < 0 || promotion.level > 3) errors.push(`總督晉升 ${governor.id}/${promotion.id} 的 level 無效：${promotion.level}`);
      if (!Array.isArray(promotion.requires)) errors.push(`總督晉升 ${governor.id}/${promotion.id} 缺少 requires 陣列`);
      if (promotion.level === 0 && Array.isArray(promotion.requires) && promotion.requires.length) errors.push(`總督任命能力 ${governor.id}/${promotion.id} 不應有前置能力`);
      if (promotion.level > 0 && Array.isArray(promotion.requires) && !promotion.requires.length) errors.push(`總督晉升 ${governor.id}/${promotion.id} 缺少前置能力`);
      for (const requirementId of promotion.requires || []) {
        const requirement = localPromotionMap.get(requirementId);
        if (!requirement) errors.push(`總督晉升 ${governor.id}/${promotion.id} 的前置能力不存在：${requirementId}`);
        else if (requirement.level >= promotion.level) errors.push(`總督晉升 ${governor.id}/${promotion.id} 的前置能力層級無效：${requirementId}`);
      }
      if (governorPromotionIds.has(promotion.id)) errors.push(`重複總督晉升 ID: ${promotion.id}`);
      governorPromotionIds.add(promotion.id);
      if (governorPromotionPageIds.has(promotion.pageId)) errors.push(`重複總督晉升 pageId: ${promotion.pageId}`);
      governorPromotionPageIds.add(promotion.pageId);
    }
    if (governor.icon && !fs.existsSync(path.join(root, "assets", "game-icons", "people", governor.icon))) errors.push(`總督 ${governor.id} 缺少圖像 ${governor.icon}`);
  }
  if (!Array.isArray(infrastructure.districts) || infrastructure.districts.length !== 35) errors.push(`區域應為 35，目前為 ${(infrastructure.districts || []).length}`);
  if (!Array.isArray(infrastructure.buildings) || infrastructure.buildings.length !== 85) errors.push(`建築應為 85，目前為 ${(infrastructure.buildings || []).length}`);
  if (!Array.isArray(infrastructure.projects) || !infrastructure.projects.length) errors.push("城市項目資料不可為空");
  if (infrastructure.meta && infrastructure.meta.projectCount !== (infrastructure.projects || []).length) errors.push(`城市項目 meta 計數應為 ${(infrastructure.projects || []).length}，目前為 ${infrastructure.meta.projectCount}`);
  const infrastructureIds = new Set();
  const districtPageIds = new Set((infrastructure.districts || []).map((district) => district.pageId));
  for (const item of [].concat(infrastructure.districts || [], infrastructure.buildings || [])) {
    if (infrastructureIds.has(item.id)) errors.push(`重複區域／建築 ID: ${item.id}`);
    infrastructureIds.add(item.id);
    ["id", "pageId", "name", "en", "icon", "requirements"].forEach((key) => { if (!item[key] || (Array.isArray(item[key]) && !item[key].length)) errors.push(`區域／建築 ${item.id || "unknown"} 缺少 ${key}`); });
    if (item.icon && !fs.existsSync(path.join(root, "assets", "game-icons", "infrastructure", item.icon))) errors.push(`區域／建築 ${item.id} 缺少圖像 ${item.icon}`);
  }
  for (const district of infrastructure.districts || []) {
    if (!district.description || !district.placement || !district.placement.best || !district.placement.target) errors.push(`區域 ${district.id} 缺少說明或選址攻略`);
  }
  for (const building of infrastructure.buildings || []) {
    if (!building.tip) errors.push(`建築 ${building.id} 缺少新手建造建議`);
    if (building.districtPageId && !districtPageIds.has(building.districtPageId)) errors.push(`建築 ${building.id} 對應不存在的區域 ${building.districtPageId}`);
  }
  const districtIds = new Set((infrastructure.districts || []).map((district) => district.id));
  const projectIds = new Set();
  for (const project of infrastructure.projects || []) {
    if (projectIds.has(project.id)) errors.push(`重複城市項目 ID: ${project.id}`);
    projectIds.add(project.id);
    ["id", "name", "en", "categoryName", "districtId", "description", "requirements", "whileActive", "onComplete", "tip"].forEach((key) => {
      if (!project[key] || (Array.isArray(project[key]) && !project[key].length)) errors.push(`城市項目 ${project.id || "unknown"} 缺少 ${key}`);
    });
    if (project.districtId && !districtIds.has(project.districtId)) errors.push(`城市項目 ${project.id} 對應不存在的區域 ${project.districtId}`);
  }
  if (!handbook.meta || !handbook.meta.version) errors.push("新手決策手冊缺少內容版本");
  if (!Array.isArray(handbook.decisions) || handbook.decisions.length !== 8) errors.push(`局勢診斷應為 8，目前為 ${(handbook.decisions || []).length}`);
  if (!handbook.progression || !Array.isArray(handbook.progression.eras) || handbook.progression.eras.length !== 8) errors.push(`科技市政時代應為 8，目前為 ${((handbook.progression || {}).eras || []).length}`);
  if (!handbook.combat || !Array.isArray(handbook.combat.classes) || handbook.combat.classes.length !== 10) errors.push(`兵種分類應為 10，目前為 ${((handbook.combat || {}).classes || []).length}`);
  if (!Array.isArray(handbook.systems) || handbook.systems.length !== 10) errors.push(`核心機制應為 10，目前為 ${(handbook.systems || []).length}`);
  const handbookIds = new Set();
  for (const decision of handbook.decisions || []) {
    ["id", "title", "question", "summary", "diagnosis", "actions", "avoid", "links"].forEach((key) => { if (!decision[key] || (Array.isArray(decision[key]) && !decision[key].length)) errors.push(`局勢診斷 ${decision.id || "unknown"} 缺少 ${key}`); });
    if (handbookIds.has(`decision:${decision.id}`)) errors.push(`重複局勢診斷 ID: ${decision.id}`);
    handbookIds.add(`decision:${decision.id}`);
  }
  for (const era of (handbook.progression && handbook.progression.eras) || []) {
    ["id", "name", "techFocus", "civicFocus", "boosts", "pivot"].forEach((key) => { if (!era[key] || (Array.isArray(era[key]) && !era[key].length)) errors.push(`科技市政時代 ${era.id || "unknown"} 缺少 ${key}`); });
  }
  for (const unitClass of (handbook.combat && handbook.combat.classes) || []) {
    ["id", "name", "en", "role", "position", "counter", "upgrade"].forEach((key) => { if (!unitClass[key]) errors.push(`兵種 ${unitClass.id || "unknown"} 缺少 ${key}`); });
  }
  for (const system of handbook.systems || []) {
    ["id", "name", "en", "summary", "watch", "actions", "links"].forEach((key) => { if (!system[key] || (Array.isArray(system[key]) && !system[key].length)) errors.push(`核心機制 ${system.id || "unknown"} 缺少 ${key}`); });
  }
  if (errors.length) {
    console.error(errors.join("\n"));
    process.exit(1);
  }
}

validate();
const enrichedLeaders = leaders.map(enrichLeader);
for (const leader of enrichedLeaders) {
  if (Object.keys(leader.routes).length !== 6) throw new Error(`${leader.id} 路線不完整`);
  for (const route of Object.values(leader.routes)) {
    if (Object.keys(route.stages).length !== 4) throw new Error(`${leader.id}/${route.id} 階段不完整`);
    for (const stage of Object.values(route.stages)) {
      ["strategy", "techs", "civics", "policies", "districts", "wonders", "queue", "checklist"].forEach((key) => {
        if (!Array.isArray(stage[key]) || !stage[key].length) throw new Error(`${leader.id}/${route.id}/${stage.id} 缺少 ${key}`);
      });
    }
  }
}

function compactSearchText(...values) {
  const parts = [];
  const seen = new Set();
  function visit(value) {
    if (value == null) return;
    if (Array.isArray(value)) return value.forEach(visit);
    if (typeof value === "object") return Object.values(value).forEach(visit);
    if (typeof value !== "string" && typeof value !== "number") return;
    const text = String(value).toLowerCase().trim();
    if (!text || seen.has(text)) return;
    seen.add(text);
    parts.push(text);
  }
  values.forEach(visit);
  return parts.join(" ");
}

function leaderSearchText(leader) {
  const routes = routeOrder.map((routeId) => {
    const route = leader.routes[routeId];
    return [
      route.name, route.victoryCondition, route.recommendation, route.pivot, route.fallback,
      stageOrder.map((stageId) => {
        const stage = route.stages[stageId];
        return [stage.techs, stage.civics, stage.policies, stage.districts, stage.wonders];
      })
    ];
  });
  return compactSearchText(
    leader.id, leader.name, leader.en, leader.civ, leader.civEn, leader.dlc,
    leader.hook, leader.abilities, leader.specials, leader.tags, leader.map,
    leader.strengths, leader.weaknesses, leader.mistakes, leader.modeMatches, routes
  );
}

const searchIndex = [];
for (const leader of enrichedLeaders) {
  searchIndex.push({ type: "leader", id: leader.id, title: leader.name, subtitle: `${leader.civ}｜${leader.en}`, route: `#/guide/leader/${leader.id}/science`, text: leaderSearchText(leader) });
}
for (const mode of modes) {
  searchIndex.push({ type: "mode", id: mode.id, title: mode.name, subtitle: mode.en, route: `#/wiki/mode/${mode.id}`, text: compactSearchText(mode) });
}
for (const terrain of basics.terrains) {
  searchIndex.push({ type: "terrain", id: terrain.id, title: terrain.name, subtitle: `${terrain.en}｜地形與地貌`, route: `#/wiki/terrain?focus=basic-${terrain.id}`, text: compactSearchText(terrain) });
}
for (const resource of basics.resources) {
  searchIndex.push({ type: "resource", id: resource.id, title: resource.name, subtitle: `${resource.en}｜${resource.improvement}`, route: `#/wiki/resources?focus=basic-${resource.id}`, text: compactSearchText(resource) });
}
for (const improvement of basics.improvements) {
  searchIndex.push({ type: "improvement", id: improvement.id, title: improvement.name, subtitle: `${improvement.en}｜${improvement.unlock}`, route: `#/wiki/terrain?focus=basic-${improvement.id}`, text: compactSearchText(improvement) });
}
for (const government of governments.governments) {
  searchIndex.push({ type: "government", id: government.id, title: government.name, subtitle: `${government.en}｜${government.unlock}`, route: `#/wiki/governments?focus=government-${government.id}`, text: compactSearchText(government) });
}
for (const policy of governments.policies) {
  searchIndex.push({ type: "policy", id: policy.id, title: policy.name, subtitle: `${policy.categoryName}｜${policy.unlock}`, route: `#/wiki/governments?focus=policy-${policy.id}`, text: compactSearchText(policy) });
}
for (const religion of religions.religions) {
  searchIndex.push({ type: "religion", id: religion.id, title: religion.name, subtitle: `${religion.en}｜歷史宗教`, route: `#/wiki/religions?focus=religion-${religion.id}`, text: compactSearchText(religion) });
}
for (const belief of religions.beliefs) {
  searchIndex.push({ type: "belief", id: belief.id, title: belief.name, subtitle: `${belief.categoryName}｜${belief.en}`, route: `#/wiki/religions?focus=belief-${belief.id}`, text: compactSearchText(belief) });
}
for (const greatPerson of people.people) {
  searchIndex.push({ type: "great-person", id: greatPerson.id, title: greatPerson.name, subtitle: `${greatPerson.className}｜${greatPerson.era}｜${greatPerson.en}`, route: `#/wiki/great-people?focus=great-person-${greatPerson.id}`, text: compactSearchText(greatPerson) });
}
for (const governor of people.governors) {
  searchIndex.push({ type: "governor", id: governor.id, title: governor.name, subtitle: `${governor.title}｜${governor.en}`, route: `#/wiki/governors?focus=governor-${governor.id}`, text: compactSearchText(governor) });
  for (const promotion of governor.promotions) searchIndex.push({ type: "governor-promotion", id: `${governor.id}-${promotion.id}`, title: promotion.name, subtitle: `${governor.name}｜第 ${promotion.level} 級晉升｜${promotion.en}`, route: `#/wiki/governors?focus=promotion-${governor.id}-${promotion.id}`, text: compactSearchText(governor.name, governor.en, promotion) });
}
for (const district of infrastructure.districts) {
  searchIndex.push({ type: "district", id: district.id, title: district.name, subtitle: `${district.en}｜區域與選址`, route: `#/wiki/infrastructure?focus=infrastructure-${district.id}`, text: compactSearchText(district) });
}
for (const building of infrastructure.buildings) {
  searchIndex.push({ type: "building", id: building.id, title: building.name, subtitle: `${building.en}｜${building.districtName}`, route: `#/wiki/infrastructure?focus=infrastructure-${building.id}`, text: compactSearchText(building) });
}
for (const project of infrastructure.projects) {
  searchIndex.push({ type: "project", id: project.id, title: project.name, subtitle: `${project.en}｜${project.categoryName}`, route: `#/wiki/infrastructure?focus=infrastructure-project-${project.id}`, text: compactSearchText(project) });
}
for (const decision of handbook.decisions) {
  searchIndex.push({ type: "guide", id: decision.id, title: decision.title, subtitle: `新手決策｜${decision.question}`, route: `#/guide/decisions?focus=decision-${decision.id}`, text: compactSearchText(decision) });
}
for (const topic of handbook.systems) {
  searchIndex.push({ type: "system", id: topic.id, title: topic.name, subtitle: `核心機制｜${topic.en}`, route: `#/wiki/systems?focus=system-${topic.id}`, text: compactSearchText(topic) });
}
for (const unitClass of handbook.combat.classes) {
  searchIndex.push({ type: "guide", id: unitClass.id, title: unitClass.name, subtitle: `兵種與戰鬥｜${unitClass.en}`, route: `#/guide/combat?focus=combat-${unitClass.id}`, text: compactSearchText(unitClass) });
}
for (const era of handbook.progression.eras) {
  searchIndex.push({ type: "guide", id: era.id, title: era.name, subtitle: "科技與市政路線", route: `#/guide/progression?focus=era-${era.id}`, text: compactSearchText(era) });
}

const output = {
  meta: { version: 1, leaderCount: enrichedLeaders.length, modeCount: modes.length, terrainCount: basics.terrains.length, resourceCount: basics.resources.length, improvementCount: basics.improvements.length, governmentCount: governments.governments.length, policyCount: governments.policies.length, religionCount: religions.religions.length, beliefCount: religions.beliefs.length, greatPersonCount: people.people.length, greatPersonClassCount: people.classes.length, governorCount: people.governors.length, governorPromotionCount: people.governors.reduce((sum, governor) => sum + governor.promotions.length, 0), districtCount: infrastructure.districts.length, buildingCount: infrastructure.buildings.length, projectCount: infrastructure.projects.length, ruleset: "Gathering Storm", baseline: "單人、皇帝至不朽、標準速度、標準地圖" },
  routeOrder, routeNames, stageOrder, stageNames,
  leaders: enrichedLeaders,
  modes,
  basics,
  governments,
  religions,
  people,
  infrastructure,
  handbook,
  searchIndex
};

fs.mkdirSync(path.join(root, "assets"), { recursive: true });
fs.writeFileSync(path.join(root, "assets/data.bundle.js"), `window.CIV6_DATA=${JSON.stringify(output)};\n`, "utf8");
console.log(`資料驗證通過：${leaders.length} 位領袖 × 6 路線 × 4 階段，${modes.length} 種模式，${basics.resources.length} 種資源，${infrastructure.districts.length} 個區域、${infrastructure.buildings.length} 棟建築、${infrastructure.projects.length} 種城市項目、${governments.governments.length} 種政體、${governments.policies.length} 張政策卡、${religions.religions.length} 種歷史宗教、${religions.beliefs.length} 種信條、${people.people.length} 位偉人與 ${people.governors.length} 位總督。`);
