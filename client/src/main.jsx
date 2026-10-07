import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';
import 'swiper/css/free-mode';
import App from './App.jsx';
import { SessionProvider } from './session.jsx';
import { StoreInfoProvider } from './storeInfo.jsx';
import { ToastProvider } from './toast.jsx';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <StoreInfoProvider>
          <SessionProvider>
            <App />
          </SessionProvider>
        </StoreInfoProvider>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
