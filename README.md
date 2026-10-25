# 流川 RYUSEN — EXTREME ×3.25

棒一本、十人の命。世界の瀑布から着想した3D川下りゲーム。

## 遊ぶ
`index.html` は Three.js・操作・水面シェーダを埋め込んだ自己完結HTMLです。
既存URL: https://titan11111.github.io/334-ryusen/

| 操作 | PC | 画面ボタン |
|---|---|---|
| 操船 | ← → / A D | 左の十字パッド |
| 漕ぐ | Z / F / J | A（右下・赤） |
| 減速 | X / E / K | B（Aの左上） |
| 踏ん張る | Space / C | R（独立した小ボタン） |
| 視点 / 一時停止 | V / P / Escape | 右上 |

Aは押すたびに加速。長押しは約0.48秒ごとに自動漕ぎ。Bが同時押しより優先し、押下直後に速度を12%落とす。B中の操舵力は通常の1.5倍。接触後の復帰直前50msの漕ぎ入力を保持する。
下25%は操作専用。ボタンは押下時に沈み、音ONなら短い矩形波クリックが鳴る。

## 岩礁の当たり判定（v6.1）
船種別の固定半径を廃止。船体メッシュの外周、表示倍率1.2、旋回角を使います。和舟のプレイヤー艇は従来と別の実メッシュを使用。船首・船尾・側面、岸との接触、高速・横移動中の通過を判定し、オールや乗客は判定に含めません。船幅による通れる隙間の差は残します。

## 流される加速エンジン（v6.2）
金色のエンジンを取ると2秒だけ通常速度の2倍。最大4個/コース、数十秒ごとに遭遇する疎な配置。水流で移動し、CPUと取り合います。時間延長・重複なし、終了後6秒は再取得不可。Bまたは岩・岸への衝突で解除。耐久回復・無敵はありません。大落差・大渦の接近地点では出さず、安全な配置を選べない枠は出現させません。

## EXTREME
従来の目標流速を3.25倍に設定。狭窄と勾配による追加加速、カーブ外側への慣性、立ち波、渦を反映。速度はゲーム内演出値で、実河川の測定速度ではありません。
危険に進路が重なると、岩または着水までの秒数と対処を表示。岩との高速衝突は重傷、大落差は踏ん張らなければ一撃で失敗する場合があります。
3コース各11,375ゲーム内m・12区間・5落差。自動操船のシミュレーションでは約170〜173秒。TOURINGは×1で、所要時間も長くなります。

## 各地の違い
曽木は広い岩床と山林、イグアスは亜熱帯林と連瀑・水煙、ザンベジは黒い岩壁と大きな立ち波。メニューの「現地を知る」で、現実と創作の境界、文化と衣装の扱いを読めます。全乗員にヘルメットと救命胴衣を配置しています。

## 今回の更新・検証
- `src/extreme-simulation.js`：出荷版で実行する物理・ダメージ・予告ロジック。
- `src/extreme-runtime.js`：Titan Controller API 1を再利用するゲーム固有の入力アダプターと地域資料。
- `src/extreme-ui.css`：ABと独立Rの操作デッキ。
- `python3 tools/update_extreme.py`：上記3ファイルを出荷版へ再埋め込み。古い `tools/build.py` は使いません。
- `node tools/test_extreme.cjs`：出荷HTMLから実ロジックを読み、速度、衝突、3コース完走、入力バッファなど17ケースを確認。
- iPhone実機：NOT_TESTED。入力レイテンシー1〜2フレームは実測していません。

## 制作と参照
- `RYUSEN.html`：元のCodex版。変更していない。
- `激流ワンポール.html`：Claude Code参考版（別系統の試作）。変更していない。**CDNのthree.js r128とGoogle Fontsに依存するため単体ではオフライン動作しない。**出荷版とは無関係。
- `SPEC.md`：仕様・意図・制約。
- `LEARNINGS.md`：学びの記録。

### 旧ビルド経路の記録（v6以前）

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
残しているだけで、現状の出荷物には寄与していない。v6では tools/update_extreme.py が出荷版を保持しつつ、今回の読みやすい3ソースを更新します。旧srcファイル群は引き続き未接続です。

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
