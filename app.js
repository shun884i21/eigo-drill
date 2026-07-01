// ===== えいごドリル：アプリ本体 =====

// ---------- セーブデータ ----------
const SAVE_KEY = "eigo-drill-v1";
const defaultState = {
  ver: 4,            // セーブ形式バージョン（移行判定用）
  exp: 0,            // 累計の経験値（内部用）
  coins: 0,
  level: 1,
  streak: 0,
  lastPlay: null,    // "YYYY-MM-DD"
  km: 0,             // 旅で進んだ距離
  visited: {},       // "三重" -> true （到着した県）
  reached: 0,        // これまで到達した spots のインデックス
  goods: {},         // "三重#0" -> true （買ったご当地名物）
  correctWords: {},  // "u1:I" -> true （一度でも正解した単語）
  correctSents: {},  // "u1:0" -> true
  srs: {},           // 忘却曲線の復習カード "word:u1:I" -> { box, due }
};
let S = load();

function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const s = Object.assign({}, defaultState, parsed);
      // 旅システムへ移行：距離は0からスタート、コインはそのまま引き継ぐ
      if (!parsed.ver || parsed.ver < 3) {
        s.km = 0;
        s.reached = 0;
        s.visited = { "三重": true };   // 出発の地は最初から到着ずみ
        delete s.maxStage; delete s.acc; delete s.owned;  // 旧ペット/ショップの名残を掃除
      }
      // SRS（忘却曲線）へ移行：旧 wrongPool を復習カードに変換（box0＝今日復習）
      if (!parsed.ver || parsed.ver < 4) {
        const srs = Object.assign({}, parsed.srs || {});
        (parsed.wrongPool || []).forEach((w) => { srs["" + w.type + ":" + w.uid + ":" + w.key] = { box: 0, due: 0 }; });
        s.srs = srs;
        delete s.wrongPool;
        s.ver = 4;
        localStorage.setItem(SAVE_KEY, JSON.stringify(s)); // 一度だけ移行を保存
      }
      if (!s.visited || !s.visited["三重"]) { s.visited = Object.assign({ "三重": true }, s.visited || {}); }
      s.goods = Object.assign({}, parsed.goods || {});  // 既定の共有参照を避ける
      s.srs = Object.assign({}, s.srs || {});
      return s;
    }
  } catch (e) {}
  const fresh = JSON.parse(JSON.stringify(defaultState));
  fresh.visited = { "三重": true };
  return fresh;
}
function save() { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); }

// ---------- 日本一周の旅：計算ヘルパー ----------
// 沖縄インセット枠（本土マップ座標での位置・大きさ）。九州の南の空きスペースに置く。
const OKI_BOX = { x: 1.5, y: 80, w: 17, h: 21, pad: 1.6 };
function okiTransform() {
  const ov = ((typeof OKINAWA_VIEWBOX !== "undefined") ? OKINAWA_VIEWBOX : "0 0 30 42").split(" ");
  const ow = +ov[2], oh = +ov[3];
  const iw = OKI_BOX.w - OKI_BOX.pad * 2, ih = OKI_BOX.h - OKI_BOX.pad * 2;
  const sc = Math.min(iw / ow, ih / oh);
  return { sc, offX: OKI_BOX.x + OKI_BOX.pad + (iw - ow * sc) / 2, offY: OKI_BOX.y + OKI_BOX.pad + (ih - oh * sc) / 2 };
}
function okiToMain(ox, oy) { const t = okiTransform(); return [+(t.offX + ox * t.sc).toFixed(2), +(t.offY + oy * t.sc).toFixed(2)]; }

// spots に累積距離 km を付与（先頭=0、以降は segKm ずつ）。
// 地図座標(x,y)は japan-map.js（本物の日本地図＝県庁所在地）を使う。沖縄はインセット枠内に配置。
const SPOTS = JOURNEY.spots.map((s, i) => {
  let xy;
  if (s.pref === "沖縄" && typeof OKINAWA_NAHA !== "undefined") xy = okiToMain(OKINAWA_NAHA[0], OKINAWA_NAHA[1]);
  else xy = (typeof PREF_XY !== "undefined" && PREF_XY[s.pref]) || [s.x, s.y];
  return Object.assign({}, s, { x: xy[0], y: xy[1], km: i * JOURNEY.segKm });
});
const GOAL_KM = SPOTS.length * JOURNEY.segKm;        // 沖縄のあと、三重(亀山)に帰ってくる距離
function reachedIndexFor(km) {
  let idx = 0;
  for (let i = 0; i < SPOTS.length; i++) if (km >= SPOTS[i].km) idx = i;
  return idx;
}
function nextSpot() {
  const idx = reachedIndexFor(S.km);
  return idx + 1 < SPOTS.length ? SPOTS[idx + 1] : null;  // null ならゴールへ向かっている
}
// 旅の達成率（0〜100）
function journeyPct() { return Math.max(0, Math.min(100, Math.round((S.km / GOAL_KM) * 100))); }

