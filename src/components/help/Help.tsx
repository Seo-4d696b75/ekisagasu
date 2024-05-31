import React from 'react';
import { Link } from "react-router-dom";
import github_icon from "../../img/GitHub-Mark.png";
import github_logo from "../../img/GitHub_Logo.png";
import google_icon from "../../img/googlemapjs.png";
import react_icon from "../../img/reactjs.jpg";
import './Help.css';

import screen_current from "../../img/screen_current.png";
import screen_default from "../../img/screen_default.png";
import screen_device from "../../img/screen_device.png";
import screen_extra from "../../img/screen_extra.png";
import screen_initial_permission from "../../img/screen_initial_permission.png";
import screen_line from "../../img/screen_line.png";
import screen_location from "../../img/screen_location.png";
import screen_manage_permission from "../../img/screen_manage_permission.png";
import screen_point from "../../img/screen_point.png";
import screen_polyline from "../../img/screen_polyline.png";
import screen_radar from "../../img/screen_radar.png";
import screen_search from "../../img/screen_search.png";
import screen_setting_pin from "../../img/screen_setting_pin.png";
import screen_setting_radar from "../../img/screen_setting_radar.png";
import screen_station from "../../img/screen_station.png";
import screen_voronoi from "../../img/screen_voronoi.png";

import ic_line from "../../img/ic_line.png";
import ic_mylocation from "../../img/ic_mylocation.png";
import ic_search from "../../img/ic_search.png";
import ic_setting from "../../img/ic_settings.png";
import ic_radar from "../../img/radar.png";
import ic_voronoi from "../../img/voronoi.png";

export default class Help extends React.Component {

