import { checkIfCssInjected, getSavedNumbers, injectCssToHideVonageContactpad, removeInjectedCss } from '@src/helper';
import PhoneData from '@src/interfaces/phoneData';
import UseStates from '@src/interfaces/useStates';
import VonageDialer from '@vgip/vonage-dialer-sdk';
import EventEmitter from 'events';
import { ChangeEvent, useEffect, useState } from 'react';
import { ScaleLoader } from 'react-spinners';
import { ToastContainer, toast } from 'react-toastify';
import { LiaTimesSolid } from 'react-icons/lia';
import 'react-toastify/dist/ReactToastify.css';

let TAB_ID: number = null;
const eventEmitter = new EventEmitter();

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  TAB_ID = tabs[0].id;
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.powerDialingStatsFromBackground) {
    eventEmitter.emit('statesReceivedFromBackground', message.powerDialingStatsFromBackground);
  }
});

const Dialer = () => {
  const [numbers, setNumbers] = useState<PhoneData[]>([]);
  const [powerDialing, setPowerDialing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentDialingNo, setCurrentDialingNo] = useState(currentIndex);
  const [callStatus, setCallStatus] = useState('Calling');
  const [delayIndex, setDelayIndex] = useState(currentIndex);
  const [tabId, setTabId] = useState(TAB_ID);
  const [showContactpad, setShowContactpad] = useState(true);
  const [loadingCurrentPagenumbers, setLoadingCurrentPagenumbers] = useState(false);
  const [disableCallBtn, setDisableCallBtn] = useState(false);
  const [hoverIndex, setHoverIndex] = useState(-1);

  const updateStates = (states: UseStates) => {
    if (states.callStatus !== undefined && states.callStatus !== null) {
      setCallStatus(states.callStatus);
    }

    if (states.currentDialingNo !== undefined && states.currentDialingNo !== null) {
      setCurrentDialingNo(states.currentDialingNo);
    }

    if (states.currentIndex !== undefined && states.currentIndex !== null) {
      setCurrentIndex(states.currentIndex);
    }

    if (states.delayIndex !== undefined && states.delayIndex !== null) {
      setDelayIndex(states.delayIndex);
    }

    if (states.powerDialing !== undefined && states.powerDialing !== null) {
      setPowerDialing(states.powerDialing);
    }

    if (states.tabId !== undefined && states.tabId !== null) {
      setTabId(states.tabId);
    }

    chrome.storage.local.set({ savedPreviousStates: states });
  };

  useEffect(() => {
    const port = chrome.runtime.connect({ name: 'popup' });
    port.postMessage('requesting-numbers');
    port.postMessage('requesting-states');

    port.onMessage.addListener((message) => {
      if (message.phoneNumbers) {
        const uniqueNumbers = Array.from(new Set(message.phoneNumbers.map((item) => item.phoneNumber))).map(
          (phoneNumber) => {
            return message.phoneNumbers.find((item) => item.phoneNumber === phoneNumber);
          }
        );

        setNumbers(uniqueNumbers);
      }

      if (message.powerDialingStates) {
        updateStates(message.powerDialingStates);
      }
    });

    return () => {
      port.disconnect();
    };
  }, []);

  useEffect(() => {
    const handleReceivedStates = (states: UseStates) => {
      updateStates(states);
    };

    eventEmitter.on('statesReceivedFromBackground', handleReceivedStates);

    return () => {
      eventEmitter.off('statesReceivedFromBackground', handleReceivedStates);
    };
  }, []);

  useEffect(() => {
    const getSavedPreviousStates = async () => {
      const res = await chrome.storage.local.get(['savedPreviousStates']);
      if (res?.savedPreviousStates) {
        if (res.savedPreviousStates?.tabId === TAB_ID) {
          updateStates(res.savedPreviousStates);
        }
      }
    };

    getSavedPreviousStates();
  }, []);

  useEffect(() => {
    const contactpadValueCheck = async () => {
      const res = await chrome.storage.local.get(['showContactpad']);

      if (res?.showContactpad) {
        const res = checkIfCssInjected(document.head);

        if (res) {
          removeInjectedCss(document.head);
        }

        setShowContactpad(true);
      } else {
        const res = checkIfCssInjected(document.head);

        if (!res) {
          injectCssToHideVonageContactpad(document);
        }

        setShowContactpad(false);
      }
    };

    contactpadValueCheck();
  }, []);

  const handleDialerCodeChange = (event: ChangeEvent<HTMLInputElement>, index: number) => {
    setNumbers((numbers) => {
      const updatedNumbers = [...numbers];
      updatedNumbers[index]['dialerCode'] = event.target.value;
      return updatedNumbers;
    });
  };

  const initiateCall = async (number: string, dialerCode: string) => {
    const { showContactpad } = await chrome.storage.local.get(['showContactpad']);

    if (showContactpad) {
      injectCssToHideVonageContactpad(document);
      setShowContactpad(false);
    }

    toast.promise(async () => await makeCall(dialerCode + '**' + number), {
      pending: `Calling: ${dialerCode + '**' + number}`,
      success: `Call placed to ${dialerCode + '**' + number}`,
      error: `Failed to place call ${dialerCode + '**' + number}`,
    });

    function makeCall(number: string) {
      return new Promise<void>((resolve, reject) => {
        const contact = {
          provider: 'acme',
          id: '123',
          type: 'contact',
          phoneNumber: number,
        };

        try {
          VonageDialer.placeCall(contact.phoneNumber, contact);
          setDisableCallBtn(true);
          resolve();
        } catch (error) {
          console.log('Error in placeCall', error);
          setDisableCallBtn(false);
          reject();
        }
      });
    }
  };

  const listCurrentPageNumbers = async () => {
    setLoadingCurrentPagenumbers(true);

    const res = await getSavedNumbers();

    setNumbers(res);
    setLoadingCurrentPagenumbers(false);
  };

  const initiatePowerDialing = async (numbers: PhoneData[]) => {
    if (!numbers.length) {
      return toast.warn('No number for power dialing');
    }

    const { showContactpad } = await chrome.storage.local.get(['showContactpad']);

    if (showContactpad) {
      injectCssToHideVonageContactpad(document);
      setShowContactpad(false);
    }

    setPowerDialing((powerDialing) => !powerDialing);
    const contact = {
      provider: 'acme',
      id: '123',
      type: 'contact',
      phoneNumber: numbers[currentIndex].dialerCode + '**' + numbers[currentIndex].cleanNumber,
    };

    try {
      VonageDialer.placeCall(contact.phoneNumber, contact);
    } catch (error) {
      console.log('Error in placeCall', error);
    }
  };

  const handleContactpadCheck = async () => {
    if (showContactpad) {
      const res = checkIfCssInjected(document.head);

      if (!res) {
        injectCssToHideVonageContactpad(document);
      }
    } else {
      const res = checkIfCssInjected(document.head);

      if (res) {
        removeInjectedCss(document.head);
      }
    }

    await chrome.storage.local.set({ showContactpad: !showContactpad });
    setShowContactpad((showContactpad) => !showContactpad);
  };

  const handleRemoveNumber = (index: number) => {
    const updatedNumbers = [...numbers];
    updatedNumbers.splice(index, 1);
    setNumbers(updatedNumbers);
  };

  // Vonage SDK
  VonageDialer.init({ provider: 'uc' }, (dialer) => {
    dialer.setOnDialerEvent((event) => {
      switch (event.type) {
        case 'CALL_START': {
          setCallStatus('Calling');
          setDelayIndex((delayIndex) => delayIndex + 1);
          setCurrentDialingNo((currentDialingNo) => currentDialingNo + 1);
          break;
        }
        case 'CALL_ANSWER': {
          setCallStatus('Connected');
          break;
        }
        case 'CALL_END': {
          if (powerDialing && currentIndex + 1 < numbers.length) {
            setCallStatus('Disconnected');
            const contact = {
              provider: 'acme',
              id: '123',
              type: 'contact',
              phoneNumber: numbers[currentIndex + 1].dialerCode + '**' + numbers[currentIndex + 1].cleanNumber,
            };

            try {
              VonageDialer.placeCall(contact.phoneNumber, contact);
            } catch (error) {
              console.log('Error in placeCall', error);
            }
            setCurrentIndex((currentIndex) => currentIndex + 1);
          } else {
            setPowerDialing(false);
            setCurrentIndex(0);
            setCurrentDialingNo(0);
            setDelayIndex(0);
            setDisableCallBtn(false);
          }
          break;
        }
        default: {
        }
      }
    });
  });

  return (
    <>
      <div className='body-wrapper'>
        <div className='d-flex align-items-center justify-content-between'>
          <div className='locate-phone d-flex align-items-center'>
            <span
              className='tool-tip'
              data-description='Click here to have the extension extract phone numbers found in the current web page'
            >
              i
            </span>
            {loadingCurrentPagenumbers ? (
              <ScaleLoader color='#3c1f6f' margin={10} height={18} width={4} />
            ) : (
              <button className='btn-primary d-flex locate-phone-numbers' onClick={listCurrentPageNumbers}>
                Locate Phone Numbers
              </button>
            )}
          </div>
        </div>
        <div className='action-wrapper justify-content-between'>
          <div className='d-flex align-items-center'>
            <span
              className='tool-tip'
              data-description='Check on Show Contactpad to show and hide the contactpad, and then you can login and logout there to make calls via Vonage.'
            >
              i
            </span>
            <button className='btn-primary d-flex btn-primary-white power_dialer_btn'>
              Contactpad
              {powerDialing && TAB_ID === tabId && (
                <span style={{ marginLeft: '4px' }}>
                  <strong>{currentDialingNo}</strong>/{numbers.length}
                </span>
              )}
            </button>
          </div>
          <div className='check-contactpad'>
            <input
              type='checkbox'
              id='scales'
              name='scales'
              onChange={handleContactpadCheck}
              checked={showContactpad}
            />
            <label htmlFor='scales'>Show Contactpad</label>
          </div>
        </div>
        {powerDialing && TAB_ID === tabId && (
          <div className='call-info'>
            <strong>{callStatus}</strong>: {numbers[delayIndex - 1]?.phoneNumber || 'Please wait'}
          </div>
        )}
        <div
          className='action-wrapper power-dialing'
          style={showContactpad ? { marginTop: '70px' } : { marginTop: '20px' }}
        >
          <span className='tool-tip' data-description='Call each number in the list one by one.'>
            i
          </span>
          <button className='btn-primary d-flex btn-primary-white power_dialer_btn'>
            Power Dialing
            {powerDialing && TAB_ID === tabId && (
              <span style={{ marginLeft: '4px' }}>
                <strong>{currentDialingNo}</strong>/{numbers.length}
              </span>
            )}
          </button>

          {!powerDialing || (powerDialing && TAB_ID === tabId) ? (
            <>
              <label className='active-class'>{powerDialing ? 'On' : 'Off'}</label>
              <input
                type='checkbox'
                title={powerDialing ? 'Turn off power dialing' : 'Turn on power dialing'}
                className='switchery-input'
                checked={powerDialing}
                onChange={() => initiatePowerDialing(numbers)}
              />
            </>
          ) : (
            <p className='dialer-message-exists'>Power dialling is already active in another tab.</p>
          )}
        </div>
        <div className='dialercode-heading d-flex align-items-center'>
          {numbers.length > 0 && (
            <>
              <div className='use-code-heading'>
                <p>Dialer code used</p>
              </div>
              <div className='use-code-heading-second'>
                <p>
                  <strong>{numbers.length}</strong> {numbers?.length === 1 ? 'number' : 'numbers'} found
                </p>
              </div>
            </>
          )}
        </div>
        {!numbers.length && <h4 className='list-title'>No number found</h4>}
        <ul className='number-list-wrapper' style={{ maxHeight: showContactpad ? '293px' : '343px' }}>
          {numbers.map((number, index) => {
            return (
              <li
                onMouseEnter={() => setHoverIndex(index)}
                onMouseLeave={() => setHoverIndex(-1)}
                className={`item ${
                  delayIndex - 1 === index && powerDialing && TAB_ID === tabId ? `${callStatus.toLowerCase()}` : ''
                }`}
              >
                <input
                  type='text'
                  className='number-input'
                  value={number?.dialerCode}
                  onChange={(event) => handleDialerCodeChange(event, index)}
                />
                <span className='number-text'>{number?.phoneNumber}</span>
                {/* <select name='' id='' className='country-code'>
                  <option value=''>{number?.stateCode}</option>
                </select> */}
                <span style={{ height: '10px', width: '10px', cursor: 'pointer', marginBottom: '8px' }} onClick={() => handleRemoveNumber(index)} title='Remove number'>
                  {hoverIndex === index ? <LiaTimesSolid /> : ''}
                </span>
                <button
                  className='btn-primary call-btn'
                  onClick={() => initiateCall(number.cleanNumber, number?.dialerCode)}
                  disabled={powerDialing || disableCallBtn}
                  title={`Call ${number.phoneNumber}`}
                >
                  Call
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <ToastContainer position='top-right' />
    </>
  );
};

export default Dialer;
