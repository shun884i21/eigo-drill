# 引き継ぎ書：れいなの英語ドリル

新しいチャットでこのファイルの内容を貼り付ければ、続きから作業できます。

---

## 1. これは何か

中学1年生の娘（れいな）のための英語学習Webアプリ（PWA）。父親が本人用に作成。
スマホ/タブレット中心、横型タブレット対応。すでに公開済みで、娘に好評。

- **公開URL**: https://shun884i21.github.io/eigo-drill/
- **GitHubリポジトリ**: shun884i21/eigo-drill（public, GitHub Pages: main / root）
- **ローカルの場所**: `C:\Users\shuns\OneDrive\デスクトップ\eigo-drill`
- **ローカル確認**: `.claude/launch.json` の `eigo-drill`（python http.server, port 4178）
  - 親フォルダ `デスクトップ` の `.claude/launch.json` に登録済み

## 2. 技術構成（シンプルな静的サイト・ビルド不要）

| ファイル | 役割 |
|---|---|
| `index.html` | 画面とCSS（全部インライン）。ホーム/単語クイズ/並べ替え/ショップの4画面＋下部ナビ |
| `app.js` | アプリのロジック全部 |
| `data.js` | 問題データ（単語・並べ替え文）。**ここを編集すれば問題追加できる** |
| `manifest.json` | PWA設定（名前「れいなの英語ドリル」、orientation: any） |
| `sw.js` | サービスワーカー（オフライン対応＋自動更新）。`CACHE` のバージョンを上げると更新が確実に伝わる |
| `icon.svg` | アプリアイコン（🐣＋ABC） |

- 保存は端末内 `localStorage`（キー `eigo-drill-v1`）。サーバー・ログイン・DBなし。
- フレームワーク無し（素のHTML/CSS/JS）。

## 3. 現在の機能

- **単語4択クイズ**：日→英 / 英→日をランダム出題。選択肢は重複しないようdedupe済み
- **並べ替え問題**：日本語を見て単語タイルをタップで語順に。「難しい」チェックでダミー語ON
- **間違えた問題の復習リスト**：自動で貯めて再出題
- **育成ペット**：正解で経験値（ごはん）が貯まり進化。7段階 🥚→🐣→🐤→🐥→🐔→🦚→🦄（名前: たまご/ヒヨコ/ぴよすけ/こっこ/クッキー/ゴージャス/ゆめみ）。必要経験値 0/120/320/600/1000/1500/2200。**最高到達段階を保持し後戻りしない**（`S.maxStage`, `dispStage()`）
- **着せ替えショップ**：15アイテム（20〜130コイン）。1つ装備（`S.acc`）。`S.owned` に購入履歴
- **コイン**：単語正解 +1、並べ替え正解 +2（少しずつ貯まる設計）
- **経験値**：単語正解 +10、並べ替え正解 +15
- **ストリーク（連続日数）・達成度バー（単元別）**
- **読み上げ（TTS）**：英語を発音（ブラウザ標準 speechSynthesis）
- **正解演出**：褒め言葉ポップ＋紙吹雪＋効果音（WebAudio）
- **PWA自動更新**：新バージョンを検知したら自動リロード（`controllerchange` ＋ sw の `skipWaiting`）

## 4. コンテンツ（data.js）

光村「Here We Go!」の単元構成に寄せた中1標準の**オリジナル問題**（教科書と完全一致ではない / 著作権配慮）。

- **全16単元・216単語・144文**
- Unit 1 be動詞 / 2 一般動詞 / 3 複数形と数 / 4 疑問詞 / 5 can / 6 三単現 / 7 現在進行形 / 8 過去形 / 9 命令文・Let's / 10 前置詞・There is / 11 曜日・月・季節 / 12 数と年齢 / 13 家族と人 / 14 食べ物・飲み物 / 15 形容詞 / 16 学校・身の回り
- データ形式（`data.js` 冒頭コメント参照）:
  - `words: [{ en:"英単語", ja:"日本語" }]`
  - `sentences: [{ ja:"日本語文", tokens:["正しい","語順","の","単語"] }]`（ピリオド/？は自動。tokensは単語のみ、先頭大文字）
- 検証ルール：全並べ替え文は「難しいモードでも正解タイルが必ず揃う」、全単語は「4択で正解肢が存在＋4肢ユニーク」を満たす（追加時は同様に確認すること）

## 5. 更新（デプロイ）方法

```bash
cd "C:/Users/shuns/OneDrive/デスクトップ/eigo-drill"
# data.js などを編集後：
git add -A && git commit -m "メッセージ" && git push
```
- 問題やロジックを変えたら `sw.js` の `CACHE = "eigo-drill-vX"` の番号も上げると更新が確実。
- push後、GitHub Pages のビルドは1〜数分。ビルド状態は
  `gh api repos/shun884i21/eigo-drill/pages/builds/latest --jq '.status'`（`built` で完了）
- コミットのCo-Authored-Byフッタ運用中。git user は `-c user.name="shun884i21" -c user.email="shunsukehayashi20@gmail.com"` で指定して commit している。
- **検証はローカルプレビュー**（preview_start → preview_eval でDOM検証）で行う。screenshotはこの環境で不安定なので preview_eval / preview_snapshot 主体で確認する。

## 6. これまでの設計判断（grill済み）

- 娘専用・固定データ・端末内保存と割り切ってシンプルに（サーバー/AI生成は使わない）
- 教科書は光村だが、正確な単語/例文は持っていないためオリジナルで網羅
- UIは漢字中心（中1が読める範囲。ペット名や「あなた」等はかな）
- ホームに飾りタイトル「🌸 れいなの英語ドリル 🐣」（グラデ文字＋揺れる絵文字）
- 横型タブレット対応：`@media (orientation:landscape) and (min-width:740px)` で2カラム化（ホーム/クイズ/ショップ）

## 7. セーブデータ構造（localStorage: eigo-drill-v1）

```
{ ver:2, exp, coins, level, streak, lastPlay, maxStage, acc, owned:[], 
  correctWords:{}, correctSents:{}, wrongPool:[] }
```
- `ver` が無い旧データは load() 時に自動移行（exp×2 して ver=2 を保存。段階が戻らないように）。

## 8. 次の改良の候補（未着手・アイデア）

- リスニング問題（音声を聞いて4択）、英作文（タイピング）、文法のヒント表示
- ペットの種類を選べる／さらにアイテム追加／コレクション図鑑
- 1回の問題数を選べる、単元を選んで練習、ダークモード
- 勉強カレンダー、保護者向け「苦手単元」表示
- 並べ替えの「複数正解」対応（現状は1パターンのみ正解）

## 9. メモリ

Claude のユーザーメモリに記録済み：`eigo-drill-app.md`（MEMORY.md にも索引あり）。
関連: `drill-cards-app.md`（別アプリ、Turso+Vercel+MCP。混同しないこと）。

---

### 新チャットでの最初の一言（例）
「`C:\Users\shuns\OneDrive\デスクトップ\eigo-drill` の『れいなの英語ドリル』の続きをやりたい。HANDOFF.md を読んで状況を把握して。次は〇〇をしたい。」