// ご当地名物：全データに id（県名#番号）を付けて1つのリストに、県名→名物の辞書も作る
const GOODS = [];
const GOODS_BY_PREF = {};
SPOTS.forEach((sp) => {
  const list = (typeof PREF_GOODS !== "undefined" && PREF_GOODS[sp.pref]) || [];
  GOODS_BY_PREF[sp.pref] = list.map((g, i) => {
    const item = Object.assign({ id: sp.pref + "#" + i, pref: sp.pref }, g);
    GOODS.push(item);
    return item;
  });
});
function goodsOwnedCount() { return GOODS.filter((g) => S.goods[g.id]).length; }

// ---------- 共通UI ----------
const $ = (id) => document.getElementById(id);
const views = ["home", "quiz", "arrange", "zukan"];
function show(v) {
  views.forEach((x) => $("view-" + x).classList.toggle("hidden", x !== v));
  views.forEach((x) =>
    $("nav-" + x) && $("nav-" + x).classList.toggle("active", x === v)
  );
  if (v === "home") renderHome();
  if (v === "zukan") renderZukan();
}

function refreshTop() {
  $("streakN").textContent = S.streak;
  $("coinN").textContent = S.coins;
  $("kmN").textContent = Math.round(S.km);
}

// ---------- 音声よみあげ ----------
function speak(text) {
  if (!("speechSynthesis" in window)) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.85;
    speechSynthesis.speak(u);
  } catch (e) {}
}

// ---------- こうかおん ----------
let audioCtx = null;
function beep(ok) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const notes = ok ? [523, 659, 784] : [330, 247];
    notes.forEach((f, i) => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = "sine"; o.frequency.value = f;
      o.connect(g); g.connect(audioCtx.destination);
      const t = audioCtx.currentTime + i * 0.09;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      o.start(t); o.stop(t + 0.2);
    });
  } catch (e) {}
}

// ---------- ごほうび演出 ----------
const PRAISES = ["正解！✨", "いいね！", "やるね～！", "天才！", "ナイス！", "その調子！"];
function praise() {
  const el = $("praiseText");
  el.textContent = PRAISES[Math.floor(Math.random() * PRAISES.length)];
  el.classList.remove("show"); void el.offsetWidth; el.classList.add("show");
  confetti();
}
function confetti() {
  const emojis = ["🎉", "⭐", "💖", "✨", "🌟"];
  for (let i = 0; i < 14; i++) {
    const c = document.createElement("div");
    c.className = "confetti";
    c.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    c.style.left = Math.random() * 100 + "vw";
    c.style.fontSize = 16 + Math.random() * 18 + "px";
    document.body.appendChild(c);
    const dur = 900 + Math.random() * 700;
    c.animate(
      [{ transform: "translateY(0) rotate(0)", opacity: 1 },
       { transform: `translateY(100vh) rotate(${Math.random() * 720 - 360}deg)`, opacity: 0 }],
      { duration: dur, easing: "ease-in" }
    ).onfinish = () => c.remove();
  }
}

// ---------- ほうび付与 ----------
// 正解すると 経験値・コイン・距離(km) がもらえる。距離が進むと県に到着することがある。
function reward(exp, coins, km) {
  S.exp += exp;
  S.coins += coins;
  S.km += (km || 0);
  S.level = S.exp; // 互換のため保持（表示はしない）
  save(); refreshTop();
  checkArrival();
}

// 距離が伸びて新しい県に着いたら、紹介カードを出す
function checkArrival() {
  const nowIdx = reachedIndexFor(S.km);
  if (nowIdx > (S.reached || 0)) {
    // 一気に複数県を通過したら、いちばん先の県を到着として表示
    for (let i = (S.reached || 0) + 1; i <= nowIdx; i++) {
      S.visited[SPOTS[i].pref] = true;
    }
    S.reached = nowIdx;
    S.coins += JOURNEY.arriveCoin;
    save(); refreshTop();
    setTimeout(() => showArrival(SPOTS[nowIdx]), 500);
  } else if (S.km >= GOAL_KM && !S.lapDone) {
    S.lapDone = true; save();
    setTimeout(showGoal, 500);
  }
}

