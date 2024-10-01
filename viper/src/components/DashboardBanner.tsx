import React from 'react';
import { Typography } from '@mui/material';

interface DashboardBannerProps {
    heading: string;
}

const getGradient = (heading: string): string => {
    switch (heading) {
        case 'Influencer':
            return 'linear-gradient(to right, #004d40, #00796b, #004d40, #66bb6a, #a5d6a7)';
        case 'Manufacturer':
            return 'linear-gradient(to right, #6a1b29, #c2185b, #d81b60, #f48fb1)';
        case 'Issuer':
            return 'linear-gradient(to right, #003c8c, #1976d2, #64b5f6, #bbdefb)';
        default:
            return 'linear-gradient(to right, #004d40, #00796b, #004d40, #66bb6a, #a5d6a7)'; // Default green gradient
    }
};

const DashboardBanner: React.FC<DashboardBannerProps> = ({ heading }) => {
    return (
        <div style={{ ...bannerStyle, backgroundImage: getGradient(heading) }}>
            <Typography variant="h4" component="h1" style={headingStyle}>
                {heading} Dashboard
            </Typography>
        </div>
    );
};

const bannerStyle: React.CSSProperties = {
    maxWidth: '1500px',
    width: '1100px',
    height: '80px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    margin: '0 auto',
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    padding: '0 2rem',
    boxSizing: 'border-box',
    borderRadius: '8px',
};

const headingStyle: React.CSSProperties = {
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#fff',
};

export default DashboardBanner;
