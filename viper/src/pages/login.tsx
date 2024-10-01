// pages/login.tsx
import { Box, Button, Container, Paper, TextField, Typography } from '@mui/material';
import { useRouter } from 'next/router';
import React, { useState } from 'react';

const Login: React.FC = () => {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleEmailLogin = () => {
        // Implement traditional login logic here
        // Example: Authenticate user and then redirect to user type selection
        router.push('/user-type');
    };

    const handleSolanaLogin = () => {
        // Implement Solana wallet login logic here
        // Example: Authenticate user and then redirect to user type selection
        router.push('/user-type');
    };

    return (
        <Container component="main" maxWidth="xs">
            <Paper elevation={3} style={{ padding: '2rem', marginTop: '2rem' }}>
                <Typography variant="h5" align="center">
                    Login
                </Typography>
                <Box mt={2}>
                    <Button
                        variant="contained"
                        color="primary"
                        fullWidth
                        onClick={handleSolanaLogin}
                        style={{ marginBottom: '1rem' }}
                    >
                        Login with Solana Wallet
                    </Button>
                    <Typography variant="h6" align="center" gutterBottom>
                        OR
                    </Typography>
                    <TextField
                        variant="outlined"
                        margin="normal"
                        required
                        fullWidth
                        label="Email Address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        autoFocus
                    />
                    <TextField
                        variant="outlined"
                        margin="normal"
                        required
                        fullWidth
                        label="Password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                    />
                    <Button
                        variant="contained"
                        color="primary"
                        fullWidth
                        onClick={handleEmailLogin}
                    >
                        Login with Email
                    </Button>
                </Box>
            </Paper>
        </Container>
    );
};

export default Login;