// 到着ポップアップ
function showArrival(spot) {
  praise();
  $("arvEmoji").textContent = spot.emoji;
  $("arvTitle").textContent = `${spot.full} にとうちゃく！`;
  $("arvIntro").textContent = spot.intro;
  $("arvCoin").textContent = `🪙 +${JOURNEY.arriveCoin} コインをもらった！`;
  // 道の駅で復習（復習する問題があるときだけ）
  const rest = $("arvRest");
  const restN = dueEntries().length || weakEntries().length;
  if (restN > 0) {
    rest.classList.remove("hidden");
    rest.textContent = `🚏 道の駅でひとやすみ（復習 ${restN}）`;
  } else {
    rest.classList.add("hidden");
  }
  $("arrivalModal").classList.remove("hidden");
}
function closeArrival() { $("arrivalModal").classList.add("hidden"); renderHome(); }
function restFromArrival() { $("arrivalModal").classList.add("hidden"); startReview(); }

// 日本一周ゴール！
function showGoal() {
  praise(); confetti(); confetti();
  $("arvEmoji").textContent = "🎌";
  $("arvTitle").textContent = "日本一周たっせい！🎉";
  $("arvIntro").textContent = "ぐるっと47都道府県をまわって、亀山に帰ってきたよ。よくがんばったね！";
  $("arvCoin").textContent = "";
  $("arvRest").classList.add("hidden");
  $("arrivalModal").classList.remove("hidden");
}

// ---------- ストリーク ----------
function todayStr() {
  const d = new Date();
  return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
}
function updateStreak() {
  const t = todayStr();
  if (S.lastPlay === t) return;
  const y = new Date(); y.setDate(y.getDate() - 1);
  const yStr = y.getFullYear() + "-" + (y.getMonth() + 1) + "-" + y.getDate();
  S.streak = (S.lastPlay === yStr) ? S.streak + 1 : 1;
  S.lastPlay = t;
  save();
}

// 地図のviewBox（japan-map.js があれば本物の日本地図のものを使う）
const MAP_VIEWBOX = (typeof JAPAN_VIEWBOX !== "undefined") ? JAPAN_VIEWBOX : "0 0 86 100";
// 海＋陸地（本物の日本地図のSVGパス）。出典：地球地図日本(国土地理院)。沖縄はインセット枠で表示。
function japanLand() {
  const dims = MAP_VIEWBOX.split(" ");
  const vw = dims[2], vh = dims[3];
  const land = (typeof JAPAN_PATH !== "undefined")
    ? `<path d="${JAPAN_PATH}" fill="#d9efc8" stroke="#bfe0a6" stroke-width="0.35" stroke-linejoin="round"/>`
    : "";
  let inset = "";
  if (typeof OKINAWA_PATH !== "undefined") {
    const t = okiTransform();
    const b = OKI_BOX;
    inset = `
      <rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="2" fill="#eaf4fb" stroke="#9fb8cf" stroke-width="0.5" stroke-dasharray="1.5 1"/>
      <clipPath id="okiClip"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="2"/></clipPath>
      <g clip-path="url(#okiClip)"><path transform="translate(${t.offX} ${t.offY}) scale(${t.sc})" d="${OKINAWA_PATH}" fill="#d9efc8" stroke="#bfe0a6" stroke-width="${(0.35 / t.sc).toFixed(2)}" stroke-linejoin="round"/></g>
      <text x="${b.x + b.w - 1}" y="${b.y + b.h - 1.5}" font-size="2.8" text-anchor="end" fill="#7a8a98">沖縄</text>`;
  }
  return `<rect x="0" y="0" width="${vw}" height="${vh}" rx="6" fill="#eaf4fb"/>${land}${inset}`;
}

// ---------- 自転車に乗る人の顔写真（※端末内だけに保存。GitHub等には一切アップしない） ----------
const FACE_KEY = "eigo-drill-face";
function getFace() { try { return localStorage.getItem(FACE_KEY) || ""; } catch (e) { return ""; } }
// ファイルを選んだら、正方形に切り抜き＆小さく縮小して localStorage に保存
function pickFace(input) {
  const f = input.files && input.files[0];
  if (!f) return;
  const img = new Image();
  const url = URL.createObjectURL(f);
  img.onload = function () {
    const SZ = 140, c = document.createElement("canvas");
    c.width = SZ; c.height = SZ;
    const ctx = c.getContext("2d");
    const m = Math.min(img.width, img.height);       // 中央を正方形にトリミング
    ctx.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, SZ, SZ);
    URL.revokeObjectURL(url);
    try { localStorage.setItem(FACE_KEY, c.toDataURL("image/jpeg", 0.82)); }
    catch (e) { alert("写真の保存に失敗したよ。もう少し小さい写真でためしてね。"); return; }
    input.value = "";
    renderHome();
  };
  img.onerror = function () { URL.revokeObjectURL(url); alert("写真をよみこめなかったよ。"); };
  img.src = url;
}
function clearFace() { try { localStorage.removeItem(FACE_KEY); } catch (e) {} renderHome(); }

