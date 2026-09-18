# VocaDB 検索連携

編集画面のトラック一覧下にある「VocaDBから検索」から、曲名・作者名・楽曲リンクを
まとめて取り込む。YouTube リンクと作者名を毎回手で入れる手間をなくすのが目的。

## 使い方

1. セットリスト編集画面で「VocaDBから検索」を押す
2. 「曲名」か「作者名」を選んで検索語を入れる
3. 結果の「追加」を押すと、曲名・作者名・楽曲リンクが入ったトラックが末尾に追加される
4. 続けて追加できる。追加済みの曲はボタンが「追加済み」になり二重追加されない

## 取得するもの / 取得しないもの

**取得する**: 曲名、作者名(VocaDB の `artistString`)、PV の URL、VocaDB のエントリ URL。

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
GET /api/vocadb/songs?q=<検索語>&by=title|artist
Authorization: Bearer <access token>
```

`by` を省略すると `title`。最大 20 件を返す。

```json
{
  "songs": [
    {
      "id": 3939,
      "title": "Tell Your World",
      "artist": "kz feat. 初音ミク",
      "songLink": "https://www.youtube.com/watch?v=PqJNc9KVIZE",
      "vocadbUrl": "https://vocadb.net/S/3939"
    }
  ]
}
```

VocaDB は無認証で叩ける公開 API だが、Lambda が無認証の踏み台にならないよう
編集画面と同じ Cognito 認証を要求する。VocaDB 側の通信に失敗した場合は 502 を返す。

## 作者名検索が 2 リクエストになる理由

VocaDB の `/api/songs?query=` は曲名しか見ないため、作者名検索は
`/api/artists?query=` で作者を 1 件に絞ってから `/api/songs?artistId=` を人気順
(`sort=RatingScore`)で引く 2 段構えにしている。該当する作者がいなければ楽曲検索は
行わず、空の結果を返す。

## API キー

不要。VocaDB の公開 API はキーなしで利用できるので、追加の secrets 設定や
Terraform の変更はない。
