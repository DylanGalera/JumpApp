import { StrictMode } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import * as ReactDOM from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { ChatBot } from './pages/ChatBot';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './componenets/ProtectedRoute';
import { ToastContainer } from 'react-toastify'
import { HubSpotAuth } from './pages/HubSpotAuth';

const GOOGLE_CLIENT_ID = "979532853398-33bmqdruapg9d8mlmhcn93ksds2n4bjm.apps.googleusercontent.com";

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement,
);

root.render(
  <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
    <ToastContainer />
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<ProtectedRoute />}>
            <Route index element={<ChatBot />} />
            <Route path='/hubSpotAuth' element={<HubSpotAuth />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </GoogleOAuthProvider>
);
