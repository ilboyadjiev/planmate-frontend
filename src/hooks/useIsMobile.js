import { useEffect, useState } from 'react';

/** Phones and small tablets: same breakpoint as the bottom tab bar and the dashboard layout. */
export const MOBILE_QUERY = '(max-width: 900px)';

const matches = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(MOBILE_QUERY).matches : false);

const useIsMobile = () => {
    const [isMobile, setIsMobile] = useState(matches);
    useEffect(() => {
        if (!window.matchMedia) return undefined;
        const media = window.matchMedia(MOBILE_QUERY);
        const onChange = () => setIsMobile(media.matches);
        // Safari before 14 only has the older addListener API
        if (media.addEventListener) media.addEventListener('change', onChange); else media.addListener(onChange);
        return () => (media.removeEventListener ? media.removeEventListener('change', onChange) : media.removeListener(onChange));
    }, []);
    return isMobile;
};

export default useIsMobile;
