import { env } from '@src/environments';
import { ChangeEvent, useState } from 'react';
import { ScaleLoader } from 'react-spinners';

interface Props {
  setView: (view: string) => void;
}
const Register = (props: Props) => {
  const { setView } = props;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [responseError, setResponseError] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  function collectErrorMessages(obj) {
    const errorMessages = [];

    for (const key in obj) {
      if (Array.isArray(obj[key])) {
        errorMessages.push(...obj[key]);
      } else if (typeof obj[key] === 'object') {
        const nestedMessages = collectErrorMessages(obj[key]);
        errorMessages.push(...nestedMessages);
      }
    }

    return errorMessages;
  }

  async function handleSignup() {
    if (!name || !email || !password) {
      return;
    }

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: name,
        email: email,
        password: password,
      }),
    };

    try {
      setIsLoading(true);

      const res = await fetch(env.baseURL + '/register', options);
      const data = await res.json();
      console.log(data);

      if (data.success) {
        // handle if succes
      } else {
        // handle if not success
        setIsLoading(false);
        const errorMessages = collectErrorMessages(data);
        setResponseError(errorMessages);
      }
    } catch (error) {
      console.log(error);
      // handle if there is any error
      setIsLoading(false);
    }
  }

  const matchPasswords = (event: ChangeEvent<HTMLInputElement>) => {
    const confirmedPassword = event.target.value;
    setConfirmPassword(confirmedPassword);

    if (password === confirmedPassword) {
      setErrorMessage('');
    } else {
      setErrorMessage('Passwords do not match');
    }
  };

  const disable = !name || !email || !password || !confirmPassword || Boolean(errorMessage);

  return (
    <div className='signup-container'>
      <h2>Create account</h2>
      <input
        type='text'
        className='signup-input'
        placeholder='Name'
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <input
        type='email'
        className='signup-input'
        placeholder='Email address'
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <input
        type='password'
        className='signup-input'
        placeholder='Password'
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <input
        type='password'
        className='signup-input'
        placeholder='Confirm Password'
        onChange={(event) => matchPasswords(event)}
      />
      {errorMessage && <p className='error-message'>{errorMessage}</p>}
      {responseError.length > 0 && responseError.map((error) => <p className='error-message'>{error}</p>)}
      {!isLoading && (
        <button className='signup-button btn-primary' onClick={handleSignup} disabled={disable}>
          Sign Up
        </button>
      )}
      {isLoading && <ScaleLoader color='#3c1f6f' />}
      <p className='login-link' onClick={() => setView('login')}>
        Already have an account? <a href='#'>Login</a>
      </p>
    </div>
  );
};

export default Register;
