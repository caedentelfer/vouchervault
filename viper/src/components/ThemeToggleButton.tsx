// components/ThemeToggleButton.tsx
import { Brightness4, Brightness7 } from '@mui/icons-material';
import { IconButton, Tooltip } from '@mui/material';
import { useThemeToggle } from './CustomThemeProvider';

const ThemeToggleButton: React.FC = () => {
    const { toggleTheme, mode } = useThemeToggle();

    return (
        <Tooltip title="Toggle theme">
            <IconButton onClick={toggleTheme} color="inherit">
                {mode === 'light' ? <Brightness4 /> : <Brightness7 />}
            </IconButton>
        </Tooltip>
    );
};

export default ThemeToggleButton;
