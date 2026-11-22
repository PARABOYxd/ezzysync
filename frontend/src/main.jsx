import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './hooks/useAuth.jsx';
import { ToastProvider } from './hooks/useToast.jsx';
import consumeImpersonationHandoff from './utils/impersonationHandoff.js';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));

consumeImpersonationHandoff().finally(() => root.render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <ToastProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>
));
