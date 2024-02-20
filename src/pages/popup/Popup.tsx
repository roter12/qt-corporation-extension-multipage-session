import '@pages/popup/Popup.css';
import { useEffect, useState } from 'react';
import Header from './components/Header';
import Dialer from './screens/dialer/Dialer';
import Login from './screens/login/Login';
import Register from './screens/register/Register';

const Popup = () => {
  const [view, setView] = useState('login');

  useEffect(() => {
    const checkToken = async () => {
      const res = await chrome.storage.local.get(['token']);
      if (res?.token) {
        setView('dialer');
      }
    };

    checkToken();
  }, []);

  return (
    <>
      <Header view={view} setView={setView} />
      {view === 'login' && <Login setView={setView} />}
      {view === 'register' && <Register setView={setView} />}
      {view === 'dialer' && <Dialer />}
    </>
  );
};

export default Popup;
