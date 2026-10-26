# MessageCopier
This is a bot that copies messages to another channel.

Made for [ゴットを感じる鯖](https://gott-wave.1.xn--5gqr11h.net/)

## セットアップ方法
### Step 0
[Bun](https://bun.com/docs/installation) をインストールしてください。
そのあと、Botを用意します。

[Discord Developer Portal](https://discord.com/developers/applications) にアクセスして、\
サイドバーから アプリケーション を開きます。

次に、新しいアプリケーション ボタンからアプリを作成してください。\
作成したアプリは後ほど使用します。

### Step 1
まずは必要なパッケージをインストールするため、`bun i`を実行してください。

### Step 2
`.env.example` を `.env` としてコピーしてください。

Discord Developer Portalから作成したアプリを開き、\
概要 > 一般情報 の アプリID を `.env` 内の `CLIENT_ID` に貼り付けてください。

次に、概要 > Bot を開き、トークン の下にある トークンをリセット ボタンからトークンをリセットしてください。\
リセットしたらそのトークンをコピーし、`.env` 内の `BOT_TOKEN` に貼り付けてください。

### Step 3
まずはDBを構築するため、
```sh
bun db:push
```
を実行してください。

次に、スラッシュコマンドを使えるようにするため、
```sh
bun deploy-commands
```
を実行してください。

### Step 4
これでセットアップは完了です！\
`bun start` コマンドを実行すると、Botが動くようになるはずです！