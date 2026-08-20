'use client';

import { useState, useRef } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { styled } from '@mui/material/styles';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '../../src/hooks/useAuth';
import { setAuthToken } from '../actions/set-auth-cookie';
import { Suspense } from 'react';

const CenteredBox = styled('div')(({ theme }) => ({
  textAlign: 'center',
  marginBottom: theme.spacing(3),
}));

function LoginPageContent() {
  const nickRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';
  const { login } = useAuth();

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    // Get values from refs (uncontrolled inputs)
    const usernameValue = nickRef.current?.value || '';
    const passwordValue = passwordRef.current?.value || '';

    setError(null);

    if (!usernameValue.trim() || !passwordValue.trim()) {
      setError('Please enter both username and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await login(usernameValue, passwordValue);
      if (res.data?.access_token) {
        // Set auth cookie via server action
        const result = await setAuthToken(res.data.access_token);
        
        if (!result.success) {
          setError('Failed to set authentication token.');
          return;
        }
        
        // Use window.location.href for reliable redirect after setting cookie
        window.location.href = redirect;
      } else {
        setError('Login failed — no access token returned.');
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string }; status?: number } };
      if (axiosErr.response?.status === 401 || axiosErr.response?.status === 422) {
        setError(axiosErr.response.data?.detail || 'Invalid credentials.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const isButtonDisabled = loading;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <Card sx={{ width: '100%', maxWidth: 420, p: 4, boxShadow: 8 }}>
        <CenteredBox>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary' }}>dna2bpm</Typography>
          <Typography variant="body2" color="text.secondary">Sign in to your account</Typography>
        </CenteredBox>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>
        )}

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            inputRef={nickRef}
            margin="normal"
            autoFocus
            disabled={loading}
            required
            placeholder="Enter your username"
          />
          <TextField
            fullWidth
            type={(passwordRef.current?.value ?? '').length > 0 ? 'text' : 'password'}
            inputRef={passwordRef}
            margin="normal"
            disabled={loading}
            required
            placeholder="Enter your password"
          />

          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={handleSubmit}
            sx={{
              mt: 2,
              mb: 1,
              pointerEvents: isButtonDisabled ? 'none' : 'auto',
              opacity: isButtonDisabled ? 0.7 : 1,
              '&.Mui-disabled': { pointerEvents: 'none', opacity: 0.7 }
            }}
            disabled={isButtonDisabled}
          >
            {loading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              'Sign In'
            )}
          </Button>
        </form>
      </Card>
    </Box>
  );
}
export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginPageContent />
    </Suspense>
  );
}
