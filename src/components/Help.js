import React from 'react';
import './Help.css'
import { Link } from "react-router-dom";
import github_icon from "../img/GitHub-Mark.png";
import github_logo from "../img/GitHub_Logo.png";
import react_icon from "../img/reactjs.jpg";
import google_icon from "../img/googlemapjs.png";

export default class Help extends React.Component {

    render() {
        return (
            <div className="root-container">
                <div className="Header-frame">

                    <div className="App-title">駅サガース</div>
                    <div className="Action-container">
                        <Link to="/ekisagasu">
                            <div className="Action-app">▶ Webアプリを使う！</div>
                        </Link>
                    </div>
                </div>
                <div className="main-container">


                    <img alt="app image" src="https://user-images.githubusercontent.com/25225028/81793250-145a5300-9544-11ea-81fa-bee3a8ecc8ac.png" height="200" />
                    <img alt="ekimemo" src="https://user-images.githubusercontent.com/25225028/76631346-e7f67a80-6584-11ea-9f6b-5e8885887363.png" height="200" />
                    <h1>位置情報ゲーム「駅メモ！」の支援ツールサイト</h1>

                    <h2>駅メモとは？</h2>
                    <p><a href="https://ekimemo.com/">全国の鉄道駅の座標位置を対象にした位置ゲー</a>であり、ユーザは現在地から最も近い駅へアクセスできます。しかし他の位置ゲーと異なり、プレイ画面で現在位置が地図上に描画されることもなく、現在位置からアクセスできるスポット（ここでは駅）もほぼ表示されず、正直プレイしにくい。このような動機より、アクセスできる駅の範囲を地図上に視覚化するツールが有志によって多く開発されてきました。</p>


                    <h2>何が出来るの？</h2>

                    <h4>地図上に可視化</h4>
                    <p>チェックインできる駅の範囲を地図上に表示します。</p>

                    <img alt="screen shot" src="https://user-images.githubusercontent.com/25225028/81809751-d1f14000-955c-11ea-80e3-c3b0108a0a24.png" width="300" /><br />
                    <p>アプリのデフォルトの表示画面です。</p>

                    <h4>駅の情報を表示する</h4>

                    <p>地図をタップすると、その位置からチェックインできる駅の情報を表示します。</p>
                    <img alt="screen shot" src="https://user-images.githubusercontent.com/25225028/81813802-e33d4b00-9562-11ea-8cf2-33a1bb51cec1.png" width="300" /><br />

                    <h4>駅からレーダーでアクセスする</h4>

                    <p>駅情報のダイアログにおいて、<img width="24" alt="radar" src="https://user-images.githubusercontent.com/25225028/81815235-b5590600-9564-11ea-9ba1-a5f8e655a7df.png" />アイコンをクリックすると、その駅から近い順に一覧表示します。</p>
                    <img alt="screen shot" src="https://user-images.githubusercontent.com/25225028/81813926-0a941800-9563-11ea-95d8-51771d34b221.png" width="300" /><br />

                    <h4>任意の地点からレーダーでアクセスする</h4>

                    <p>選択したい地点を右クリック（スマホではロングタップ）すると、選択地点の最寄り駅に関するダイアログが開きます。そのダイアログの<img width="24" alt="radar" src="https://user-images.githubusercontent.com/25225028/81815235-b5590600-9564-11ea-9ba1-a5f8e655a7df.png" />アイコンをクリックします。</p>
                    <img alt="screen shot" src="https://user-images.githubusercontent.com/25225028/81814045-331c1200-9563-11ea-89dc-b9b7ba270e24.png" width="300" /><br />

                    <h4>駅へレーダでアクセスできる範囲を表示する</h4>

                    <p>対象の駅のダイアログにおいて、<img width="24" alt="voronoi" src="https://user-images.githubusercontent.com/25225028/81815691-40d29700-9565-11ea-810b-504c11d0826d.png" />アイコンをクリックするとアクセス範囲を表示します。内側から描画される各ポリゴンがレーダーで１,２,３...番目にアクセスできる範囲を表します。つまり一番外側の黒いポリゴンの内側なら、その駅までレーダーが届きます。</p>
                    <img alt="screen shot" src="https://user-images.githubusercontent.com/25225028/81814170-652d7400-9563-11ea-9c7c-07ecd69732ef.png" width="300" /><br />

                    <h4>路線情報の確認</h4>

                    <p>駅情報のダイアログでは、その駅が登録されている路線一覧が表示されます。その各項目をクリックすると路線情報のダイアログが開きます。</p>
                    <img alt="screen shot" src="https://user-images.githubusercontent.com/25225028/81814286-93ab4f00-9563-11ea-956b-9497e9b7eda4.png" height="240" />
                    <img alt="screen shot" src="https://user-images.githubusercontent.com/25225028/81814303-98700300-9563-11ea-88aa-6e8a2c4896cb.png" height="240" /><br />

                    <p>登録駅一覧に表示される各駅をクリックすると、その駅のダイアログが開きます。</p>

                    <h4>レスポンシブなデザイン</h4>

                    <p>PC、スマホ、タブレットなど環境の違いによる画面サイズに合わせ表示デザインを最適化します。</p>
                    <img alt="screen shot" src="https://user-images.githubusercontent.com/25225028/81814497-d40acd00-9563-11ea-9e4a-1a85a70a633b.png" height="180" />
                    <img alt="screen shot" src="https://user-images.githubusercontent.com/25225028/81814521-dbca7180-9563-11ea-8c8d-5367ba05e2ce.png" height="180" /><br />

                    <h2>開発環境</h2>
                    <div className="Tool-title">Google Maps API × React.js</div>
                    <img src={google_icon} alt="google" height="120"/>
                    <img src={react_icon} alt="react js" height="120"/><br/>


                    <p>アプリで使用している全ソースコード・データはGitHub上のリポジトリで公開しています。</p>
                    <img src={github_icon} alt="github" height="60"/>
                    <img src={github_logo} alt="github" height="60"/>

                    
                    <ul>
                        <li><a href="https://github.com/Seo-4d696b75/ekisagasu">Webアプリ本体</a></li>
                        <li><a href="https://github.com/Seo-4d696b75/station_database">駅・路線データ</a></li>
                    </ul>
                <hr />
                    <p>当ページは、株式会社モバイルファクトリー「ステーションメモリーズ！」の画像を利用しております。該当画像の転載・配布等は禁止しております。
                    <br />© Mobile Factory, Inc.</p>
                </div>
            </div>
        )
    }
}
