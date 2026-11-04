// Tapping Search in the navbar while already on the search page puts the cursor in the search field.
// It must happen inside the tap itself (no navigation, no timers): only then do phones open the keyboard.
export const FOCUS_SEARCH = 'planmate:focus-search';

export const requestSearchFocus = () => window.dispatchEvent(new Event(FOCUS_SEARCH));