  render() {
    return (
      <div className="help-container">
        <div className="header-container">

          <div className="App-title">駅サガース</div>
          <div className="Action-container">
            <Link to="/">
              <div className="Action-app">▶ Webアプリを使う！</div>
            </Link>
          </div>
        </div>
        <div className="content-container">
          <div className="content-align">


            <img className="image header" alt="app logo" src="https://user-images.githubusercontent.com/25225028/81793250-145a5300-9544-11ea-81fa-bee3a8ecc8ac.png" />


            <h1>「駅メモ！」<br />支援ツールサイト</h1>

            <h2>概要</h2>
            <img className="image screen" alt="ekimemo" src="https://user-images.githubusercontent.com/25225028/76631346-e7f67a80-6584-11ea-9f6b-5e8885887363.png" />

            <p><a href="https://ekimemo.com/">「駅メモ！」は全国の鉄道駅の座標位置を対象にしたスマートフォン向け位置ゲーム</a>です。ユーザーの現在地から最も近い駅へのチェックインが最も基本的な操作になります。しかし他の位置ゲームと異なり、プレイ画面上で現在位置が地図上に表示されない・現在位置からチェックイン or アイテムによりアクセスできる駅を簡単に確認する方法が少ないなど、快適なプレイが難しいのが現状です。</p>

            <p>このような動機より様々なツールアプリが有志によって開発されてきました。本Webアプリもチェックイン可能な駅を地図上に可視化する基本機能に加え、いくつかの便利な独自機能をサポートしています。</p>


            <h2>何が出来るの？</h2>

            <h4>地図上に可視化</h4>
            <p>チェックインできる駅の範囲を地図上に表示します。</p>

            <img className="image screen" alt="screen shot" src={screen_default} /><br />

            <h4>駅の情報を表示</h4>

            <p>地図をタップすると、その位置からチェックインできる駅の情報を表示します。</p>
            <img className="image screen" alt="screen shot" src={screen_station} /><br />

            <h4>駅からレーダーでアクセス</h4>

            <p>駅情報のダイアログにおいて<img className='icon' width="24" alt="radar" src={ic_radar} />アイコンをクリックすると、その駅から近い順に一覧表示します。</p>
            <img className="image screen" alt="screen shot" src={screen_radar} /><br />

            <h4>任意の地点からレーダー</h4>

            <p>選択したい地点を右クリック（スマホではロングタップ）すると、選択地点の最寄り駅に関するダイアログが開きます。<img className='icon' width="24" alt="radar" src={ic_radar} />アイコンをクリックすればレーダーでアクセスできる駅一覧を確認できます。</p>
            <img className="image screen" alt="screen shot" src={screen_point} /><br />

            <h4>レーダでアクセスできる範囲を表示</h4>

            <p>対象の駅のダイアログにおいて、<img className='icon' width="24" alt="voronoi" src={ic_voronoi} />アイコンをクリックするとアクセス範囲を表示します。内側から描画される各ポリゴンがレーダーで１,２,３...番目にアクセスできる範囲を表します。つまり一番外側の黒いポリゴンの内側なら、対象の駅までレーダーが届きます。</p>
            <img className="image screen" alt="screen shot" src={screen_voronoi} /><br />

            <h4>路線情報の確認</h4>

            <p>駅情報のダイアログでは駅が登録されている路線一覧を確認できます。各路線をクリックすると路線情報のダイアログが開きます。路線ダイアログでは登録駅一覧を確認でき、各駅をクリックすると駅ダイアログが開きます。</p>

            <img className="image screen" alt="screen shot" src={screen_line} />


            <h4>路線を地図上に表示</h4>

            <p>路線情報のダイアログにおいて<img className='icon' width="24" alt="polyline" src={ic_line}></img>アイコンをクリックすると、路線のポイラインを地図上に表示できます。</p>
            <img className="image screen" alt="screen shot" src={screen_polyline} />

            <h4>駅・路線を検索</h4>

            <p>ヘッダーの<img className='icon header' width="24" alt="search" src={ic_search}></img>アイコンをクリックすると検索バーが開きます（駅名の末尾に付与された重複防止用の都道府県・鉄道会社名は検索にヒットしません）。</p>
            <img className="image screen" alt="screen shot" src={screen_search} />

            <h4>現在位置への移動</h4>

            <p>右下の<img className='icon header' width="24" alt="search" src={ic_mylocation}></img>アイコンをクリックすると現在位置に移動できます。「現在位置の表示」の設定がOnになっている場合は現在位置が変化すると自動で追従します。</p>
            <img className="image screen" alt="screen shot" src={screen_location} />

            <br/>

            <details>
              <summary><b>位置情報の権限に関して</b></summary>

            <p>初回の場合は位置情報の権限を求めるダイアログが表示されるので、「許可する」を選択してください（ブラウザによって権限ダイアログの外観は異なります）。</p>
            <img className="image screen" alt="screen shot" src={screen_initial_permission} />

            <p>現在位置を取得できず権限ダイアログも表示されない場合は、サイトの権限設定を確認してください。Chromeの場合はアドレスバーの現在位置アイコンから確認できます（ブラウザによって確認方法が異なります）。</p>
            <img className="image screen" alt="screen shot" src={screen_manage_permission} />

            </details>

            <h2>アプリの設定</h2>

            <p>ヘッダーの<img className='icon header' width="24" alt="search" src={ic_setting}></img>アイコンから設定モーダルを開くと、各種設定値を変更できます。</p>

            <h4>レーダー検知数の変更</h4>

            <p>駅・選択地点からのレーダー駅一覧、レーダーによる対象駅へのアクセス範囲に影響します。新駅イベントのレーダー検知数アップなどに合わせて活用してください。</p>
            <img className="image screen" alt="screen shot" src={screen_setting_radar} />

            <h4>現在位置の表示</h4>

            <p>「現在位置の表示」をOnにすると現在位置のピンが地図上に表示されます。</p>
            <img className="image screen" alt="screen shot" src={screen_current} />

            <h4>ピンの非表示</h4>

            <p>低倍率で広範囲を表示するとき、駅のピンが邪魔な場合は「地図上で駅の座標にピンを表示」をOffにできます。</p>
            <img className="image screen" alt="screen shot" src={screen_setting_pin} />

            <h4>廃駅の表示</h4>

            <p>「extraデータを表示」をOnにすると駅メモ以外の廃駅も表示できます（追加された廃駅は灰色のアイコンで表示されます）。</p>
            <img className="image screen" alt="screen shot" src={screen_extra} />


            <h2>レスポンシブなデザイン</h2>

            <p>PC、スマホ、タブレットなど環境の違いによる画面サイズに合わせ表示デザインを最適化します。</p>
            <img className="image screen" alt="screen shot" src={screen_device} />


            <h2>開発環境</h2>
            <div className="Tool-title">Google Maps API × React.js</div>
            <img src={google_icon} alt="google" height="100" />
            <img src={react_icon} alt="react js" height="100" /><br />


            <p>アプリで使用している全ソースコード・データはGitHub上のリポジトリで公開しています。</p>
            <img src={github_icon} alt="github" height="60" />
            <img src={github_logo} alt="github" height="60" />


            <ul>
              <li><a href="https://github.com/Seo-4d696b75/ekisagasu">Webアプリ本体</a></li>
              <li><a href="https://github.com/Seo-4d696b75/station_database">駅・路線データ</a></li>
            </ul>
            <hr />
            <p>当ページは、株式会社モバイルファクトリー「ステーションメモリーズ！」の画像を利用しております。該当画像の転載・配布等は禁止しております。
              <br />© Mobile Factory, Inc.</p>
          </div>

        </div>
      </div>
    )
  }
}
