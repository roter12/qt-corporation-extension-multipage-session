import { createRoot } from 'react-dom/client';
import App from './App';
import refreshOnUpdate from 'virtual:reload-on-update-in-view';

refreshOnUpdate('pages/content');

const root = document.createElement('div');
root.id = 'qt-corporation-content-view-root';
document.body.append(root);

createRoot(root).render(<App />);
