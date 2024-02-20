import logo from '@assets/img/favicon.png';
import logout from '@assets/img/logout.png';
import { useEffect, useState } from 'react';

interface Props {
  view: string;
  setView: (view: string) => void;
}

export default function Header(props: Props) {
  const { view, setView } = props;
  const [extensionLogo, setExtensionLogo] = useState(logo);
  const [extensionName, setExtensionName] = useState('QT Corporation');

  const handleLogout = async () => {
    const res = await chrome.storage.local.get(['lastActiveTabInBrowser', 'previousPopupWindowId']);
    await chrome.storage.local.clear();
    setView('login');

    if (res?.lastActiveTabInBrowser) {
      chrome.tabs.sendMessage(res.lastActiveTabInBrowser, { logout: true });
      chrome.storage.local.set({
        lastActiveTabInBrowser: res.lastActiveTabInBrowser,
        previousPopupWindowId: res?.previousPopupWindowId,
      });
    }
  };

  useEffect(() => {
    const getExtensionNameAndLogo = async () => {
      const res = await chrome.storage.local.get(['extensionLogo', 'extensionName']);

      if (res?.extensionLogo) {
        setExtensionLogo(res.extensionLogo);
      }

      if (res?.extensionName) {
        setExtensionName(res.extensionName);
      }
    };

    getExtensionNameAndLogo();
  }, []);

  return (
    <>
      <div className='bg-icon' style={{ backgroundImage: `url(${logo})` }}></div>
      <div className='header'>
        <div className='header-inner'>
          <img src={extensionLogo} alt='' className='icon' />
          <p className='title'>{extensionName}</p>
        </div>
        {view === 'dialer' && (
          <div className='user-side'>
            <span>Log out</span>

            <button title='Logout' onClick={handleLogout}>
              <img src={logout} alt='' className='icon' />
            </button>
          </div>
        )}
      </div>
    </>
  );
}
