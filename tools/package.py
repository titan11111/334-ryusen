"""Ship the exact same game and four original tracks in both download locations."""
from pathlib import Path
import shutil
from zipfile import ZipFile, ZIP_DEFLATED

root=Path(__file__).resolve().parents[1]
folder=root/'RYUSEN_DAY100'
folder.mkdir(exist_ok=True)
files=['index.html','Current_Against_the_Stone.mp3','Crossing_the_Razor_River.mp3','The_Raging_Descent.mp3','Torrent_and_Triumph.mp3']
for name in files:
    shutil.copy2(root/name,folder/name)
(folder/'README.txt').write_text('流川 RYUSEN v6.8 / DAY 100\n\nindex.htmlをブラウザで開いてください。MP3は同じフォルダに置いたままにします。\n\nはじめる → コース → 船 → 出航。メニューはスクロールせず切り替えます。\nA / Z / F / J：漕ぐ\nB / X / E / K：減速\nR / Space / C：踏ん張る\n矢印：操船\n滝前はBで減速 → 落下したらBを離してRで着水を守る。\n転覆したらAを10回押して復帰。長押しは無効。ライバルは進み続けます。\n一時停止画面からFPSの表示を切り替えられます。\n\niPhone実機・実機FPSは未確認です。\n',encoding='utf-8')
archive=root/'RYUSEN_DAY100.zip'
with ZipFile(archive,'w',compression=ZIP_DEFLATED,compresslevel=9) as output:
    for name in [*files,'README.txt']:
        output.write(folder/name,'RYUSEN_DAY100/'+name)
(root/'dist').mkdir(exist_ok=True)
shutil.copy2(archive,root/'dist/RYUSEN_DAY100.zip')
with ZipFile(archive) as output:
    assert output.read('RYUSEN_DAY100/index.html')==(root/'index.html').read_bytes()
    assert output.testzip() is None
assert archive.read_bytes()==(root/'dist/RYUSEN_DAY100.zip').read_bytes()
print(f'Packaged {archive.stat().st_size:,} bytes; root, folder, dist ZIP agree')
