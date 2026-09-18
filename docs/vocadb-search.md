# VocaDB 検索連携

編集画面のトラック一覧下にある「VocaDBから検索」から、曲名・作者名・楽曲リンクを
まとめて取り込む。YouTube リンクと作者名を毎回手で入れる手間をなくすのが目的。

## 使い方

1. セットリスト編集画面で「VocaDBから検索」を押す
2. 「曲名」「作者名」のどちらか、または両方を入れて検索する
3. 結果の「追加」を押すと、曲名・作者名・楽曲リンクが入ったトラックが末尾に追加される
4. 続けて追加できる。追加済みの曲はボタンが「追加済み」になり二重追加されない

作者名を入れて検索したときは、**採用した作者を結果の上に表示する**。候補が複数あれば
「別の作者で探す」に並ぶので、違う人が当たっていたら押して引き直せる。

## 取得するもの / 取得しないもの

**取得する**: 曲名、作者名(VocaDB の `artistString`)、曲の種別(`songType`)、PV の URL、
VocaDB のエントリ URL。

サムネイルは VocaDB からではなく、取り込んだ YouTube リンクの videoId を
`/api/proxy/thumbnail` に渡して表示する(YouTube Data API 経由)。ニコニコ動画しか PV が
無い曲にはサムネイルが出ないので、プレースホルダを置く。

**取得しない**: ジャケット/サムネイル画像。VocaDB の画像はフェアユース依拠でライセンス
対象外のため、API リクエストの `fields` に `ThumbUrl` を含めない。サムネイルが必要な
場合は YouTube Data API 経由(`/api/proxy/thumbnail`)を使う。

## 楽曲リンクの選び方

VocaDB の 1 エントリには複数の PV がぶら下がる。アプリが埋め込み再生できるサービス
(`frontend/src/features/setlist/media.ts` 参照)のうち、次の順で 1 件だけ採用する。

1. YouTube
2. ニコニコ動画

同じサービス内では転載版(`Reprint`)より公式アップロード(`Original`)を優先し、
削除済み(`disabled`)の PV と URL を持たない PV は使わない。どちらのサービスにも
PV が無ければ楽曲リンクは空のままで、一覧に「楽曲リンクなし」と表示する。

## エンドポイント

```
GET /api/vocadb/songs?title=<曲名>&artist=<作者名>&artistId=<作者ID>
Authorization: Bearer <access token>
```

`title` と `artist` は少なくとも一方が必要。両方あればその作者の中を曲名で絞り込む。
`artistId` は作者候補から選び直したときに作者を固定するためのもの。最大 20 件を返す。

```json
{
  "songs": [
    {
      "id": 3939,
      "title": "Tell Your World",
      "artist": "kz feat. 初音ミク",
      "songLink": "https://www.youtube.com/watch?v=PqJNc9KVIZE",
      "vocadbUrl": "https://vocadb.net/S/3939",
      "songType": "Original"
    }
  ],
  "artist": { "id": 77, "name": "kz", "artistType": "Producer" },
  "artistCandidates": [{ "id": 77, "name": "kz", "artistType": "Producer" }]
}
```

`songType` は Original / Remix / Cover / Instrumental 等。同名エントリが並んだときの
見分けに使うので、画面では Original 以外だけバッジで出す。

VocaDB は無認証で叩ける公開 API だが、Lambda が無認証の踏み台にならないよう
編集画面と同じ Cognito 認証を要求する。VocaDB 側の通信に失敗した場合は 502 を返す。

## 作者名検索が 2 リクエストになる理由

VocaDB の `/api/songs?query=` は曲名しか見ないため、作者名検索は
`/api/artists?query=` で作者を引いてから `/api/songs?artistId=` を引く 2 段構えにしている。
曲名の指定が無いときは人気順(`sort=RatingScore`)にして、その作者の代表曲から見られるようにする。

### 作者の絞り込みは `artistId[]` と書くこと

VocaDB の `/api/songs` は作者IDを**配列**で受けるので、`artistId=89` ではなく
`artistId[]=89`(URLエンコードすると `artistId%5B%5D=89`)と書く必要がある。

これを間違えても**エラーにはならない**。VocaDB は ASP.NET 製で、束縛できないクエリ
パラメータを黙って無視するため、絞り込みが外れた状態のリクエストがそのまま成功する。
`sort=RatingScore` と併用していると「VocaDB 全体の人気曲トップ20」が返り、一見それらしい
曲名が並ぶので気づきにくい。2026-09-18 に実際にこの不具合を出した。

実際のレスポンスで確認した結果:

| リクエスト                               | 返ってきたもの                                        |
| ---------------------------------------- | ----------------------------------------------------- |
| `...&sort=RatingScore&artistId=89`       | ローリンガール, 炉心融解, マトリョシカ …(kz と無関係) |
| `...&sort=RatingScore&artistId%5B%5D=89` | Tell Your World, Last Night Good Night …(kz の曲)     |

`backend/src/services/vocadb.test.ts` に回帰テストを置いてある。

### 候補を 1 件に決め打ちしないこと

初版は作者検索の**先頭 1 件を無条件に採用**していて、狙いと違う作者の曲が黙って並ぶ事故が
起きた。VocaDB の作者検索は部分一致で、並び順も関連度順ではない。実際に
`/api/artists?query=kz&nameMatchMode=Auto` を叩くと、この順で返ってくる。

```
Dr.Lucy(46717), kuzuBP5(50343), kz(89), Kz(143504), KZ Creations(5964)
```

狙いの kz は 3 番目で、先頭は名前すら似ていない Dr.Lucy になる。しかも画面にどの作者を
採用したか出していなかったので、間違いに気づけなかった。

そこで次のようにした。

- 候補を 5 件取り、**完全一致 → 前方一致 → VocaDB の並び順**で並べ替えて先頭を採用する
  (大文字小文字は区別しない)
- 採用した作者と候補一覧を必ずレスポンスに含め、画面に出して選び直せるようにする
- 作者名を指定したのに誰も見つからなければ、**曲名だけで検索し直さない**。
  別人の曲が並ぶより「その作者は見つからなかった」と分かるほうがよい

## API キー

不要。VocaDB の公開 API はキーなしで利用できるので、追加の secrets 設定や
Terraform の変更はない。
