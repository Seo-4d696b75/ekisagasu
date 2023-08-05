import { FC } from 'react';
import { Provider } from "react-redux";
import { HashRouter, Route } from 'react-router-dom';
import { store } from "../script/store";
import './App.css';
import Header from './header/Header';
import Help from './help/Help';
import Map from './map/Map';

const APP: FC = () => {
  return (
    <div className="App">
      <HashRouter basename='/'>
        <Route path='/'>
          <div>
            <Provider store={store}>
              <Header></Header>
              <Map></Map>
            </Provider>
          </div>
        </Route>
        <Route path='/help'>
          <Help></Help>
        </Route>
      </HashRouter>
    </div>
  )
}

export default APP
