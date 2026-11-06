import { useEffect, useState } from 'react';

/**
 * True while the page is being scrolled down, false again as soon as it scrolls up (or is near the top), for a bar
 * that gets out of the way while reading. Small jitters (under threshold px) are ignored; within offset px of the
 * top the bar always shows. Reads the scroll position at most once per frame.
 */
const useHideOnScroll = ({ threshold = 8, offset = 80 } = {}) => {
    const [hidden, setHidden] = useState(false);

    useEffect(() => {
        let last = Math.max(0, window.scrollY);
        let frame = null;
        const update = () => {
            frame = null;
            const y = Math.max(0, window.scrollY); // iOS bounces below 0
            const delta = y - last;
            if (y < offset) {
                setHidden(false);
                last = y;
            } else if (Math.abs(delta) >= threshold) {
                setHidden(delta > 0);
                last = y;
            }
        };
        const onScroll = () => {
            if (frame === null) frame = window.requestAnimationFrame(update);
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => {
            window.removeEventListener('scroll', onScroll);
            if (frame !== null) window.cancelAnimationFrame(frame);
        };
    }, [threshold, offset]);

    return [hidden, setHidden];
};

export default useHideOnScroll;
