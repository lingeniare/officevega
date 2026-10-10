# OfficeVega のインストール

すべてのビルドは [Releases ページ](https://officevega.com/releases) で公開されています。すべて `main` から作られており、Windows 用インストーラーには署名が付いています。

## 自分のマシンに合わせてファイルを選ぶ

| プラットフォーム                     | 必要なもの                                             | ファイル                    |
| ------------------------------------ | ------------------------------------------------------ | --------------------------- |
| **Windows** — ほとんどの PC          | Windows 10+、Intel/AMD                                 | `-x64.exe` インストーラー   |
| **Windows** on Arm                   | Arm 版の Windows 11（Snapdragon X など）               | `-arm64.exe` インストーラー |
<!-- 他のプラットフォームは今後対応予定です。当面は Windows のみ
| **macOS** — Apple Silicon            | macOS 11+                                              | `.dmg` (arm64)              |
| **macOS** — Intel                    | macOS 11+                                              | `.dmg` (x64)                |
| **Linux** — Debian / Ubuntu          | x86_64、glibc 2.34+（Ubuntu 22.04 以降）               | `.deb`                      |
| **Linux** — Fedora / RHEL / openSUSE | x86_64、glibc 2.34+（Fedora 35+、RHEL 9+、Leap 15.6+） | `.rpm`                      |
| **Linux** — それ以外                 | x86_64、glibc 2.34+、FUSE 2                            | `.AppImage`                 |
-->

古いバージョンは Releases ページに残っています。

<!--
## macOS で

`.dmg` を開き、**OfficeVega** を Applications にドラッグします。Intel 版では初回起動時に、開いてよいかの確認が表示されます。Applications でアプリを右クリックし、「開く」を選んでください。これは署名がないように見えるディスクイメージに対して Gatekeeper が行う確認で、ダウンロードが壊れているわけではありません。
-->

## Windows で

`.exe` インストーラーを実行します。OfficeVega がスタートメニューに追加され、`.docx`、`.xlsx`、`.pptx`、`.pdf` などが登録されるので、ファイルをダブルクリックすれば開けます。

<!--
## Linux で

**Debian / Ubuntu**

```sh
sudo apt install ./officevega_<version>_amd64.deb
```

**Fedora / RHEL / openSUSE**

```sh
sudo dnf install ./officevega-<version>.x86_64.rpm     # Fedora / RHEL 系
sudo zypper install ./officevega-<version>.x86_64.rpm  # openSUSE
```

**AppImage**：インストール手順なしで、置いた場所からそのまま動きます。

```sh
chmod +x OfficeVega-<version>.AppImage
./OfficeVega-<version>.AppImage
```

FUSE 2 ランタイムが必要です。インストールしたくない場合は `--appimage-extract-and-run` を付けて実行してください。その場合、サンドボックスは展開されたディレクトリーから動作します。
-->

## 使用しているビルド

**設定 ▸ 情報** には、使用中のビルド、追従している更新チャンネル、プロジェクトの場所が表示されます。そのチャンネルで新しいビルドが公開されると、同じ画面に更新の案内が表示されます。

![設定 ▸ 情報：インストール済みのバージョン、アプリが追従する更新チャンネル、プロジェクトのサイトへのリンク](img/install.png)

<!--
## その他の 3 つの入手方法

いずれもアプリを再ビルドするのではなく、公開済みの成果物をまとめ直したものなので、公式のバイナリに追従します。

- **Flatpak**：Flatpak の `extra-data` の仕組みで `.deb` をインストールし、Electron 自身のサンドボックスに合わせる Zypak の下で実行します。`/app` のツリーは読み取り専用のため、更新はアプリ内の更新ダイアログではなく Flatpak 経由で行います。
- **Nix**：チェックアウトから `nix-build packaging/nix` でビルドするパッケージ式です。`packaging/nix` を参照してください。
- **Docker**：ヘッドレスのバッチ変換用イメージ（`packaging/docker`）です。Office、Markdown、HTML の文書ツリー全体を、アプリ自身の書き出しパイプラインで PDF に変換するので、出力はファイル ▸ 書き出しと同じになります。サーバーではなく CLI ユーティリティです。
-->

## コマンドラインも付属しています

どのインストールにも `officevega` コマンドが含まれており、ウィンドウと同じエンジンを使います。そのため、同じファイルを扱う際に両者の判断が食い違うことはありません。コマンドは アプリのパッケージ内にあり、`officevega install-cli` を実行すると `PATH` に追加されます。できることは **コマンドラインとエージェント** を参照してください。

## サポート

- Web サイト：[officevega.com](https://officevega.com)、リリース：[officevega.com/releases](https://officevega.com/releases)。
- ヘルプとフィードバック：[officevega.com/feedback](https://officevega.com/feedback)、Telegram チャンネル：[t.me/getmyai](https://t.me/getmyai)。
- 開発者：[getmyai.io](https://getmyai.io)（Dmitry Filippov）、メール：[mail@vega.chat](mailto:mail@vega.chat)。
