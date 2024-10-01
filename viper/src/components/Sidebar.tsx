// components/Sidebar.tsx
import { Dashboard, ExitToApp, History, Receipt, Redeem } from '@mui/icons-material';
import { Divider, List, ListItem, ListItemIcon, ListItemText, Paper } from '@mui/material';
import { useRouter } from 'next/router';
import React from 'react';

interface SidebarProps {
    userType: 'issuer' | 'influencer' | 'manufacturer';
}

const Sidebar: React.FC<SidebarProps> = ({ userType }) => {
    const router = useRouter();

    const handleNavigation = (path: string) => {
        router.push(path);
    };

    const handleLogout = () => {
        // Perform any necessary logout logic here (e.g., clear tokens)
        router.push('/');
    };

    return (
        <Paper
            style={{
                width: 240,
                height: '100vh',
                position: 'fixed',
                top: 0,
                left: 0,
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <List>
                {userType === 'issuer' && (
                    <>
                        <ListItem button onClick={() => handleNavigation('/issuer/dashboard')}>
                            <ListItemIcon><Dashboard /></ListItemIcon>
                            <ListItemText primary="Dashboard" />
                        </ListItem>
                        <ListItem button onClick={() => handleNavigation('/issuer/vouchers')}>
                            <ListItemIcon><Receipt /></ListItemIcon>
                            <ListItemText primary="Vouchers" />
                        </ListItem>
                        <ListItem button onClick={() => handleNavigation('/issuer/history')}>
                            <ListItemIcon><Redeem /></ListItemIcon>
                            <ListItemText primary="History" />
                        </ListItem>
                        <ListItem button onClick={() => handleNavigation('/issuer/analytics')}>
                            <ListItemIcon><Dashboard /></ListItemIcon>
                            <ListItemText primary="Analytics" />
                        </ListItem>
                    </>
                )}

                {userType === 'influencer' && (
                    <>
                        <ListItem button onClick={() => handleNavigation('/influencer/dashboard')}>
                            <ListItemIcon><Dashboard /></ListItemIcon>
                            <ListItemText primary="Dashboard" />
                        </ListItem>
                        <ListItem button onClick={() => handleNavigation('/influencer/vouchers')}>
                            <ListItemIcon><Receipt /></ListItemIcon>
                            <ListItemText primary="Vouchers" />
                        </ListItem>
                        <ListItem button onClick={() => handleNavigation('/influencer/history')}>
                            <ListItemIcon><Redeem /></ListItemIcon>
                            <ListItemText primary="History" />
                        </ListItem>
                        <ListItem button onClick={() => handleNavigation('/influencer/tasks')}>
                            <ListItemIcon><Dashboard /></ListItemIcon>
                            <ListItemText primary="Tasks" />
                        </ListItem>
                    </>
                )}

                {userType === 'manufacturer' && (
                    <>
                        <ListItem button onClick={() => handleNavigation('/manufacturer/dashboard')}>
                            <ListItemIcon><Dashboard /></ListItemIcon>
                            <ListItemText primary="Dashboard" />
                        </ListItem>
                        <ListItem button onClick={() => handleNavigation('/manufacturer/wallet')}>
                            <ListItemIcon><Receipt /></ListItemIcon>
                            <ListItemText primary="Voucher Wallet" />
                        </ListItem>
                        <ListItem button onClick={() => handleNavigation('/manufacturer/history')}>
                            <ListItemIcon><History /></ListItemIcon>
                            <ListItemText primary="Recent Transactions" />
                        </ListItem>
                    </>
                )}

                <Divider style={{ margin: '1rem 0' }} />
                <ListItem button onClick={handleLogout}>
                    <ListItemIcon><ExitToApp /></ListItemIcon>
                    <ListItemText primary="Logout" />
                </ListItem>
            </List>
        </Paper>
    );
};

export default Sidebar;
