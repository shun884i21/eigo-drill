// ===== 中1 えいごドリル：問題データ =====
// 光村「Here We Go!」の単元構成に寄せた中1標準のオリジナル問題。
// 教科書と完全一致ではありません。あとから自由に追加・差し替えできます。
//
// words: { en:英単語, ja:日本語 }
// sentences: { ja:日本語文, tokens:[正しい語順の英単語] }
//   ※ ピリオドや「？」は自動表示。tokens には単語だけを入れる。先頭は大文字で。

const UNITS = [
  // ============================================================
  {
    id: "u1",
    title: "Unit 1　自己紹介（be動詞 am / are）",
    words: [
      { en: "I",       ja: "私は" },
      { en: "you",     ja: "あなたは" },
      { en: "am",      ja: "〜です（I のとき）" },
      { en: "are",     ja: "〜です（you のとき）" },
      { en: "name",    ja: "名前" },
      { en: "friend",  ja: "友達" },
      { en: "student", ja: "生徒・学生" },
      { en: "happy",   ja: "うれしい" },
      { en: "from",    ja: "〜出身で" },
      { en: "nice",    ja: "素敵な・良い" },
    ],
    sentences: [
      { ja: "私は学生です。",         tokens: ["I", "am", "a", "student"] },
      { ja: "あなたは私の友達です。",   tokens: ["You", "are", "my", "friend"] },
      { ja: "私はうれしいです。",       tokens: ["I", "am", "happy"] },
      { ja: "私はケンです。",          tokens: ["I", "am", "Ken"] },
      { ja: "あなたは素敵です。",       tokens: ["You", "are", "nice"] },
      { ja: "私は大阪出身です。",       tokens: ["I", "am", "from", "Osaka"] },
    ],
  },

  // ============================================================
  {
    id: "u2",
    title: "Unit 2　一般動詞（like / play / have）",
    words: [
      { en: "like",   ja: "好きだ" },
      { en: "play",   ja: "（スポーツ・楽器を）する" },
      { en: "have",   ja: "持っている・飼っている" },
      { en: "want",   ja: "ほしい" },
      { en: "eat",    ja: "食べる" },
      { en: "study",  ja: "勉強する" },
      { en: "know",   ja: "知っている" },
      { en: "go",     ja: "行く" },
      { en: "speak",  ja: "話す" },
      { en: "music",  ja: "音楽" },
    ],
    sentences: [
      { ja: "私はサッカーが好きです。",     tokens: ["I", "like", "soccer"] },
      { ja: "私は毎日英語を勉強します。",   tokens: ["I", "study", "English", "every", "day"] },
      { ja: "私はギターを弾きます。",       tokens: ["I", "play", "the", "guitar"] },
      { ja: "私は犬を飼っています。",       tokens: ["I", "have", "a", "dog"] },
      { ja: "私は音楽が好きです。",         tokens: ["I", "like", "music"] },
      { ja: "私は朝ごはんを食べます。",     tokens: ["I", "eat", "breakfast"] },
    ],
  },

  // ============================================================
  {
    id: "u3",
    title: "Unit 3　名詞の複数形と数",
    words: [
      { en: "many",  ja: "たくさんの" },
      { en: "some",  ja: "いくつかの" },
      { en: "book",  ja: "本" },
      { en: "apple", ja: "りんご" },
      { en: "pen",   ja: "ペン" },
      { en: "two",   ja: "2つの" },
      { en: "three", ja: "3つの" },
      { en: "cat",   ja: "ねこ" },
      { en: "box",   ja: "箱" },
      { en: "dog",   ja: "犬" },
    ],
    sentences: [
      { ja: "私は2匹の犬を飼っています。",   tokens: ["I", "have", "two", "dogs"] },
      { ja: "私はりんごが好きです。",         tokens: ["I", "like", "apples"] },
      { ja: "私はたくさんの本を持っています。", tokens: ["I", "have", "many", "books"] },
      { ja: "私は3冊のノートを持っています。", tokens: ["I", "have", "three", "notebooks"] },
      { ja: "私はねこが好きです。",           tokens: ["I", "like", "cats"] },
      { ja: "私はペンを2本持っています。",     tokens: ["I", "have", "two", "pens"] },
    ],
  },

  // ============================================================
  {
    id: "u4",
    title: "Unit 4　疑問詞（What / Who / Where）",
    words: [
      { en: "what",  ja: "何" },
      { en: "who",   ja: "だれ" },
      { en: "where", ja: "どこ" },
      { en: "when",  ja: "いつ" },
      { en: "how",   ja: "どうやって・どのくらい" },
      { en: "why",   ja: "なぜ" },
      { en: "which", ja: "どちら" },
      { en: "whose", ja: "だれの" },
      { en: "time",  ja: "時間" },
      { en: "color", ja: "色" },
    ],
    sentences: [
      { ja: "あなたは何が好きですか。",     tokens: ["What", "do", "you", "like"] },
      { ja: "これは何ですか。",             tokens: ["What", "is", "this"] },
      { ja: "あなたはどこの出身ですか。",   tokens: ["Where", "are", "you", "from"] },
      { ja: "あなたはだれですか。",         tokens: ["Who", "are", "you"] },
      { ja: "今何時ですか。",               tokens: ["What", "time", "is", "it"] },
      { ja: "あなたはサッカーが好きですか。", tokens: ["Do", "you", "like", "soccer"] },
    ],
  },

  // ============================================================
  {
    id: "u5",
    title: "Unit 5　助動詞 can（〜できる）",
    words: [
      { en: "can",   ja: "〜できる" },
      { en: "swim",  ja: "泳ぐ" },
      { en: "run",   ja: "走る" },
      { en: "sing",  ja: "歌う" },
      { en: "cook",  ja: "料理する" },
      { en: "dance", ja: "踊る" },
      { en: "read",  ja: "読む" },
      { en: "write", ja: "書く" },
      { en: "jump",  ja: "跳ぶ" },
      { en: "fast",  ja: "速く" },
    ],
    sentences: [
      { ja: "私は泳ぐことができます。",       tokens: ["I", "can", "swim"] },
      { ja: "私は速く走ることができます。",   tokens: ["I", "can", "run", "fast"] },
      { ja: "あなたは上手に歌えます。",       tokens: ["You", "can", "sing", "well"] },
      { ja: "私はギターを弾けます。",         tokens: ["I", "can", "play", "the", "guitar"] },
      { ja: "あなたは英語を話せますか。",     tokens: ["Can", "you", "speak", "English"] },
      { ja: "私はピアノを弾けます。",         tokens: ["I", "can", "play", "the", "piano"] },
    ],
  },

  // ============================================================
  {
    id: "u6",
    title: "Unit 6　三人称単数（he / she + s）",
    words: [
      { en: "he",      ja: "彼は" },
      { en: "she",     ja: "彼女は" },
      { en: "likes",   ja: "好む（三単現）" },
      { en: "plays",   ja: "する（三単現）" },
      { en: "has",     ja: "持っている（三単現）" },
      { en: "watch",   ja: "見る" },
      { en: "live",    ja: "住む" },
      { en: "teacher", ja: "先生" },
      { en: "mother",  ja: "母" },
      { en: "father",  ja: "父" },
    ],
    sentences: [
      { ja: "彼はサッカーが好きです。",       tokens: ["He", "likes", "soccer"] },
      { ja: "彼女はピアノを弾きます。",       tokens: ["She", "plays", "the", "piano"] },
      { ja: "彼は犬を飼っています。",         tokens: ["He", "has", "a", "dog"] },
      { ja: "私の母は英語を教えます。",       tokens: ["My", "mother", "teaches", "English"] },
      { ja: "彼女は東京に住んでいます。",     tokens: ["She", "lives", "in", "Tokyo"] },
      { ja: "私の父はテレビを見ます。",       tokens: ["My", "father", "watches", "TV"] },
    ],
  },

  // ============================================================
  {
    id: "u7",
    title: "Unit 7　現在進行形（be + ~ing）",
    words: [
      { en: "now",      ja: "今" },
      { en: "running",  ja: "走っている" },
      { en: "playing",  ja: "している" },
      { en: "eating",   ja: "食べている" },
      { en: "studying", ja: "勉強している" },
      { en: "reading",  ja: "読んでいる" },
      { en: "watching", ja: "見ている" },
      { en: "singing",  ja: "歌っている" },
      { en: "sleeping", ja: "眠っている" },
      { en: "cooking",  ja: "料理している" },
    ],
    sentences: [
      { ja: "私は今英語を勉強しています。",   tokens: ["I", "am", "studying", "English", "now"] },
      { ja: "彼はサッカーをしています。",     tokens: ["He", "is", "playing", "soccer"] },
      { ja: "彼女は本を読んでいます。",       tokens: ["She", "is", "reading", "a", "book"] },
      { ja: "私は昼ごはんを食べています。",   tokens: ["I", "am", "eating", "lunch"] },
      { ja: "彼らは歌っています。",           tokens: ["They", "are", "singing"] },
      { ja: "私の母は料理をしています。",     tokens: ["My", "mother", "is", "cooking"] },
    ],
  },

  // ============================================================
  {
    id: "u8",
    title: "Unit 8　過去形（played / went / was）",
    words: [
      { en: "yesterday", ja: "昨日" },
      { en: "played",    ja: "した（過去）" },
      { en: "went",      ja: "行った" },
      { en: "ate",       ja: "食べた" },
      { en: "studied",   ja: "勉強した" },
      { en: "was",       ja: "〜だった（I / he）" },
      { en: "were",      ja: "〜だった（you / they）" },
      { en: "saw",       ja: "見た" },
      { en: "enjoyed",   ja: "楽しんだ" },
      { en: "busy",      ja: "忙しい" },
    ],
    sentences: [
      { ja: "私は昨日サッカーをしました。",     tokens: ["I", "played", "soccer", "yesterday"] },
      { ja: "私は昨日公園に行きました。",       tokens: ["I", "went", "to", "the", "park", "yesterday"] },
      { ja: "私は昨日英語を勉強しました。",     tokens: ["I", "studied", "English", "yesterday"] },
      { ja: "私は昨日うれしかったです。",       tokens: ["I", "was", "happy", "yesterday"] },
      { ja: "あなたは昨日忙しかったです。",     tokens: ["You", "were", "busy", "yesterday"] },
      { ja: "私は映画を楽しみました。",         tokens: ["I", "enjoyed", "the", "movie"] },
    ],
  },
];

// むずかしいモード用のダミー単語プール（語順とは関係ない おとり）
const DUMMY_POOL = ["he", "she", "is", "the", "a", "my", "your", "in", "on", "and", "not", "very", "do", "they"];
