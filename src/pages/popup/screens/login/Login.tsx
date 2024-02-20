import { env } from '@src/environments';
import { refreshVonageToken } from '@src/helper';
import { useEffect, useState } from 'react';
import ScaleLoader from 'react-spinners/ScaleLoader';
import { VscEye, VscEyeClosed } from 'react-icons/vsc';

interface Props {
  setView: (view: string) => void;
}

const Login = (props: Props) => {
  const { setView } = props;
  const [email, setEmail] = useState('vonage_developer@gmail.com');
  const [password, setPassword] = useState('S5@q\\H2@whD-cv');
  const [isLoading, setIsLoading] = useState(false);
  const [responseErrorMessage, setResponseErrorMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const workAfterSuccessLogin = async (data) => {
    await chrome.storage.local.set({ token: data.token, userEmail: '' });
    setView('dialer');
    setIsLoading(false);
    const res = await chrome.storage.local.get(['lastActiveTabInBrowser']);

    if (res?.lastActiveTabInBrowser) {
      chrome.tabs.sendMessage(res.lastActiveTabInBrowser, { loginSuccess: true });
    }

    // vonageLogin();
    // checkVonageTokenExpiration();
    // clearVonageAccessToken();
    refreshVonageToken();
  };

  const handleEmailChange = async (email: string) => {
    setEmail(email);
    await chrome.storage.local.set({ userEmail: email });
  };

  const handleLogin = async () => {
    if (!email || !password) {
      return;
    }

    setIsLoading(true);
    setResponseErrorMessage('');

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        password: password,
      }),
    };

    try {
      const res = await fetch(env.baseURL + '/login', options);
      const data = await res.json();

      if (data.success) {
        workAfterSuccessLogin(data);
      } else {
        setIsLoading(false);
        setResponseErrorMessage(data?.message);
      }
    } catch (error) {
      console.error(error.message);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const checkForSavedEmail = async () => {
      const res = await chrome.storage.local.get('userEmail');
      if (res?.userEmail) {
        setEmail(res.userEmail);
      }
    };

    checkForSavedEmail();
  }, []);

  const handleShowPassword = () => {
    setShowPassword((showPassword) => !showPassword);
  };

  return (
    <div className='login-container'>
      <h2>User Login</h2>
      <input
        type='email'
        className='login-input'
        placeholder='Email address'
        value={email}
        onChange={(event) => handleEmailChange(event.target.value)}
      />
      <div style={{ position: 'relative' }}>
        <input
          type={showPassword ? 'text' : 'password'}
          className='login-input'
          placeholder='Password'
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <button
          onClick={handleShowPassword}
          style={{
            position: 'absolute',
            right: '5px',
            top: '10px',
            background: 'transparent',
            border: 0,
            fontSize: '24px',
            cursor: 'pointer',
          }}
        >
          {showPassword ? <VscEye /> : <VscEyeClosed />}
        </button>
      </div>
      {responseErrorMessage && <p className='error-message'>{responseErrorMessage}</p>}
      {!isLoading && (
        <button className='login-buttons btn-primary' onClick={handleLogin} disabled={!email || !password}>
          Login
        </button>
      )}

      {isLoading && <ScaleLoader color='#3c1f6f' />}
      <p className='signup-text' onClick={() => setView('register')}>
        Don't have an account? <a href='#'>Sign up</a>
      </p>
    </div>
  );
};

export default Login;
