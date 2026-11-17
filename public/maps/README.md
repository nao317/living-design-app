# 参加企業の静的地図

`iizuka-openstreetmap.png` は OpenStreetMap の標準地図を公式の画像書き出し機能で取得した静的な地図です。画像はアプリ内に保存されているため、表示時に外部の地図サービスへ接続しません。

- 出典：© OpenStreetMap contributors — https://www.openstreetmap.org/copyright
- 画像書き出し手順：https://wiki.openstreetmap.org/wiki/Export_image_api
- 取得方法：OpenStreetMap の通常の画像書き出しフォーム（`/export/finish`）を使用。地図タイルの一括取得は行っていません。
- 取得範囲：西端130.5826522°E、南端33.5781539°N、東端130.7611800°E、北端33.6399150°N
- 座標系：Web Mercator、書き出し縮尺 1:60000
- 画像サイズ：1182 × 491px
- 中心：緯度33.60904、経度130.6719161（ユーザー指定の株式会社リビングデザインの地点）

取得範囲は中心座標の周囲で Web Mercator の左右・上下が対称になるよう設定しています。ピンの先端は地図の中心に置き、地図は中心を保って円形に切り抜いて表示します。円周には外側ほど強くなるぼかしと透過のマスクを適用しています。出典とライセンスへのリンクは円の下に常時表示し、ぼかしの影響を受けないようにしています。

企業ホームページ：https://living-d-f.com/
