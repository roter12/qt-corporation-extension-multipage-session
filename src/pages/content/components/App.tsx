import { env } from '@src/environments';
import {
  changeBgColor,
  getDDCFromStorage,
  getStateListFromStorage,
  getTokenFromStorage,
  placeCallViaAPI,
  showLoginRequired,
} from '@src/helper';
import StateInfo from '@src/interfaces/stateInfo';
import axios from 'axios';
import { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { parseDOM } from './Parser';

// global variables
let STATES: StateInfo[] = null;
let DDC: string = null;
let PARSED_NUMBERS = [];

// Listen for page reload request
chrome.runtime.onMessage.addListener(async (message) => {
  if (message?.loginSuccess || message?.logout) {
    window.location.reload();
  }

  if (message?.tabChanged || message?.forceParse) {
    clearDOM();

    const token = await getTokenFromStorage();

    if (token) {
      PARSED_NUMBERS = [];
      parseDOM(document.body);
      chrome.storage.local.set({ savedNumbers: JSON.stringify(PARSED_NUMBERS) });
    }
  }
});

const clearDOM = () => {
  const numberElements = document.querySelectorAll('.DetectedNumber');

  numberElements.forEach((numberElement) => {
    const parent = numberElement.parentNode;
    parent.replaceChild(document.createTextNode(numberElement.textContent), numberElement);
  });
};

const fetchStatesData = async () => {
  const token = await getTokenFromStorage();

  if (!token) {
    return;
  }

  const options = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  };

  try {
    const res = await axios.get(env.baseURL + '/list-states', options);
    const data = res.data;

    if (data?.success) {
      STATES = data.state_list;
      await chrome.storage.local.set({ stateList: JSON.stringify(data.state_list) });
    }
  } catch (error) {
    if (error?.response?.data?.message === 'Unauthenticated.') {
      // Here user token is expired, so login is required.
      showLoginRequired(false);
    } else {
      if (!STATES) {
        STATES = await getStateListFromStorage();
      }
    }
  }
};

const fetchDefaultDialerCode = async () => {
  const token = await getTokenFromStorage();

  if (!token) {
    return;
  }

  const options = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  };

  try {
    const res = await axios.get(env.baseURL + '/default-dialer-code', options);
    const data = res.data;

    if (data?.success) {
      DDC = data.dialer_code;
      await chrome.storage.local.set({ ddc: data.dialer_code });
    }
  } catch (error) {
    if (error?.response?.data?.message === 'Unauthenticated.') {
      // Here user token is expired, so login is required.
      showLoginRequired(false);
    } else {
      if (!DDC) {
        DDC = await getDDCFromStorage();
      }
    }
  }
};

fetchStatesData();
fetchDefaultDialerCode();

export const TelInput = ({ telInput, label }) => {
  const processTelInput = (number: string) => {
    const numberWithOutCountryCode = number.replace('+1', '');

    for (let i = 0; i < STATES?.length; i++) {
      for (let j = 0; j < STATES[i].state_code?.length; j++) {
        if (numberWithOutCountryCode.startsWith(STATES[i].state_code[j].code)) {
          // chrome.runtime.sendMessage({
          //   phoneNumber: label,
          //   dialerCode: STATES[i].state_code[j].dialer_code || DDC,
          //   cleanNumber: numberWithOutCountryCode,
          // });
          PARSED_NUMBERS.push({
            phoneNumber: label,
            dialerCode: STATES[i].state_code[j].dialer_code || DDC,
            cleanNumber: numberWithOutCountryCode,
          });

          return (STATES[i].state_code[j].dialer_code || DDC) + '**' + numberWithOutCountryCode;
        }
      }
    }

    // If no match found, return telInput with default dialer code
    // chrome.runtime.sendMessage({ phoneNumber: label, dialerCode: DDC, cleanNumber: number });
    PARSED_NUMBERS.push({
      phoneNumber: label,
      dialerCode: DDC,
      cleanNumber: numberWithOutCountryCode,
    });
    return DDC + '**' + number;
  };

  const modifiedTelInput = processTelInput(telInput);

  // console.log('Here', modifiedTelInput);

  const initiateCall = async (number: string) => {
    // first change bg color of number that user can understand its clicked
    const targetElement = document.querySelector('[title="Call: ' + number + '"]');

    if (targetElement) {
      changeBgColor(targetElement, '#a5b4fc');
    }

    // then place the call
    await placeCallViaAPI(number, targetElement);
  };

  return (
    <div onClick={() => initiateCall(modifiedTelInput)} title={`Call: ${modifiedTelInput}`}>
      <span
        style={{
          display: 'inline-block',
          position: 'relative',
          cursor: 'pointer',
          padding: '3px 4px 1px',
          borderRadius: 8,
          whiteSpace: 'nowrap',
          border: '1px solid #ccc',
        }}
      >
        <svg
          style={{ width: '14px', height: '13px', marginRight: '2px' }}
          xmlns='http://www.w3.org/2000/svg'
          width='17'
          height='17'
          viewBox='0 0 24 24'
        >
          <path d='M20 22.621l-3.521-6.795c-.008.004-1.974.97-2.064 1.011-2.24 1.086-6.799-7.82-4.609-8.994l2.083-1.026-3.493-6.817-2.106 1.039c-7.202 3.755 4.233 25.982 11.6 22.615.121-.055 2.102-1.029 2.11-1.033z' />
        </svg>
        {label}
      </span>
    </div>
  );
};

const FalseComponent = () => {
  return <div id='my-injected-div'></div>;
};

export default function App() {
  // checking for states data
  function checkingStatesData() {
    let flag: boolean = false;

    const intervalInstance = setInterval(async () => {
      if (flag) {
        clearInterval(intervalInstance);
      }

      if (STATES?.length && DDC) {
        parseDOM(document.body);
        flag = true;
        chrome.storage.local.set({ savedNumbers: JSON.stringify(PARSED_NUMBERS) });
      }
    }, 500);
  }

  /* This is a dummy element we are injecting in dom to perform actions before user login, this dummy element does not effect the dom */
  const falseInject = () => {
    const container = document.createElement('div');
    container.id = 'qt-corporation-extension';
    document.body.appendChild(container);
    ReactDOM.render(<FalseComponent />, container);
  };

  useEffect(() => {
    falseInject();
    checkingStatesData();
  }, []);

  let timer: NodeJS.Timeout;

  const debouncedHandleInput = () => {
    clearTimeout(timer);

    timer = setTimeout(() => {
      parseDOM(document.body);
      chrome.storage.local.set({ savedNumbers: JSON.stringify(PARSED_NUMBERS) });
    }, 1000);
  };

  const handleDomChange = async () => {
    const token = await getTokenFromStorage();

    if (token && STATES && DDC) {
      debouncedHandleInput();
    }
  };

  // observing in dom: if there is any changes - handle it
  useEffect(() => {
    const observer = new MutationObserver(() => {
      handleDomChange();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
    };
  }, [STATES]);

  return <></>;
}

window.addEventListener('beforeunload', () => {
  chrome.runtime.sendMessage({ reloadDetected: true });
});
