import { getExtensionIcon, getPowerDialingStates, getSavedNumbers } from '@src/helper';
import reloadOnUpdate from 'virtual:reload-on-update-in-background-script';

reloadOnUpdate('pages/background');

/**
 * Extension reloading is necessary because the browser automatically caches the css.
 * If you do not use the css of the content script, please delete it.
 */
reloadOnUpdate('pages/content/style.scss');

let storedNumbers = [];
let pendingUrl = '';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.tab && message.reloadDetected) {
    storedNumbers = [];
  }

  if (sender.tab && message.powerDialingStats) {
    chrome.runtime.sendMessage({ powerDialingStatsFromBackground: message.powerDialingStats });
    chrome.storage.local.set({ powerDialingStates: message.powerDialingStats });
  }

  if (sender.tab && message.phoneNumber) {
    // storedNumbers.push(message);
    // chrome.storage.local.set({ savedNumbers: JSON.stringify(storedNumbers) });
  }

  if (message.action === 'getActiveTab') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        const activeTab = tabs[0];
        sendResponse(activeTab);
      } else {
        sendResponse(null);
      }
    });

    return true;
  }
});

chrome.runtime.onConnect.addListener(async (port) => {
  if (port.name === 'popup') {
    port.onMessage.addListener(async (message) => {
      if (message === 'requesting-numbers') {
        if (storedNumbers?.length) {
          port.postMessage({ phoneNumbers: storedNumbers });
        } else {
          const phoneNumbers = await getSavedNumbers();
          port.postMessage({ phoneNumbers: phoneNumbers });
        }
      }

      if (message === 'requesting-states') {
        const res = await getPowerDialingStates();
        port.postMessage({ powerDialingStates: res });
      }
    });
  }
});

// chrome.tabs.onActivated.addListener(async (activeInfo) => {
//   if (!pendingUrl) {
//     storedNumbers = [];
//     await chrome.storage.local.set({ savedNumbers: null });
//     await chrome.tabs.sendMessage(activeInfo.tabId, { tabChanged: true });
//   }

//   pendingUrl = '';
// });

// To handle popup open-close in website like - signin popup or continue with google
// chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
//   chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
//     chrome.tabs.sendMessage(tabs?.[0]?.id, { tabChanged: true });
//   });
// });

chrome.tabs.onCreated.addListener((tab) => {
  pendingUrl = tab.pendingUrl;
});

chrome.action.onClicked.addListener(async (tab) => {
  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    if (tabs.length > 0) {
      await chrome.storage.local.set({ lastActiveTabInBrowser: tabs[0].id });
      await chrome.storage.local.set({savedNumbers: ''})
      await chrome.tabs.sendMessage(tabs[0].id, { forceParse: true })
    }
  });

  const { previousPopupWindowId } = await chrome.storage.local.get(['previousPopupWindowId']);

  if (previousPopupWindowId) {
    try {
      await chrome.windows.remove(previousPopupWindowId);
    } catch (error) {
      console.log(error);
    }
  }

  // if not, create one
  type createTypeEnum = 'normal' | 'popup' | 'panel';

  // configs to place popup window at right-bottom of display
  const screenInfo = await chrome.system.display.getInfo();
  const screenWidth = screenInfo[0].bounds.width;
  const screenHeight = screenInfo[0].bounds.height;

  const createData = {
    url: chrome.runtime.getURL('src/pages/popup/index.html'),
    type: 'popup' as createTypeEnum,
    focused: true,
    width: 380,
    height: 650,
    left: screenWidth - 380,
    top: screenHeight - 650,
  };

  chrome.windows.create(createData, async (window) => {
    await chrome.storage.local.set({ previousPopupWindowId: window.id });
  });
});

// handle if user manually close the popup
chrome.windows.onRemoved.addListener(async (closedWindowId) => {
  const { previousPopupWindowId } = await chrome.storage.local.get(['previousPopupWindowId']);

  if (previousPopupWindowId && closedWindowId === previousPopupWindowId) {
    await chrome.storage.local.set({ previousPopupWindowId: null });
  }
});

getExtensionIcon();
