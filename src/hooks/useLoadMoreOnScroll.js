import { useEffect, useRef } from 'react';

/**
 * Infinite scrolling: calls onLoadMore when the element the returned ref is put on comes near the screen (within
 * rootMargin), while enabled. Put it on the "Show more" button's place under a list: the button stays as the way to
 * load more without scrolling (keyboard, browsers without IntersectionObserver).
 *
 * Turn enabled off while a page is loading; when it turns on again and the place is still in view (a short page),
 * the next page loads right away.
 */
const useLoadMoreOnScroll = (onLoadMore, enabled, { rootMargin = '600px 0px' } = {}) => {
    const ref = useRef(null);
    const latest = useRef(onLoadMore);
    latest.current = onLoadMore;

    useEffect(() => {
        const element = ref.current;
        if (!enabled || !element || typeof window.IntersectionObserver !== 'function') return undefined;
        const observer = new window.IntersectionObserver((entries) => {
            if (entries.some(entry => entry.isIntersecting)) latest.current();
        }, { rootMargin });
        observer.observe(element);
        return () => observer.disconnect();
    }, [enabled, rootMargin]);

    return ref;
};

export default useLoadMoreOnScroll;
