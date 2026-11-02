const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "45m", "1h 30m", "2d 3h" (largest two units, zero parts dropped). */
export const formatDuration = (ms) => {
    const totalMinutes = Math.round(ms / MINUTE);
    const days = Math.floor(totalMinutes / (24 * 60));
    const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
    const minutes = totalMinutes % 60;

    const parts = [];
    if (days) parts.push(`${days}d`);
    if (hours) parts.push(`${hours}h`);
    if (minutes && !days) parts.push(`${minutes}m`);
    return parts.join(' ') || '0m';
};

// Upper bound (exclusive) → caption. Deterministic, so the text doesn't change on re-render.
const VIBES = [
    [15 * MINUTE, (d) => `${d}, a quick lil' sesh no cap ⚡`],
    [HOUR, (d) => `${d}, lowkey a speedrun 🏃`],
    [3 * HOUR, (d) => `${d} of pure vibes fr ✨`],
    [8 * HOUR, (d) => `${d}, that's a whole commitment bestie 💅`],
    [DAY, (d) => `${d}?? main character energy 🎬`],
    [Infinity, (d) => `${d}, it's giving side quest arc 🗺️`],
];

/** Duration caption for an event, or null when the range is invalid (the form shows an error then). */
export const describeDuration = (start, end) => {
    const ms = new Date(end) - new Date(start);
    if (!Number.isFinite(ms) || ms <= 0) return null;
    const [, caption] = VIBES.find(([limit]) => ms < limit);
    return caption(formatDuration(ms));
};
