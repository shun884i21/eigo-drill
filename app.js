// ===== えいごドリル：アプリ本体 =====

// ---------- セーブデータ ----------
const SAVE_KEY = "eigo-drill-v1";
const defaultState = {
  exp: 0,            // ペットのごはん（経験値）
  coins: 0,
  level: 1,
  streak: 0,
  lastPlay: null,    // "YYYY-MM-DD"
  petStage: 0,
  acc: "",           // 装備中アクセサリー絵文字
  owned: [],         // 購入済みアイテムid
  correctWords: {},  // "u1:I" -> true （一度でも正解した単語）
  correctSents: {},  // "u1:0" -> true
  wrongPool: [],     // 復習用 { type, uid, idx }
};
let S = load();

function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return Object.assign({}, defaultState, JSON.parse(raw));
  } catch (e) {}
  return JSON.parse(JSON.stringify(defaultState));
}
function save() { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); }

// ---------- ペットの成長 ----------
const PET_STAGES = [
  { emoji: "🥚", name: "たまご",   need: 0 },
  { emoji: "🐣", name: "ヒヨコ",   need: 50 },
  { emoji: "🐤", name: "ぴよすけ", need: 150 },
  { emoji: "🐥", name: "こっこ",   need: 300 },
  { emoji: "🐔", name: "クッキー", need: 500 },
];
function stageFor(exp) {
  let s = 0;
  for (let i = 0; i < PET_STAGES.length; i++) if (exp >= PET_STAGES[i].need) s = i;
  return s;
}
function nextNeed(stage) {
  return stage + 1 < PET_STAGES.length ? PET_STAGES[stage + 1].need : PET_STAGES[stage].need;
}

// ---------- ショップ ----------
const SHOP = [
  { id: "ribbon", emoji: "🎀", name: "リボン", price: 30 },
  { id: "crown",  emoji: "👑", name: "王冠",   price: 60 },
  { id: "hat",    emoji: "🎩", name: "帽子",   price: 50 },
  { id: "star",   emoji: "⭐", name: "星",     price: 20 },
  { id: "flower", emoji: "🌸", name: "お花",   price: 40 },
];

// ---------- 共通UI ----------
const $ = (id) => document.getElementById(id);
const views = ["home", "quiz", "arrange", "shop"];
function show(v) {
  views.forEach((x) => $("view-" + x).classList.toggle("hidden", x !== v));
  ["home", "quiz", "arrange", "shop"].forEach((x) =>
    $("nav-" + x) && $("nav-" + x).classList.toggle("active", x === v)
  );
  if (v === "home") renderHome();
  if (v === "shop") renderShop();
}

