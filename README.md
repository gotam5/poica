# Poica(iPhoneアプリ・試作 0.1)

開いた瞬間、今いる店のカードが一番上に出るポイントカード入れです。企画書「Poica 企画書」の初版の機能を入れています。

## 入っている機能
- スクショから取り込み: 公式アプリの会員証画面のスクショを選ぶとバーコードを読み取り、Poicaの中で出せる。2枚目のスクショで「時間で変わるバーコードか」を確かめられる。楽天・V・dポイントなど時間で変わる店や、規約でスクショ禁止の店は、名前を入れた時点で知らせて「公式アプリ」登録を勧める
- 店ごとのセット: 1つの店で続けて使うカードやアプリ(例: 店のアプリ → dポイント → 支払いアプリ)を順番にまとめる。店ではセットが一番上に出て、アプリを開いて戻るたびに次のものを出す
- カード登録: カメラでバーコードを読む(JAN・NW-7・CODE128・QRなど)。読めないカードは写真で保存。公式アプリでしか出せないカードはリンクを登録
- レジで表示: タップで白い全画面にバーコードを大きく表示。画面を最大の明るさにして、閉じると元に戻す。表示中は画面が消えない
- 公式アプリへ飛ぶ: App Storeを経由せず直接開く。iPhoneの「ショートカット」で作った「Appを開く」を呼ぶ方法(どのアプリでも可)と、アプリ専用URL(「〇〇://」)を開く方法の2通り
- 近い順に並べる: アプリを開くたびに現在地を取り(位置情報は「使用中のみ」)、近くで使ったカードを最大3枚、大きく一番上に出す
- 使った場所を覚える: カードを表示した場所を記録し、次からそこで上に出す。「ここをこの店として覚える」で手動登録もできる
- 初回は地図で補う: まだ場所を覚えていないカードは、カード名で「マップ」アプリを検索
- 通知なし・アカウントなし・広告なし。データはスマホの中(SQLite)だけ

## iPhoneで試す(WindowsでOK、Mac不要)
1. パソコンに Node.js(LTS版)を入れる: https://nodejs.org/
2. iPhoneに App Store から「Expo Go」を入れる
3. このフォルダでコマンドプロンプトを開き、次を実行
   ```
   npm install
   npx expo start
   ```
   更新版を受け取ったときも、まず `npm install` をもう一度実行してください
4. 画面に出るQRコードを iPhone のカメラで読むと、Expo Go で Poica が開きます
   - パソコンとiPhoneは同じWi-Fiにつないでください。つながらないときは `npx expo start --tunnel`

## App Storeに出すとき
Apple Developer Program(有料)に登録したうえで、Expoのクラウド(EAS)でビルドと申請ができます。Macは要りません。
```
npx eas-cli@latest login
npx eas-cli@latest build -p ios
npx eas-cli@latest submit -p ios
```

## ファイル
- `App.js` ホーム画面(近いカード・すべてのカード)と位置情報
- `src/ShowScreen.js` レジで見せる全画面表示
- `src/EditScreen.js` カードの追加・編集
- `src/ScannerScreen.js` カメラでのバーコード読み取り
- `src/decodeImage.js` スクショからのバーコード読み取り
- `src/knownApps.js` 時間で変わる・スクショ禁止の店の一覧(research/fixed-barcode-apps.md より)
- `src/SetShowScreen.js` 店ごとのセットの表示
- `src/appLink.js` 公式アプリを直接開く仕組み
- `src/geo.js` 距離計算、場所の学習、並べ替え
- `src/barcode.js` / `src/BarcodeView.js` バーコードとQRの描画
- `src/storage.js` 端末内の保存(SQLite と写真ファイル)
