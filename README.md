# 流川 RYUSEN — WORLD RAPIDS

棒一本、十人の命。世界の瀑布から着想した3D川下りゲーム。

## 遊ぶ
`index.html` をブラウザで開く。これが唯一の出荷実体で、Three.js・操作・シェーダをすべて埋め込んだ自己完結の1枚（外部通信なし）。
公開URL: https://titan11111.github.io/334-ryusen/

| 操作 | PC | 携帯 |
|---|---|---|
| 左右へ竿で突く | ← → / A D | 左の方向パッド |
| 踏ん張る | Space / Z | A |
| 減速 | E / X | B |
| 視点 | V | 視点ボタン |
| 一時停止 | P / Escape | Ⅱ |

- 岩・岸に竿が届くと強い一突きになる。
- 落差の前は踏ん張る。踏ん張っている間は竿を突けない。
- 落水者は金色の浮輪が目印。舟を寄せると救助。後方へ離れた人には減速して待つ。
- 長押しで体力を使い切った場合は、いったん離して回復を待つ。
- 舟を守り、乗客を届ける。全員帰還・舟の状態・救助・落差成功で評価する。

## 3コース
曽木の滝（入門）、イグアスの滝（水煙と横流れ）、ザンベジ（連続落差）。各1,260m。
すべて実在の場所に着想した架空の航路で、測量に基づく再現ではない。

## 制作と参照
- `RYUSEN.html`：元のCodex版。変更していない。
- `激流ワンポール.html`：Claude Code参考版（別系統の試作）。変更していない。**CDNのthree.js r128とGoogle Fontsに依存するため単体ではオフライン動作しない。**出荷版とは無関係。
- `SPEC.md`：仕様・意図・制約。
- `LEARNINGS.md`：学びの記録。

### ⚠️ ビルド経路は現在死んでいる（2026-10-25 実測）

`tools/build.py` は **実行すると停止する**。元の土台HTML（title `流川 RYUSEN — 棒一本、十人の命。`）が
作業ツリー・このリポジトリのgit履歴（2コミット）・親リポジトリの履歴のどこにも残っていない。

```sh
$ python3 tools/build.py
RYUSEN.html is the regatta build. This integrator targets the older one-pole HTML and would overwrite index.html. Stopped.
```

さらに `src/` と `fc-ios-controller.{js,css}` の中身は **出荷版 index.html に入っていない**（実測）。

| 確認した識別子 | 由来 | index.html での出現 |
|---|---|---|
| `RIVER_WORLDS` `courseKey` | `src/worlds.js` | 0 回 |
| `aboard` `amount` | `src/simulation.js` | 0 回 |
| `addFalls` `acacia` `armMaterial` | `src/scene-extras.js` | 0 回 |
| `bindPointerButton` `calcDpad` `dpadEl` | `fc-ios-controller.js` | 0 回 |
| `.fc-control-deck` `.fc-dpad` | `fc-ios-controller.css` | 0 回 |

出荷版のコントローラは index.html 内に直接書かれた `data-titan-*` 系（`data-titan-pad` 8回・
`data-titan-action` 10回・`data-titan-controls` 5回）。fc系の `.fc-*` とは別物。

**つまり index.html は src/ から生成されたものではない。** `src/` は統合されなかった設計資産として
残しているだけで、現状の出荷物には寄与していない。index.html を直接編集するしかない状態。

- `RYUSEN.html`：旧エントリ名。652KBの実体コピーだったが、index.html の完全な部分集合だったため
  2026-10-25 にリダイレクト1枚へ置き換えた（鉄則8＝旧URLは消さずリダイレクトで残す）。
- `src/` `tools/build.py` `fc-ios-controller.{js,css}`：上記のとおり出荷版と未接続。
  復活させるなら土台HTMLの再入手か、build.py を index.html 基準に書き換える必要がある。

新しいベスト記録は `tg.334.best.<course>.<mode>`。曽木コースでは旧 `ryusen-best-*` を読み替え、既存記録を保持する。

## フォルダ名
`334-ryusen`。番号334は維持（鉄則2）。改名は完了済みで、`rename-folder.command` は不要になったため存在しない。
重複して残っていた `334/`（古い RYUSEN.html 1枚のみ・未追跡）は 2026-10-25 に削除した。

## 確認範囲
詳しくは `LEARNINGS.md`。`_playtest/` はこのフォルダには存在しない（記載は旧版の名残）。
iPhone実機はNOT_TESTED。公開は完了している（本番URL HTTP 200・index.html の md5 一致を 2026-10-25 に実測）。
市販AAAタイトルと同等の品質・性能を保証するものではない。

Three.js 180のMITライセンス表記は元HTMLと完成HTMLに保持している。
