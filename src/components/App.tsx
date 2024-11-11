import { FC } from 'react';
import { Provider } from "react-redux";
import { HashRouter, Route, Routes } from 'react-router-dom';
import { store } from "../redux/store";
import './App.css';
import Header from './header/Header';
import Help from './help/Help';
import Map from './map/Map';

const APP: FC = () => {
  return (
    <HashRouter
      basename='/'
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}>
      <div className="App">
        <Routes>
          <Route path='/' element={<RootPage />} />
          <Route path='/help' element={<Help />} />
        </Routes>
      </div>
    </HashRouter>
  )
}

const RootPage: FC = () => {
  return (
    <div>
      <Provider store={store}>
        <Header></Header>
        <Map></Map>
      </Provider>
    </div>
  )
}

export default APP
