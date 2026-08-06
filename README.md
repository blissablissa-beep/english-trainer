# English Trainer

英単語を中心に、語源・類義語・発音・他言語の相当語を確認できる個人用PWAです。

## 機能

- 日本語 / 英語の解説表示切替
- US / UK IPA表示
- Web Speech APIによる発音再生
- 日本語訳
- 英語による定義
- 語感・ニュアンス
- 語源
- 類義語と使い分け
- コロケーション
- 例文
- ドイツ語相当語
- イタリア語相当語
- フランス語相当語
- スペイン語相当語
- 検索
- ブックマーク
- Today表示
- Review表示
- localStorageを利用した簡易SRS
- GitHub Pages対応

## ファイル構成

```text
index.html
cards.json
manifest.webmanifest
sw.js
README.md
```

## GitHub Pagesの設定

1. GitHubでリポジトリを開く
2. `Settings` を開く
3. `Pages` を開く
4. `Build and deployment` のSourceを `Deploy from a branch` にする
5. Branchを `main`
6. Folderを `/ (root)`
7. `Save` を押す

数分後、次の形式のURLで公開されます。

```text
https://ユーザー名.github.io/english-trainer/
```

## カードの追加

`cards.json` の配列内にカードを追加します。

```json
{
  "id": "thrive",
  "sid": "2026-00001",
  "word": "thrive",
  "level": "B2",
  "freq": "often",
  "tags": [
    "core"
  ],
  "grammar": {
    "pos": "verb",
    "forms": "thrive – thrived – thrived",
    "transitivity": "intransitive"
  },
  "pronunciation": {
    "ipa": {
      "us": "/θraɪv/",
      "uk": "/θraɪv/"
    }
  },
  "meaning": {
    "ja": "繁栄する",
    "en": "to grow or develop successfully"
  },
  "etymology": {
    "ja": "古ノルド語に由来する。",
    "en": "From Old Norse."
  },
  "synonyms": [
    {
      "word": "prosper",
      "note": {
        "ja": "経済的成功を強調する。",
        "en": "Often emphasizes financial success."
      }
    }
  ],
  "equivalents": {
    "de": "gedeihen",
    "it": "prosperare",
    "fr": "prospérer",
    "es": "prosperar"
  }
}
```

## sid

`sid` は次の形式にします。

```text
YYYY-00000
```

例：

```text
2026-00001
2026-00002
2026-00003
```

重複はできません。

## 更新時の注意

`cards.json`を更新しても古い内容が表示される場合は、`index.html`内の次の値を変更します。

```javascript
const CARDS_VERSION = "2026-08-06-1";
```

例えば：

```javascript
const CARDS_VERSION = "2026-08-07-1";
```

また、PWAのキャッシュを完全に更新する場合は、`sw.js`の次の値も変更します。

```javascript
const CACHE_NAME = "english-trainer-v1";
```

例えば：

```javascript
const CACHE_NAME = "english-trainer-v2";
```
