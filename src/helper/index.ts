import { env } from '@src/environments';
import PhoneData from '@src/interfaces/phoneData';
import StateInfo from '@src/interfaces/stateInfo';
import UseStates from '@src/interfaces/useStates';
import axios from 'axios';

const CALL_STATUS_COLOR = {
  INITIALIZING: '#fcd34d', // Yellow
  RINGING: '#fcd34d', // Yellow
  ANSWERED: '#4ade80', // Green
  ACTIVE: '#4ade80', // Green
  CANCELLED: '#f87171', // Red
  REJECTED: '#f87171', // Red
  MISSED: '#f87171', // Red
  END: '#f87171', // Red
};

export async function getTokenFromStorage(): Promise<string> {
  const res = await chrome.storage.local.get(['token']);

  if (res?.token) {
    return res.token;
  } else {
    return null;
  }
}

// TODO: (may required in future)
export function rgbToHex(rgbColor) {
  const rgbValues = rgbColor.match(/\d+/g);
  const r = parseInt(rgbValues[0]);
  const g = parseInt(rgbValues[1]);
  const b = parseInt(rgbValues[2]);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export async function refreshVonageToken() {
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
    const res = await axios.post(env.baseURL + '/refresh-token', {}, options);
    const data = res.data;

    if (data.success) {
      console.log('Vonage token refresh is successful.', data);
      chrome.storage.local.set({
        vonageAccessToken: data.data.access_token,
        vonageRefreshToken: data.data.refresh_token,
        vonageTokenId: data.data.id_token,
        vonageTokenExpireIn: data.data.expires_in,
      });
    } else {
      console.log('Error in refreshing the Vonage token');
    }
  } catch (error) {
    console.log('Error in refreshing the Vonage token', error);
    vonageLogin();
  }
}

export async function vonageLogin() {
  const formData = new FormData();
  const token = await getTokenFromStorage();

  formData.append('username', env.vonageId);
  formData.append('password', env.vonagePassword);

  const options = {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  };

  try {
    const res = await fetch(env.baseURL + '/obtain-token', options);
    const data = await res.json();

    if (data?.success) {
      console.log('Vonage login success', data);

      chrome.storage.local.set({
        vonageAccessToken: data.data.access_token,
        vonageRefreshToken: data.data.refresh_token,
        vonageTokenId: data.data.id_token,
        vonageTokenExpireIn: data.data.expires_in,
      });
    }
  } catch (error) {
    console.log('Error in vonage login!');
  }
}

export async function showLoginRequired(flag: boolean) {
  chrome.storage.local.set({ token: null });

  if (flag) {
    window.alert('Token expired, Please login again in extension');
  }
}

export async function getStateListFromStorage(): Promise<StateInfo[]> {
  const res = await chrome.storage.local.get(['stateList']);

  if (res?.stateList) {
    return JSON.parse(res.stateList);
  } else {
    return null;
  }
}

export async function getDDCFromStorage(): Promise<string> {
  const res = await chrome.storage.local.get(['ddc']);

  if (res?.ddc) {
    return res.ddc;
  } else {
    return null;
  }
}

export async function getSavedNumbers(): Promise<PhoneData[]> {
  const numbers = await chrome.storage.local.get(['savedNumbers']);

  if (numbers?.savedNumbers?.length) {
    return JSON.parse(numbers.savedNumbers);
  } else {
    return [];
  }
}

export async function getPowerDialingStates(): Promise<UseStates> {
  const res = await chrome.storage.local.get(['powerDialingStates']);

  if (res?.powerDialingStates) {
    return res.powerDialingStates;
  } else {
    return null;
  }
}

export async function getExtensionIcon() {
  const token = await getTokenFromStorage();

  if (!token) {
    return;
  }

  const options = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  };

  try {
    const res = await fetch(env.baseURL + '/org-photo', options);
    const data = await res.json();

    if (data?.photo) {
      chrome.action.setIcon({ path: data.photo });
    }

    if (data?.icon) {
      chrome.storage.local.set({ extensionLogo: data.icon });
    }

    if (data?.name) {
      chrome.storage.local.set({ extensionName: data.name });
    }
  } catch (error) {
    console.log('Error', error);
  }
}