// ---------- 名前（※端末内だけに保存。友達も自分の名前にできる） ----------
const NAME_KEY = "eigo-drill-name";
const DEFAULT_NAME = "れいな";
function getName() { try { return localStorage.getItem(NAME_KEY) || DEFAULT_NAME; } catch (e) { return DEFAULT_NAME; } }
function escHtml(s) { return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function changeName() {
  const n = prompt("なまえを入れてね（10文字まで）", getName());
  if (n === null) return;                 // キャンセル
  const t = n.trim().slice(0, 10);
  try {
    if (t) localStorage.setItem(NAME_KEY, t);
    else localStorage.removeItem(NAME_KEY); // 空なら初期の名前にもどる
  } catch (e) {}
  renderHome();
}

// ---------- 地図SVGを組み立てる ----------
function buildMapSVG() {
  const reached = reachedIndexFor(S.km);
  // ルート線（旅の順番でつなぐ）
  const linePts = SPOTS.map((s) => `${s.x},${s.y}`).join(" ");
  // 進んだぶんの線（到着ずみ区間 ＋ 現在地まで）
  let bx = SPOTS[0].x, by = SPOTS[0].y;
  const next = reached + 1 < SPOTS.length ? SPOTS[reached + 1] : null;
  if (next) {
    const span = next.km - SPOTS[reached].km;
    const t = span > 0 ? Math.max(0, Math.min(1, (S.km - SPOTS[reached].km) / span)) : 0;
    bx = SPOTS[reached].x + (next.x - SPOTS[reached].x) * t;
    by = SPOTS[reached].y + (next.y - SPOTS[reached].y) * t;
  } else { bx = SPOTS[SPOTS.length - 1].x; by = SPOTS[SPOTS.length - 1].y; }
  const donePts = SPOTS.slice(0, reached + 1).map((s) => `${s.x},${s.y}`).join(" ") + ` ${bx},${by}`;
  // 県の点
  const dots = SPOTS.map((s) => {
    const done = S.visited[s.pref];
    return `<circle cx="${s.x}" cy="${s.y}" r="${done ? 1.5 : 1.1}" fill="${done ? "#ff5f9e" : "#ffd6e7"}" stroke="#fff" stroke-width="0.35"/>`;
  }).join("");
  // 自転車に乗る人：顔写真があれば丸く切り抜いて表示、なければ自転車の絵文字
  const face = getFace();
  const rider = face
    ? `<clipPath id="faceClip"><circle cx="${bx}" cy="${by - 6}" r="6"/></clipPath>
       <circle cx="${bx}" cy="${by - 6}" r="6.8" fill="#fff" stroke="#ff5f9e" stroke-width="0.9"/>
       <image href="${face}" x="${bx - 6}" y="${by - 12}" width="12" height="12" clip-path="url(#faceClip)" preserveAspectRatio="xMidYMid slice"/>
       <text x="${bx}" y="${by + 4.5}" font-size="4" text-anchor="middle">🚲</text>`
    : `<text x="${bx}" y="${by + 1.6}" font-size="4.6" text-anchor="middle">🚲</text>`;
  return `<svg viewBox="${MAP_VIEWBOX}" class="jp-map" xmlns="http://www.w3.org/2000/svg">
    ${japanLand()}
    <polyline points="${linePts}" fill="none" stroke="#ff8fb8" stroke-width="0.7" stroke-linejoin="round" stroke-dasharray="1.6 1.4" opacity="0.75"/>
    <polyline points="${donePts}" fill="none" stroke="#ff5f9e" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round"/>
    ${dots}
    ${rider}
  </svg>`;
}

// ---------- ホーム描画 ----------
function renderHome() {
  refreshTop();
  const reached = reachedIndexFor(S.km);
  const cur = SPOTS[reached];
  const next = nextSpot();
  $("mapBox").innerHTML = buildMapSVG();
  $("curSpot").textContent = `${cur.emoji} 今いるところ：${cur.full}（${cur.city}）`;
  if (next) {
    const remain = Math.max(0, Math.ceil(next.km - S.km));
    $("nextSpot").textContent = `つぎは ${next.full} まで あと ${remain}km`;
  } else if (S.km < GOAL_KM) {
    const remain = Math.max(0, Math.ceil(GOAL_KM - S.km));
    $("nextSpot").textContent = `ゴールの亀山まで あと ${remain}km！`;
  } else {
    $("nextSpot").textContent = "日本一周たっせい！🎌";
  }
  const visitedCount = Object.keys(S.visited).length;
  const allDone = visitedCount >= SPOTS.length;
  if ($("conquerBadge")) {
    $("conquerBadge").textContent = allDone ? `🎌 ${visitedCount}県 全制覇！` : `🏅 ${visitedCount}県 制覇！`;
    $("conquerBadge").classList.toggle("all", allDone);
  }
  $("journeyBar").style.width = journeyPct() + "%";
  $("journeyLabel").textContent = `${visitedCount} / ${SPOTS.length} 県　（${Math.round(S.km)}km / ${GOAL_KM}km）`;

  // 名前（アプリタイトル・見出しに反映。端末ごとに自分の名前にできる）
  const nm = getName();
  if ($("appName")) $("appName").innerHTML = `${escHtml(nm)}の<br>英語ドリル`;
  document.title = `${nm}の英語ドリル`;

  // 顔写真ボタン（写真があれば「かえる／けす」）
  if ($("faceBtnLabel")) $("faceBtnLabel").textContent = getFace() ? "顔写真をかえる" : "顔写真をえらぶ";
  if ($("faceClearBtn")) $("faceClearBtn").classList.toggle("hidden", !getFace());

  // 復習ボタン（きょうの復習＝期限ぶん／にがて練習＝まだ覚えきれていない全部）
  const dueN = dueEntries().length, weakN = weakEntries().length;
  $("reviewBtn").disabled = dueN === 0;
  $("reviewBtn").textContent = dueN ? `🔁 きょうの復習（${dueN}）` : "🔁 きょうの復習（なし）";
  $("weakBtn").disabled = weakN === 0;
  $("weakBtn").textContent = weakN ? `💪 にがて練習（${weakN}）` : "💪 にがて練習（なし）";

  // 単元たっせいど
  const box = $("unitProgress"); box.innerHTML = "";
  UNITS.forEach((u) => {
    const totalW = u.words.length, totalS = u.sentences.length;
    let okW = 0, okS = 0;
    u.words.forEach((w) => { if (S.correctWords[u.id + ":" + w.en]) okW++; });
    u.sentences.forEach((_, i) => { if (S.correctSents[u.id + ":" + i]) okS++; });
    const pct = Math.round(((okW + okS) / (totalW + totalS)) * 100);
    const row = document.createElement("div");
    row.innerHTML = `<div class="muted" style="margin-top:6px;">${u.title}</div>
      <div class="unit-row"><div class="bar"><i style="width:${pct}%"></i></div>
      <span class="unit-pct">${pct}%</span></div>`;
    box.appendChild(row);
  });
}

// ---------- ずかん描画（到着した県カード ＋ ご当地名物の購入/コレクション ＋ 検索） ----------
function renderZukan(filter) {
  refreshTop();
  const q = (filter != null ? filter : ($("zukanSearch") ? $("zukanSearch").value : "")).trim();
  const visitedCount = Object.keys(S.visited).length;
  $("zukanCount").textContent = `${visitedCount}/${SPOTS.length}県　🍡${goodsOwnedCount()}/${GOODS.length}`;
  if ($("zukanCoin")) $("zukanCoin").textContent = S.coins;
  const list = $("zukanList"); list.innerHTML = "";
  let shown = 0;
  SPOTS.forEach((s) => {
    const done = S.visited[s.pref];
    const goods = GOODS_BY_PREF[s.pref] || [];
    // 検索：県名・市名・紹介文・名物名/説明文 のどれかに一致
    const goodsHit = done && goods.some((g) => g.name.includes(q) || g.desc.includes(q));
    if (q && !(s.full.includes(q) || s.city.includes(q) || (done && s.intro.includes(q)) || goodsHit)) return;
    shown++;

    const card = document.createElement("div");
    card.className = "zukan-pref" + (done ? "" : " locked");
    if (!done) {
      card.innerHTML = `<div class="zukan-head"><span class="zukan-emoji">❓</span>
        <div class="zukan-info"><b>？？？</b><span class="muted">まだ行っていないよ</span></div></div>`;
      list.appendChild(card);
      return;
    }
    // 到着ずみ：紹介＋名物
    let goodsHtml = goods.map((g) => {
      const owned = S.goods[g.id];
      let btn;
      if (owned) {
        btn = `<span class="good-owned">✓ ゲット</span>`;
      } else if (S.coins < g.price) {
        btn = `<button class="btn small" disabled>🪙${g.price}</button>`;
      } else {
        btn = `<button class="btn small violet" onclick="buyGood('${g.id}')">🪙${g.price} で買う</button>`;
      }
      return `<div class="good-item${owned ? " got" : ""}">
        <span class="good-emoji">${g.emoji}</span>
        <div class="good-info"><b>${g.name}</b><span class="muted">${owned ? g.desc : "ご当地名物"}</span></div>
        ${btn}</div>`;
    }).join("");

    card.innerHTML = `<div class="zukan-head"><span class="zukan-emoji">${s.emoji}</span>
        <div class="zukan-info"><b>${s.full}</b><span class="muted">${s.intro}</span></div></div>
      <div class="goods-list">${goodsHtml}</div>`;
    list.appendChild(card);
  });
  if (shown === 0) {
    list.innerHTML = `<p class="muted center">見つからなかったよ</p>`;
  }
}

// ご当地名物を買う（到着ずみ＆コインたりてる＆まだ持っていない とき）
function buyGood(id) {
  const g = GOODS.find((x) => x.id === id);
  if (!g || !S.visited[g.pref] || S.goods[id] || S.coins < g.price) return;
  S.coins -= g.price;
  S.goods[id] = true;
  save(); refreshTop();
  beep(true); praise();
  renderZukan();
}

// ======================================================
//  たんご４たくクイズ
// ======================================================
let quizList = [], quizI = 0, quizCur = null, quizAnswered = false;

function allWords() {
  const arr = [];
  UNITS.forEach((u) => u.words.forEach((w) => arr.push(Object.assign({ uid: u.id }, w))));
  return arr;
}
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

function startQuiz() {
  updateStreak();
  quizList = shuffle(allWords()).slice(0, 8);
  quizI = 0;
  show("quiz");
  renderQuiz();
}
function renderQuiz() {
  quizAnswered = false;
  quizCur = quizList[quizI];
  $("quizCount").textContent = `${quizI + 1} / ${quizList.length}`;
  $("quizFb").textContent = ""; $("quizFb").className = "feedback";
  $("quizAns").classList.add("hidden");
  $("quizNext").classList.add("hidden");
  // 出題方向：半分は 日→英、半分は 英→日
  const jaToEn = Math.random() < 0.6;
  quizCur._jaToEn = jaToEn;
  $("quizPrompt").textContent = jaToEn ? "この意味の英単語は？" : "この英単語の意味は？";
  $("quizWord").textContent = jaToEn ? quizCur.ja : quizCur.en;
  $("quizSpeak").style.display = jaToEn ? "none" : "inline";

  // 選択肢：表示テキスト（日→英なら英、英→日なら日）が重複しないように集める
  const disp = (w) => (jaToEn ? w.en : w.ja);
  const correctDisp = disp(quizCur);
  const seen = new Set([correctDisp]);
  const wrongs = [];
  for (const w of shuffle(allWords())) {
    const d = disp(w);
    if (seen.has(d)) continue;
    seen.add(d); wrongs.push(w);
    if (wrongs.length === 3) break;
  }
  const opts = shuffle([quizCur].concat(wrongs));
  const box = $("quizChoices"); box.innerHTML = "";
  opts.forEach((o) => {
    const b = document.createElement("button");
    b.className = "choice";
    b.textContent = jaToEn ? o.en : o.ja;
    b.onclick = () => answerQuiz(b, o);
    box.appendChild(b);
  });
}
function speakCurrent() { if (quizCur) speak(quizCur.en); }

function answerQuiz(btn, opt) {
  if (quizAnswered) return;
  quizAnswered = true;
  const correct = opt.en === quizCur.en;
  document.querySelectorAll("#quizChoices .choice").forEach((b) => {
    b.disabled = true;
    if (b.textContent === (quizCur._jaToEn ? quizCur.en : quizCur.ja)) b.classList.add("correct");
  });
  if (correct) {
    btn.classList.add("correct");
    $("quizFb").textContent = "正解！"; $("quizFb").className = "feedback good";
    beep(true); praise(); speak(quizCur.en);
    S.correctWords[quizCur.uid + ":" + quizCur.en] = true;
    const r = srsUpdate("word", quizCur.uid, quizCur.en, true);
    reward(10, 1, JOURNEY.kmPerCorrect);
    if (r.graduated) masterPop();
  } else {
    btn.classList.add("wrong");
    $("quizFb").textContent = "おしい！もう一度見てみよう"; $("quizFb").className = "feedback bad";
    $("quizAns").textContent = `答え：${quizCur.en}（${quizCur.ja}）`;
    $("quizAns").classList.remove("hidden");
    beep(false); speak(quizCur.en);
    srsUpdate("word", quizCur.uid, quizCur.en, false);
  }
  $("quizNext").classList.remove("hidden");
  $("quizNext").textContent = (quizI + 1 < quizList.length) ? "次へ →" : "終わる 🏠";
}
function nextQuiz() {
  quizI++;
  if (quizI >= quizList.length) { finishSession(); return; }
  renderQuiz();
}

// ======================================================
//  ならべかえ
// ======================================================
let arrList = [], arrI = 0, arrCur = null, arrSlot = [], arrAnswered = false;

function allSentences() {
  const arr = [];
  UNITS.forEach((u) => u.sentences.forEach((s, i) => arr.push({ uid: u.id, idx: i, ja: s.ja, tokens: s.tokens })));
  return arr;
}
function startArrange() {
  updateStreak();
  arrList = shuffle(allSentences()).slice(0, 6);
  arrI = 0;
  show("arrange");
  loadArrange();
}
function loadArrange() {
  arrAnswered = false;
  arrCur = arrList[arrI];
  arrSlot = [];
  $("arrCount").textContent = `${arrI + 1} / ${arrList.length}`;
  $("arrJa").textContent = arrCur.ja;
  $("arrFb").textContent = ""; $("arrFb").className = "feedback";
  $("arrAns").classList.add("hidden");
  $("arrNext").classList.add("hidden");
  $("arrCheck").classList.remove("hidden");
  renderArrange();
}
function currentBankWords() {
  let words = arrCur.tokens.slice();
  if ($("hardMode") && $("hardMode").checked) {
    const dummies = shuffle(DUMMY_POOL.filter((d) => !arrCur.tokens.map((t) => t.toLowerCase()).includes(d)))
      .slice(0, 2);
    words = words.concat(dummies);
  }
  return words;
}
let _bankCache = null, _bankKey = null;
function renderArrange() {
  // バンク（未配置の単語）を一度だけシャッフルして保持
  const key = arrCur.uid + ":" + arrCur.idx + ":" + (($("hardMode") && $("hardMode").checked) ? "h" : "e");
  if (_bankKey !== key) { _bankCache = shuffle(currentBankWords()); _bankKey = key; arrSlot = []; }

  const slotEl = $("arrSlot"); slotEl.innerHTML = ""; slotEl.className = "slot";
  arrSlot.forEach((w, i) => {
    const t = document.createElement("button");
    t.className = "tile placed"; t.textContent = w;
    t.onclick = () => { if (arrAnswered) return; arrSlot.splice(i, 1); renderArrange(); };
    slotEl.appendChild(t);
  });

  // バンク：cache の各単語のうち、slot で使った分を差し引いて表示
  const remaining = _bankCache.slice();
  arrSlot.forEach((w) => { const k = remaining.indexOf(w); if (k > -1) remaining.splice(k, 1); });
  const bankEl = $("arrBank"); bankEl.innerHTML = "";
  remaining.forEach((w) => {
    const t = document.createElement("button");
    t.className = "tile"; t.textContent = w;
    t.onclick = () => { if (arrAnswered) return; arrSlot.push(w); renderArrange(); };
    bankEl.appendChild(t);
  });
}
function clearSlot() { if (arrAnswered) return; arrSlot = []; renderArrange(); }

function checkArrange() {
  if (arrAnswered) return;
  if (arrSlot.length === 0) { $("arrFb").textContent = "単語を並べてね"; $("arrFb").className = "feedback bad"; return; }
  const correct = arrSlot.join(" ") === arrCur.tokens.join(" ");
  const slotEl = $("arrSlot");
  arrAnswered = true;
  if (correct) {
    slotEl.classList.add("ok");
    $("arrFb").textContent = "正解！"; $("arrFb").className = "feedback good";
    beep(true); praise(); speak(arrCur.tokens.join(" "));
    S.correctSents[arrCur.uid + ":" + arrCur.idx] = true;
    const r = srsUpdate("sent", arrCur.uid, arrCur.idx, true);
    reward(15, 2, JOURNEY.kmPerCorrect);
    if (r.graduated) masterPop();
    $("arrCheck").classList.add("hidden");
    $("arrNext").classList.remove("hidden");
    $("arrNext").textContent = (arrI + 1 < arrList.length) ? "次へ →" : "終わる 🏠";
  } else {
    slotEl.classList.add("ng");
    $("arrFb").textContent = "おしい！もう一度"; $("arrFb").className = "feedback bad";
    $("arrAns").textContent = "答え：" + arrCur.tokens.join(" ") + ".";
    $("arrAns").classList.remove("hidden");
    beep(false); speak(arrCur.tokens.join(" "));
    srsUpdate("sent", arrCur.uid, arrCur.idx, false);
    // やり直し：少し待ってリセット
    arrAnswered = false;
    setTimeout(() => {
      slotEl.classList.remove("ng");
      arrSlot = []; renderArrange();
    }, 1600);
  }
}
function nextArrange() {
  arrI++;
  if (arrI >= arrList.length) { finishSession(); return; }
  loadArrange();
}

// ======================================================
//  復習（忘却曲線 SRS：間隔をあけて再出題し、何回かの正解で卒業）
// ======================================================
// box: 0=まちがえた直後 / 1〜3=だんだん覚えてきた。正解するたびに間隔がのびる。
// box4 に届いたら「マスター」して卒業（カードから消える）。
const SRS_INTERVALS = { 1: 1, 2: 3, 3: 7 };  // 正解したら つぎは何日後か
const SRS_GRADUATE = 4;                       // この box に届いたら卒業
function dayNum() { return Math.floor(Date.now() / 86400000); }
function srsKey(type, uid, key) { return type + ":" + uid + ":" + key; }
function parseSrsKey(k) {
  const p = k.split(":");
  return { type: p[0], uid: p[1], key: p.slice(2).join(":") };
}
// 答え合わせのたびに呼ぶ。{ graduated:true } を返したら卒業（マスター）。
function srsUpdate(type, uid, key, correct) {
  const k = srsKey(type, uid, key);
  const card = S.srs[k];
  if (correct) {
    if (!card) return {};                 // 一度も間違えていない問題は復習不要
    const nb = (card.box || 0) + 1;
    if (nb >= SRS_GRADUATE) { delete S.srs[k]; save(); return { graduated: true }; }
    S.srs[k] = { box: nb, due: dayNum() + SRS_INTERVALS[nb] };
    save(); return {};
  } else {
    S.srs[k] = { box: 0, due: dayNum() };  // まちがえたら今日また復習
    save(); return {};
  }
}
// 復習の対象を取り出す
function srsEntries(onlyDue) {
  const today = dayNum();
  return Object.keys(S.srs)
    .filter((k) => !onlyDue || (S.srs[k].due || 0) <= today)
    .map(parseSrsKey);
}
function dueEntries() { return srsEntries(true); }   // 期限が来たもの
function weakEntries() { return srsEntries(false); }  // 苦手（まだ卒業していない全部）

// entries（{type,uid,key}）を 出題できる単語/文に変換
function entriesToItems(entries) {
  const wordItems = [], sentItems = [];
  entries.forEach((w) => {
    const u = UNITS.find((x) => x.id === w.uid);
    if (!u) return;
    if (w.type === "word") {
      const word = u.words.find((x) => x.en === w.key);
      if (word) wordItems.push(Object.assign({ uid: u.id }, word));
    } else {
      const s = u.sentences[w.key];
      if (s) sentItems.push({ uid: u.id, idx: Number(w.key), ja: s.ja, tokens: s.tokens });
    }
  });
  return { wordItems, sentItems };
}
function runReview(entries) {
  const { wordItems, sentItems } = entriesToItems(entries);
  // 単語が多ければ4択、文だけなら ならべかえ。まず単語を優先（1回あたりの数は控えめに）。
  if (wordItems.length) {
    quizList = shuffle(wordItems).slice(0, 12); quizI = 0; show("quiz"); renderQuiz();
  } else if (sentItems.length) {
    arrList = shuffle(sentItems).slice(0, 10); arrI = 0; show("arrange"); loadArrange();
  }
}
// きょうの復習（期限が来たもの）。なければ苦手から。
function startReview() {
  let entries = dueEntries();
  if (!entries.length) entries = weakEntries();
  if (!entries.length) return;
  updateStreak();
  runReview(entries);
}
// 苦手だけ練習（期限に関係なく、まだ覚えきれていない問題を集中特訓）
function startWeak() {
  const entries = weakEntries();
  if (!entries.length) return;
  updateStreak();
  runReview(entries);
}
// マスター（卒業）したときの ごほうび演出
function masterPop() {
  setTimeout(() => {
    const el = $("praiseText");
    el.textContent = "マスター！⭐";
    el.classList.remove("show"); void el.offsetWidth; el.classList.add("show");
  }, 700);
}

// ---------- セッション終了 ----------
function finishSession() {
  show("home");
  praise();
  const el = $("praiseText");
  el.textContent = "お疲れさま！🎉";
  el.classList.remove("show"); void el.offsetWidth; el.classList.add("show");
}

// ---------- 起動 ----------
window.addEventListener("load", () => {
  refreshTop();
  renderHome();
  // service worker（PWA）登録：新しいバージョンを見つけたら自動で最新に切り替える
  if ("serviceWorker" in navigator) {
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
    navigator.serviceWorker.register("sw.js").then((reg) => {
      reg.update();
      // ページ表示中に更新が来ても、待たせず即適用
      reg.addEventListener("updatefound", () => {
        const nw = reg.installing;
        if (nw) nw.addEventListener("statechange", () => {
          if (nw.state === "installed" && navigator.serviceWorker.controller) nw.postMessage("skip");
        });
      });
    }).catch(() => {});
  }
});
