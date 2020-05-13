# 駅サガース

<table border="0" width="100%">
  <tr>
    <td width="45%">
<img src="https://user-images.githubusercontent.com/25225028/81793250-145a5300-9544-11ea-81fa-bee3a8ecc8ac.png"/>
    </td>
    <td width="50%">
      <img src="https://user-images.githubusercontent.com/25225028/76631346-e7f67a80-6584-11ea-9f6b-5e8885887363.png">
    </td>
  </tr>
</table>

位置情報ゲーム「駅メモ！」の支援ツールサイト

## 駅メモとは？
全国の鉄道駅の座標位置を対象にした位置ゲーであり、ユーザは現在地から最も近い駅へアクセスできます。しかし他の位置ゲーと異なり、プレイ画面で現在位置が地図上に描画されることもなく、現在位置からアクセスできるスポット（ここでは駅）もほぼ表示されず、正直プレイしにくい。このような動機より、アクセスできる駅の範囲を地図上に視覚化するツールが有志によって多く開発されてきました。

## 何が出来るの？

- チェックインできる駅の範囲を地図上に表示する  
  
  <img src="https://user-images.githubusercontent.com/25225028/81809751-d1f14000-955c-11ea-80e3-c3b0108a0a24.png" width="300"><br>
  アプリのデフォルトの表示画面です。  
  
- 駅の情報を表示する  
  
  地図をタップすると、その位置からチェックインできる駅の情報を表示します。  
  <img src="https://user-images.githubusercontent.com/25225028/81813802-e33d4b00-9562-11ea-8cf2-33a1bb51cec1.png" width="300"><br>
  
- 駅からレーダーでアクセスできる駅一覧を表示する  
  
  駅情報のダイアログにおいて、<img width="24" alt="radar" src="https://user-images.githubusercontent.com/25225028/81815235-b5590600-9564-11ea-9ba1-a5f8e655a7df.png">アイコンをクリックすると、その駅から近い順に一覧表示します。  
  <img src="https://user-images.githubusercontent.com/25225028/81813926-0a941800-9563-11ea-95d8-51771d34b221.png" width="300"><br>
  
- 任意の地点からレーダーでアクセスできる駅一覧を表示する  
  
  選択したい地点を右クリック（スマホではロングタップ）すると、選択地点の最寄り駅に関するダイアログが開きます。そのダイアログの<img width="24" alt="radar" src="https://user-images.githubusercontent.com/25225028/81815235-b5590600-9564-11ea-9ba1-a5f8e655a7df.png">アイコンをクリックします。  
  <img src="https://user-images.githubusercontent.com/25225028/81814045-331c1200-9563-11ea-89dc-b9b7ba270e24.png" width="300"><br>

- 駅へレーダでアクセスできる範囲を表示する  
  
  対象の駅のダイアログにおいて、<img width="24" alt="voronoi" src="https://user-images.githubusercontent.com/25225028/81815691-40d29700-9565-11ea-810b-504c11d0826d.png">アイコンをクリックするとアクセス範囲を表示します。内側から描画される各ポリゴンがレーダーで１,２,３...番目にアクセスできる範囲を表します。つまり一番外側の黒いポリゴンの内側なら、その駅までレーダーが届きます。   
  <img src="https://user-images.githubusercontent.com/25225028/81814170-652d7400-9563-11ea-9c7c-07ecd69732ef.png" width="300"><br>
  
- 路線情報の確認  
  
  駅情報のダイアログでは、その駅が登録されている路線一覧が表示されます。その各項目をクリックすると路線情報のダイアログが開きます。  
  <img src="https://user-images.githubusercontent.com/25225028/81814286-93ab4f00-9563-11ea-956b-9497e9b7eda4.png" height="240">
  <img src="https://user-images.githubusercontent.com/25225028/81814303-98700300-9563-11ea-88aa-6e8a2c4896cb.png" height="240"><br>
  
  登録駅一覧に表示される各駅をクリックすると、その駅のダイアログが開きます。  
    
- レスポンシブなデザイン  
  
  PC、スマホ、タブレットなど環境の違いによる画面サイズに合わせ表示デザインを最適化します。  
  <img src="https://user-images.githubusercontent.com/25225028/81814497-d40acd00-9563-11ea-9e4a-1a85a70a633b.png" height="200">
  <img src="https://user-images.githubusercontent.com/25225028/81814521-dbca7180-9563-11ea-8c8d-5367ba05e2ce.png" height="200"><br>

# 開発環境
This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.<br />
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.<br />
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.<br />
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.<br />
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.<br />
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: https://facebook.github.io/create-react-app/docs/code-splitting

### Analyzing the Bundle Size

This section has moved here: https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size

### Making a Progressive Web App

This section has moved here: https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app

### Advanced Configuration

This section has moved here: https://facebook.github.io/create-react-app/docs/advanced-configuration

### Deployment

This section has moved here: https://facebook.github.io/create-react-app/docs/deployment

### `npm run build` fails to minify

This section has moved here: https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify



---------------------------

当ページは、株式会社モバイルファクトリー「ステーションメモリーズ！」の画像を利用しております。  
該当画像の転載・配布等は禁止しております。  
© Mobile Factory, Inc.  