export function checkIfCssInjected(headElement: HTMLHeadElement): boolean {
  const styleElements = headElement.querySelectorAll('style');
  let cssFound: boolean = false;

  styleElements?.forEach((styleElement) => {
    const textContentWithoutSpaces = styleElement.textContent.replace(/\s+/g, '');

    if (textContentWithoutSpaces === env.cssRuleToCheck) {
      cssFound = true;
    }
  });

  return cssFound;
}

export function removeInjectedCss(headElement: HTMLHeadElement) {
  const styleElements = headElement.querySelectorAll('style');

  styleElements?.forEach((styleElement) => {
    const textContentWithoutSpaces = styleElement.textContent.replace(/\s+/g, '');

    if (textContentWithoutSpaces === env.cssRuleToCheck) {
      styleElement.remove();
    }
  });
}

export function injectCssToHideVonageContactpad(document: Document) {
  const styleElement = document.createElement('style');
  const cssRule = 'button.vgip-button { display: none; }';
  styleElement.innerHTML = cssRule;
  document.head.appendChild(styleElement);
}

export function changeBgColor(element, color: string) {
  element.firstChild.style.backgroundColor = color;

  if (color === '#f87171') {
    setTimeout(() => {
      element.firstChild.style.backgroundColor = '#9ca3af';
    }, 2_000);
  }
}

async function getVonageAccessTokenFromStorage(): Promise<string> {
  const res = await chrome.storage.local.get(['vonageAccessToken']);

  if (res?.vonageAccessToken) {
    return res.vonageAccessToken;
  } else {
    return null;
  }
}

export async function getActiveCallId(): Promise<string> {
  const token = await getVonageAccessTokenFromStorage();

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
    const res = await axios.get(env.vonageApi + '/v1/self/calls', options);

    if (res.data?.length) {
      return res.data[0].id;
    }
  } catch (error) {
    console.log('Error', error);
    return null;
  }
}

export async function checkingActiveCallStatus(callId: string): Promise<string> {
  const token = await getVonageAccessTokenFromStorage();

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
    const res = await axios.get(`${env.vonageApi}/v1/self/calls/${callId}`, options);
    const data = res.data;

    if (data?.state) {
      return data.state;
    }
  } catch (error) {
    if (error?.response?.data?.message === 'An active call for the id does not exist.') {
      return 'END';
    }

    return null;
  }
}

export async function placeCallViaAPI(number: string, element: Element) {
  const token = await getVonageAccessTokenFromStorage();

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
    const res = await axios.post(env.vonageApi + '/v1/self/calls', { phoneNumber: number }, options);

    if (res.data?.state === 'RINGING') {
      changeBgColor(element, CALL_STATUS_COLOR[res.data.state] || '');

      const activeCallId = await getActiveCallId();
      autoAnswer(activeCallId);

      if (activeCallId) {
        let previousCallStatus: string;

        const intervalInstance = setInterval(async () => {
          if (previousCallStatus === 'END') {
            clearInterval(intervalInstance);
          }

          const currentCallStatus = await checkingActiveCallStatus(activeCallId);

          if (currentCallStatus && previousCallStatus !== currentCallStatus) {
            changeBgColor(element, CALL_STATUS_COLOR[currentCallStatus] || '');
          }

          previousCallStatus = currentCallStatus;
        }, 2_000);
      }
    }
  } catch (error) {
    console.log('Error in Place call', error);
    changeBgColor(element, '#fff');
    // refreshVonageToken();
  }
}

export async function autoAnswer(callId) {
  const token = await getVonageAccessTokenFromStorage();

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
    const res = await axios.put(`${env.vonageApi}/v1/self/calls/${callId}/answer`, {}, options);

    console.log('Auto answer call', res.data);
  } catch (error) {
    console.log('Error in auto answer call');
  }
}
