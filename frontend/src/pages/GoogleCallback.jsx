import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { useToast } from '../hooks/useToast.jsx';

export default function GoogleCallback() {
  const { loginWithToken } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      toast.error('Google login failed. No token returned.');
      navigate('/login');
      return;
    }

    loginWithToken(token)
      .then(() => {
        toast.success('Successfully logged in with Google!');
        navigate('/dashboard');
      })
      .catch((err) => {
        console.error(err);
        toast.error('Session verification failed.');
        navigate('/login');
      });
  }, [loginWithToken, navigate, searchParams, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto"></div>
        <p className="text-slate-600 font-medium">Completing secure Google login...</p>
      </div>
    </div>
  );
}