function refreshTop() {
  $("streakN").textContent = S.streak;
  $("coinN").textContent = S.coins;
  $("lvN").textContent = S.level;
  $("petMini").textContent = PET_STAGES[stageFor(S.exp)].emoji;
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
function reward(exp, coins) {
  const beforeStage = stageFor(S.exp);
  S.exp += exp;
  S.coins += coins;
  S.level = stageFor(S.exp) + 1;
  const afterStage = stageFor(S.exp);
  save(); refreshTop();
  if (afterStage > beforeStage) setTimeout(() => evolveAnim(afterStage), 400);
}
function evolveAnim(stage) {
  praise();
  const el = $("praiseText");
  el.textContent = "進化！ " + PET_STAGES[stage].emoji;
  el.classList.remove("show"); void el.offsetWidth; el.classList.add("show");
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

// ---------- ホーム描画 ----------
function renderHome() {
  refreshTop();
  const stage = stageFor(S.exp);
  $("petBig").innerHTML = `<span class="pet-acc" id="petAcc">${S.acc || ""}</span>${PET_STAGES[stage].emoji}`;
  $("petName").textContent = PET_STAGES[stage].name;
  const need = nextNeed(stage);
  const prev = PET_STAGES[stage].need;
  const pct = need > prev ? Math.min(100, Math.round(((S.exp - prev) / (need - prev)) * 100)) : 100;
  $("expBar").style.width = pct + "%";
  $("expNow").textContent = S.exp;
  $("expMax").textContent = need;

  // 復習ボタン
  $("reviewBtn").disabled = S.wrongPool.length === 0;
  $("reviewBtn").textContent = S.wrongPool.length
    ? `🔁 間違えた問題を復習（${S.wrongPool.length}）` : "🔁 間違えた問題（なし）";

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

// ---------- ショップ描画 ----------
function renderShop() {
  refreshTop();
  $("shopCoin").textContent = S.coins;
  const list = $("shopList"); list.innerHTML = "";
  // はずすボタン
  if (S.acc) {
    const off = document.createElement("button");
    off.className = "btn secondary small";
    off.textContent = "アクセサリーを外す";
    off.onclick = () => { S.acc = ""; save(); renderShop(); renderHome(); };
    list.appendChild(off);
  }
  SHOP.forEach((item) => {
    const owned = S.owned.includes(item.id);
    const equipped = S.acc === item.emoji;
    const row = document.createElement("div");
    row.className = "shop-item";
    let btn;
    if (!owned) {
      btn = `<button class="btn small ${S.coins < item.price ? "" : "violet"}" ${S.coins < item.price ? "disabled" : ""} onclick="buy('${item.id}')">🪙${item.price} で買う</button>`;
    } else if (equipped) {
      btn = `<button class="btn small secondary" disabled>装備中</button>`;
    } else {
      btn = `<button class="btn small" onclick="equip('${item.id}')">つける</button>`;
    }
    row.innerHTML = `<span class="shop-emoji">${item.emoji}</span>
      <div class="shop-info"><b>${item.name}</b><span class="muted">${owned ? "持ってるよ" : item.price + " コイン"}</span></div>${btn}`;
    list.appendChild(row);
  });
}
function buy(id) {
  const item = SHOP.find((x) => x.id === id);
  if (!item || S.coins < item.price || S.owned.includes(id)) return;
  S.coins -= item.price; S.owned.push(id); S.acc = item.emoji;
  save(); renderShop(); renderHome(); praise();
}
function equip(id) {
  const item = SHOP.find((x) => x.id === id);
  if (!item) return;
  S.acc = item.emoji; save(); renderShop(); renderHome();
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
    removeFromWrong("word", quizCur.uid, quizCur.en);
    reward(10, 2);
  } else {
    btn.classList.add("wrong");
    $("quizFb").textContent = "おしい！もう一度見てみよう"; $("quizFb").className = "feedback bad";
    $("quizAns").textContent = `答え：${quizCur.en}（${quizCur.ja}）`;
    $("quizAns").classList.remove("hidden");
    beep(false); speak(quizCur.en);
    addToWrong("word", quizCur.uid, quizCur.en);
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
    removeFromWrong("sent", arrCur.uid, arrCur.idx);
    reward(15, 3);
    $("arrCheck").classList.add("hidden");
    $("arrNext").classList.remove("hidden");
    $("arrNext").textContent = (arrI + 1 < arrList.length) ? "次へ →" : "終わる 🏠";
  } else {
    slotEl.classList.add("ng");
    $("arrFb").textContent = "おしい！もう一度"; $("arrFb").className = "feedback bad";
    $("arrAns").textContent = "答え：" + arrCur.tokens.join(" ") + ".";
    $("arrAns").classList.remove("hidden");
    beep(false); speak(arrCur.tokens.join(" "));
    addToWrong("sent", arrCur.uid, arrCur.idx);
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
//  復習（まちがえた問題）
// ======================================================
function addToWrong(type, uid, key) {
  const exists = S.wrongPool.some((w) => w.type === type && w.uid === uid && w.key === key);
  if (!exists) { S.wrongPool.push({ type, uid, key }); save(); }
}
function removeFromWrong(type, uid, key) {
  const before = S.wrongPool.length;
  S.wrongPool = S.wrongPool.filter((w) => !(w.type === type && w.uid === uid && w.key === key));
  if (S.wrongPool.length !== before) save();
}
function startReview() {
  if (S.wrongPool.length === 0) return;
  updateStreak();
  const wordItems = [], sentItems = [];
  S.wrongPool.forEach((w) => {
    if (w.type === "word") {
      const u = UNITS.find((x) => x.id === w.uid);
      const word = u && u.words.find((x) => x.en === w.key);
      if (word) wordItems.push(Object.assign({ uid: u.id }, word));
    } else {
      const u = UNITS.find((x) => x.id === w.uid);
      const s = u && u.sentences[w.key];
      if (s) sentItems.push({ uid: u.id, idx: w.key, ja: s.ja, tokens: s.tokens });
    }
  });
  // 単語が多ければ4択、文が多ければならべかえ。まず単語復習を優先。
  if (wordItems.length) {
    quizList = shuffle(wordItems); quizI = 0; show("quiz"); renderQuiz();
  } else if (sentItems.length) {
    arrList = shuffle(sentItems); arrI = 0; show("arrange"); loadArrange();
  }
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
