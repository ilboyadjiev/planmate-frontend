import React from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import 'dayjs/locale/en-gb'; // Sets Monday as the first day of the week

const darkTheme = createTheme({
    palette: {
        mode: 'dark',
        primary: { main: '#F06A25' },
        secondary: { main: '#4F46E5' },
        background: {
            paper: '#161B2B',
            default: '#0B0F19'
        },
        text: {
            primary: '#F3F4F6',
            secondary: '#9CA3AF'
        }
    },
    components: {
        MuiMultiSectionDigitalClockSection: {
            styleOverrides: {
                root: {
                    '&::-webkit-scrollbar': { display: 'none' },
                    scrollbarWidth: 'none',
                }
            }
        }
    }
});

const ThemeWrapper = ({ children }) => {
    return (
        <ThemeProvider theme={darkTheme}>
            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="en-gb">
                {children}
            </LocalizationProvider>
        </ThemeProvider>
    );
};

export default ThemeWrapper;