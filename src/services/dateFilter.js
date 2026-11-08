/**
 * Turns the date filter's two day strings ("YYYY-MM-DD", from <input type="date">) into request params for the
 * feed and search endpoints. "from" is the start of that local day, "to" the end of it, both as ISO instants, so
 * the backend filters by moment while the user thinks in whole days. Either side may be left empty (open-ended).
 */
export const dateWindowParams = (fromStr, toStr) => {
    const params = {};
    const start = fromStr ? new Date(`${fromStr}T00:00:00`) : null;
    const end = toStr ? new Date(`${toStr}T23:59:59.999`) : null;
    if (start && !Number.isNaN(start.getTime())) params.from = start.toISOString();
    if (end && !Number.isNaN(end.getTime())) params.to = end.toISOString();
    return params;
};
