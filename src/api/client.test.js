import api, { tokenStore, configureAuthHandlers } from './client';

// Fake transport: each test defines how the "server" answers.
let server;
const calls = [];

const respond = (request, status, data = {}) => {
    const response = { data, status, statusText: String(status), headers: {}, config: request };
    if (status >= 200 && status < 300) return Promise.resolve(response);
    const error = new Error(`Request failed with status code ${status}`);
    error.config = request;
    error.response = response;
    error.isAxiosError = true;
    return Promise.reject(error);
};

beforeEach(() => {
    localStorage.clear();
    calls.length = 0;
    api.defaults.adapter = (request) => {
        const auth = request.headers.Authorization;
        calls.push({ url: request.url, auth });
        return server(request, auth);
    };
});

const refreshCalls = () => calls.filter((c) => c.url.endsWith('/auth/refresh'));

test('attaches the stored access token', async () => {
    tokenStore.set('access-1', 'refresh-1');
    server = (req) => respond(req, 200, { ok: true });

    await api.get('/v1/users/profile');

    expect(calls[0].auth).toBe('Bearer access-1');
});

test('concurrent 401s trigger a single refresh and every request is retried with the new token', async () => {
    tokenStore.set('expired', 'refresh-1');
    const onTokenRefreshed = vi.fn();
    configureAuthHandlers({ onTokenRefreshed, onSessionExpired: vi.fn() });

    server = (req, auth) => {
        if (req.url.endsWith('/auth/refresh')) {
            return respond(req, 200, { accessToken: 'fresh', refreshToken: 'refresh-2' });
        }
        return auth === 'Bearer fresh' ? respond(req, 200, { url: req.url }) : respond(req, 401);
    };

    const results = await Promise.all([api.get('/a'), api.get('/b'), api.get('/c')]);

    expect(results.map((r) => r.data.url)).toEqual(['/a', '/b', '/c']);
    expect(refreshCalls()).toHaveLength(1);
    expect(tokenStore.getAccess()).toBe('fresh');
    expect(tokenStore.getRefresh()).toBe('refresh-2');
    expect(onTokenRefreshed).toHaveBeenCalledWith('fresh');
});

test('a failed refresh clears tokens and reports the expired session', async () => {
    tokenStore.set('expired', 'revoked');
    const onSessionExpired = vi.fn();
    configureAuthHandlers({ onSessionExpired });

    server = (req) => respond(req, 401);

    await expect(api.get('/a')).rejects.toBeTruthy();

    expect(refreshCalls()).toHaveLength(1);
    expect(tokenStore.getAccess()).toBeNull();
    expect(tokenStore.getRefresh()).toBeNull();
    expect(onSessionExpired).toHaveBeenCalled();
});

test('guest requests (no token) and auth endpoints never trigger a refresh', async () => {
    const onSessionExpired = vi.fn();
    configureAuthHandlers({ onSessionExpired });
    server = (req) => respond(req, 401);

    await expect(api.get('/v2/events/range')).rejects.toMatchObject({ response: { status: 401 } });

    tokenStore.set('some-token', 'refresh-1');
    await expect(api.post('/v1/auth/login', {})).rejects.toMatchObject({ response: { status: 401 } });

    expect(refreshCalls()).toHaveLength(0);
    expect(onSessionExpired).not.toHaveBeenCalled();
});
