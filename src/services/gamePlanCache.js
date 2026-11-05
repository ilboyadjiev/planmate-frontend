/** Where the AI Game plan keeps today's plan in the browser (components/GamePlan). */
export const cacheKeyFor = (user) => `planmate_game_plan_${user.id}`;

/** Forgets today's plan kept in this browser, e.g. when the AI Game plan is turned off in Settings. */
export const forgetGamePlan = (user) => {
    if (!user) return;
    try { localStorage.removeItem(cacheKeyFor(user)); } catch (e) { /* storage blocked */ }
};
