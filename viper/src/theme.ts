// theme.ts
import { common, grey, red } from '@mui/material/colors';
import { createTheme } from '@mui/material/styles';

export const lightTheme = createTheme({
    palette: {
        mode: 'light',
        primary: { main: red[500] },
        secondary: { main: grey[500] },
        background: { default: common.white, paper: common.white },
        text: { primary: common.black },
    },
});

export const darkTheme = createTheme({
    palette: {
        mode: 'dark',
        primary: { main: red[500] },
        secondary: { main: grey[500] },
        background: { default: common.black, paper: grey[900] },
        text: { primary: common.white },
    },
});
