# 駅サガース

<img src="https://user-images.githubusercontent.com/25225028/81793250-145a5300-9544-11ea-81fa-bee3a8ecc8ac.png" height="200"><img src="https://user-images.githubusercontent.com/25225028/76631346-e7f67a80-6584-11ea-9f6b-5e8885887363.png" height="200">

位置情報ゲーム「駅メモ！」の支援ツールサイト  

<img src="https://user-images.githubusercontent.com/25225028/81814521-dbca7180-9563-11ea-8c8d-5367ba05e2ce.png" width="600"/>  

駅や路線の役立つ情報が見つかる！駅や路線のデータを確認したり，チェックインする駅やレーダーでアクセスできる範囲をGoogleMap上で視覚化します．

**NEW feature**  

[`extra`データセット](https://github.com/Seo-4d696b75/station_database/wiki/extra)が表示できるようになりました  
アプリ右上の設定ダイアログから「extraデータを表示する」をONにします  
<img src="https://user-images.githubusercontent.com/25225028/171987326-7dd033ec-63f1-4518-8fae-a34b2245ed51.png" width="600">

  
- [アプリを使う](https://seo-4d696b75.github.io/ekisagasu/)
- [アプリの詳細](https://seo-4d696b75.github.io/ekisagasu/#/help)

## 開発

### セットアップ

1. Maps JavaScript API keyをGoogle Cloud Consoleから取得する
2. API keyは.gitignoreに指定されている`.env.development.local`に追加する

```txt
VITE_API_KEY=${API_KEY}
```

### 開発用サーバの立ち上げ
```bash
npm run start
```

### Build

Githubのmainブランチにpushするとgh-pageワークフローが自動でビルド＆デプロイします. 手動起動も可能です.

## 技術スタック
<img src="https://user-images.githubusercontent.com/25225028/96458500-f5cb5700-125b-11eb-901c-1aaf0653f999.jpg" height="100"/><img src="https://user-images.githubusercontent.com/25225028/108220336-f9270e80-7179-11eb-9091-c234b1e045be.png" height="100"/><img src="https://user-images.githubusercontent.com/25225028/96458574-0bd91780-125c-11eb-8307-05d60bf3f5f0.png" height="100"/><img src="https://user-images.githubusercontent.com/25225028/96458641-1b586080-125c-11eb-80dd-65ce67712f81.png" height="100"/>


- React + TypeScript による高速開発
- Maps JavaScript API による地図表示機能
- Github Page でホスティング

## 使用データ
このwebアプリで使用しているデータは[このリポジトリ](https://github.com/Seo-4d696b75/station_database)で管理されています。

---------------------------

当ページは、株式会社モバイルファクトリー「ステーションメモリーズ！」の画像を利用しております。  
該当画像の転載・配布等は禁止しております。  
© Mobile Factory, Inc.  
