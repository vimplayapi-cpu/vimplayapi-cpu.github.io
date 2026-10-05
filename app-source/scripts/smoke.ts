/**
 * End-to-end smoke and security test suite.
 *
 * Runs against a live server (default http://localhost:3100). Covers:
 *  - every public route renders
 *  - forms accept valid input and reject invalid input
 *  - rate limiting and spam protection fire
 *  - EVERY admin API rejects unauthenticated callers
 *  - permissions are enforced per role, not merely hidden in the UI
 *  - CSRF, IDOR, path traversal, XSS storage and header checks
 *
 * Usage: npm run smoke [-- --base http://localhost:3100]
 */

const BASE =
  process.argv.find((a) => a.startsWith('--base='))?.split('=')[1] ??
  process.env.SMOKE_BASE ??
  'http://localhost:3100';

interface Result {
  group: string;
  name: string;
  ok: boolean;
  detail: string;
}

const results: Result[] = [];
let currentGroup = 'general';

function group(name: string) {
  currentGroup = name;
}

function check(name: string, ok: boolean, detail = '') {
  results.push({ group: currentGroup, name, ok, detail });
  const mark = ok ? '  ✓' : '  ✗';
  console.log(`${mark} ${name}${detail && !ok ? ` — ${detail}` : ''}`);
}

async function req(
  path: string,
  init: RequestInit & { cookie?: string } = {},
): Promise<{ status: number; body: string; json: any; headers: Headers }> {
  const headers = new Headers(init.headers);
  if (init.cookie) headers.set('cookie', init.cookie);
  // Same-origin guard requires a matching Origin on mutating requests.
  if (init.method && !['GET', 'HEAD'].includes(init.method) && !headers.has('origin')) {
    headers.set('origin', BASE);
  }

  const res = await fetch(`${BASE}${path}`, { ...init, headers, redirect: 'manual' });
  const body = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(body);
  } catch {
    /* html response */
  }
  return { status: res.status, body, json, headers: res.headers };
}

// ---------------------------------------------------------------------------

async function testPublicRoutes() {
  group('Public routes');

  const routes = [
    '/', '/about', '/services', '/studios', '/gallery', '/contact', '/demo',
    '/privacy', '/terms', '/cookies',
    '/services/studio-provision', '/services/custom-studio-design',
    '/services/shared-production', '/services/streaming-technology',
    '/services/production-staff', '/services/training',
    '/studios/arctic-ice', '/studios/desert-mirage', '/studios/emerald-forest',
    '/studios/havana-gold', '/studios/midnight-galaxy', '/studios/monte-carlo-classic',
    '/studios/neon-noir', '/studios/riviera-rose', '/studios/royal-velvet',
    '/studios/tokyo-nights',
    '/sitemap.xml', '/robots.txt',
  ];

  for (const route of routes) {
    const res = await req(route);
    check(`GET ${route}`, res.status === 200, `status ${res.status}`);
  }

  const notFound = await req('/this-route-does-not-exist');
  check('404 for unknown route', notFound.status === 404, `status ${notFound.status}`);

  const badStudio = await req('/studios/not-a-real-studio');
  check('404 for unknown studio', badStudio.status === 404, `status ${badStudio.status}`);
}

async function testSeoAndContent() {
  group('SEO & content');

  const home = await req('/');
  check('home has a single h1', (home.body.match(/<h1/g) ?? []).length === 1);
  check('home has meta description', /<meta name="description"/.test(home.body));
  check('home has canonical link', /<link rel="canonical"/.test(home.body));
  check('home has OpenGraph tags', /property="og:title"/.test(home.body));
  check('home has Twitter card', /name="twitter:card"/.test(home.body));
  check('home has JSON-LD organisation', /"@type":"Organization"/.test(home.body));
  check('home headline present', /WE BUILD THE STUDIOS/.test(home.body));
  check('images carry alt text', /<img[^>]+alt="[^"]+"/.test(home.body));
  check('no-JS reveal fallback present', /lm-reveal\{opacity:1/.test(home.body));

  const studio = await req('/studios/neon-noir');
  check('studio page has breadcrumb JSON-LD', /"@type":"BreadcrumbList"/.test(studio.body));
  check('studio page shows all four frame roles',
    /Wide environment/.test(studio.body) && /Technical environment angle/.test(studio.body));
  check('studio placeholders render as pending, not raw brackets',
    !/\[ADD SPECIFICATION\]/.test(studio.body) && /ADD SPECIFICATION/.test(studio.body));

  const sitemap = await req('/sitemap.xml');
  check('sitemap lists studio routes', /studios\/neon-noir/.test(sitemap.body));
  const robots = await req('/robots.txt');
  check('robots disallows /admin', /Disallow: \/admin/.test(robots.body));
  check('robots disallows /api/', /Disallow: \/api\//.test(robots.body));
}

async function testSecurityHeaders() {
  group('Security headers');

  const res = await req('/');
  const h = res.headers;
  check('CSP present', !!h.get('content-security-policy'));
  check("CSP frame-ancestors 'none'", (h.get('content-security-policy') ?? '').includes("frame-ancestors 'none'"));
  check("CSP object-src 'none'", (h.get('content-security-policy') ?? '').includes("object-src 'none'"));
  check('X-Content-Type-Options nosniff', h.get('x-content-type-options') === 'nosniff');
  check('X-Frame-Options DENY', h.get('x-frame-options') === 'DENY');
  check('Referrer-Policy set', !!h.get('referrer-policy'));
  check('Permissions-Policy set', !!h.get('permissions-policy'));
  check('HSTS set', !!h.get('strict-transport-security'));
  check('X-Powered-By hidden', !h.get('x-powered-by'));

  const admin = await req('/admin/login');
  check('admin is noindex', (admin.headers.get('x-robots-tag') ?? '').includes('noindex'));
  check('admin is no-store', (admin.headers.get('cache-control') ?? '').includes('no-store'));
}

async function testForms() {
  group('Public forms');

  // Valid contact submission.
  const valid = await req('/api/contact', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      full_name: 'Smoke Test',
      company: 'Test Co',
      email: 'smoke@example.com',
      phone: '+995 555 123456',
      country: 'Georgia',
      service_interest: 'Full Studio Provision',
      project_type: 'New studio build',
      message: 'This is an automated smoke test submission with enough detail.',
      website: '',
      _t: Math.floor(Date.now() / 1000) - 30,
    }),
  });
  check('contact accepts valid submission', valid.status === 201, `status ${valid.status}`);

  // Invalid: bad email + short message.
  const invalid = await req('/api/contact', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ full_name: 'X', email: 'not-an-email', message: 'short', _t: 0 }),
  });
  check('contact rejects invalid input', invalid.status === 400, `status ${invalid.status}`);
  check('contact returns field errors', !!invalid.json?.error?.details?.email);

  // Honeypot must be treated as spam but still answer 201 (no bot feedback).
  const honeypot = await req('/api/contact', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      full_name: 'Bot Test',
      email: 'bot@example.com',
      message: 'Automated honeypot submission for the smoke test suite.',
      website: 'http://spam.example',
      _t: Math.floor(Date.now() / 1000) - 30,
    }),
  });
  check('honeypot submission is accepted silently', honeypot.status === 201, `status ${honeypot.status}`);

  // Cross-origin POST must be rejected.
  const crossOrigin = await req('/api/contact', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://evil.example' },
    body: JSON.stringify({ full_name: 'X', email: 'a@b.co', message: 'x'.repeat(20) }),
  });
  check('cross-origin form POST rejected', crossOrigin.status === 403, `status ${crossOrigin.status}`);

  // Demo request with an unknown studio slug must not fail — it is resolved
  // server-side and simply left unset.
  const demo = await req('/api/demo', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: 'Smoke Demo',
      business_email: 'demo@example.com',
      phone: '+995555000111',
      studio_slug: 'does-not-exist',
      required_services: ['Full Studio Provision'],
      message: 'Automated demo request smoke test.',
      _t: Math.floor(Date.now() / 1000) - 30,
    }),
  });
  check('demo accepts valid submission', demo.status === 201, `status ${demo.status}`);

  // Missing required phone.
  const demoBad = await req('/api/demo', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'X', business_email: 'a@b.co', _t: 0 }),
  });
  check('demo rejects missing required fields', demoBad.status === 400, `status ${demoBad.status}`);
}

async function testRateLimit() {
  group('Rate limiting');

  // The seeded limit is 5 per hour per IP; earlier tests already consumed some.
  let limited = false;
  for (let i = 0; i < 12; i++) {
    const res = await req('/api/contact', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        full_name: `Flood ${i}`,
        email: `flood${i}@example.com`,
        message: 'Rate limit probe submission for the automated smoke suite.',
        _t: Math.floor(Date.now() / 1000) - 30,
      }),
    });
    if (res.status === 429) {
      limited = true;
      check('rate limit returns Retry-After', !!res.headers.get('retry-after'));
      break;
    }
  }
  check('contact form is rate limited', limited);
}

/** Every admin endpoint, with the method that should be rejected when signed out. */
const ADMIN_ENDPOINTS: [string, string][] = [
  ['GET', '/api/admin/studios'],
  ['POST', '/api/admin/studios'],
  ['PATCH', '/api/admin/studios'],
  ['GET', '/api/admin/studios/1'],
  ['PUT', '/api/admin/studios/1'],
  ['DELETE', '/api/admin/studios/1'],
  ['GET', '/api/admin/services'],
  ['POST', '/api/admin/services'],
  ['PUT', '/api/admin/services/1'],
  ['DELETE', '/api/admin/services/1'],
  ['GET', '/api/admin/locations'],
  ['POST', '/api/admin/locations'],
  ['PUT', '/api/admin/locations/1'],
  ['DELETE', '/api/admin/locations/1'],
  ['GET', '/api/admin/timeline'],
  ['POST', '/api/admin/timeline'],
  ['PUT', '/api/admin/timeline/1'],
  ['DELETE', '/api/admin/timeline/1'],
  ['GET', '/api/admin/gallery'],
  ['POST', '/api/admin/gallery'],
  ['PUT', '/api/admin/gallery/1'],
  ['DELETE', '/api/admin/gallery/1'],
  ['GET', '/api/admin/content'],
  ['PUT', '/api/admin/content'],
  ['GET', '/api/admin/settings'],
  ['PUT', '/api/admin/settings'],
  ['GET', '/api/admin/seo'],
  ['PUT', '/api/admin/seo'],
  ['GET', '/api/admin/media'],
  ['POST', '/api/admin/media'],
  ['PATCH', '/api/admin/media/1'],
  ['DELETE', '/api/admin/media/1'],
  ['GET', '/api/admin/users'],
  ['POST', '/api/admin/users'],
  ['PUT', '/api/admin/users/1'],
  ['DELETE', '/api/admin/users/1'],
  ['GET', '/api/admin/leads/inquiries/1'],
  ['PATCH', '/api/admin/leads/inquiries/1'],
  ['DELETE', '/api/admin/leads/inquiries/1'],
  ['GET', '/api/admin/leads/demo-requests/1'],
  ['PATCH', '/api/admin/leads/demo-requests/1'],
  ['DELETE', '/api/admin/leads/demo-requests/1'],
  ['POST', '/api/admin/account/password'],
];

async function testAdminAuthorization() {
  group('Admin API — unauthenticated');

  let allBlocked = true;
  for (const [method, path] of ADMIN_ENDPOINTS) {
    const res = await req(path, {
      method,
      headers: { 'content-type': 'application/json' },
      body: ['GET', 'HEAD'].includes(method) ? undefined : '{}',
    });
    // 401 is correct. 403 also acceptable (origin/CSRF rejected first).
    const blocked = res.status === 401 || res.status === 403;
    if (!blocked) {
      allBlocked = false;
      check(`${method} ${path} blocked`, false, `status ${res.status}`);
    }
  }
  check(`all ${ADMIN_ENDPOINTS.length} admin endpoints reject anonymous callers`, allBlocked);

  // Admin pages must redirect, not render.
  for (const page of ['/admin', '/admin/studios', '/admin/media', '/admin/users', '/admin/settings',
                      '/admin/inquiries', '/admin/audit']) {
    const res = await req(page);
    const redirected = res.status === 307 || res.status === 302 ||
      (res.status === 200 && !/Back office<\/h1>|Dashboard/.test(res.body));
    check(`${page} not reachable anonymously`, redirected, `status ${res.status}`);
  }
}

async function login(email: string, password: string): Promise<string | null> {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: BASE },
    body: JSON.stringify({ email, password }),
    redirect: 'manual',
  });
  if (!res.ok) return null;
  const setCookie = res.headers.get('set-cookie');
  if (!setCookie) return null;
  return setCookie.split(';')[0];
}

async function testAuthenticatedAdmin(cookie: string, csrf: string) {
  group('Admin API — authenticated');

  const authed = (path: string, init: RequestInit = {}) =>
    req(path, {
      ...init,
      cookie,
      headers: { ...(init.headers ?? {}), 'x-csrf-token': csrf, 'content-type': 'application/json' },
    });

  const studios = await authed('/api/admin/studios');
  check('authenticated GET studios succeeds', studios.status === 200, `status ${studios.status}`);
  check('studios list has 10 records', studios.json?.data?.length === 10, `got ${studios.json?.data?.length}`);

  // CSRF: same session, no token → must fail.
  const noCsrf = await req('/api/admin/studios', {
    method: 'POST',
    cookie,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ slug: 'csrf-probe', code: 'X', name: 'X', status: 'available', accent: '#ffffff' }),
  });
  check('mutating request without CSRF token rejected', noCsrf.status === 403, `status ${noCsrf.status}`);

  // CSRF: wrong token → must fail.
  const badCsrf = await req('/api/admin/studios', {
    method: 'POST',
    cookie,
    headers: { 'content-type': 'application/json', 'x-csrf-token': 'not-the-token' },
    body: JSON.stringify({ slug: 'csrf-probe', code: 'X', name: 'X', status: 'available', accent: '#ffffff' }),
  });
  check('mutating request with wrong CSRF token rejected', badCsrf.status === 403, `status ${badCsrf.status}`);

  // Cross-origin with a valid session → must fail.
  const xorigin = await req('/api/admin/studios', {
    method: 'POST',
    cookie,
    headers: { 'content-type': 'application/json', 'x-csrf-token': csrf, origin: 'https://evil.example' },
    body: JSON.stringify({ slug: 'x', code: 'X', name: 'X', status: 'available', accent: '#ffffff' }),
  });
  check('cross-origin admin POST rejected', xorigin.status === 403, `status ${xorigin.status}`);

  // Validation on admin input.
  const badInput = await authed('/api/admin/studios', {
    method: 'POST',
    body: JSON.stringify({ slug: 'Not A Slug!', code: 'X', name: '', status: 'nonsense', accent: 'red' }),
  });
  check('admin rejects invalid studio payload', badInput.status === 400, `status ${badInput.status}`);

  // Unknown setting key must be rejected.
  const badSetting = await authed('/api/admin/settings', {
    method: 'PUT',
    body: JSON.stringify({ settings: [{ key: 'evil.injected.key', value: 'x' }] }),
  });
  check('unknown setting key rejected', badSetting.status === 400, `status ${badSetting.status}`);

  // WhatsApp toggle guard.
  const waGuard = await authed('/api/admin/settings', {
    method: 'PUT',
    body: JSON.stringify({
      settings: [{ key: 'whatsapp.enabled', value: 'true' }, { key: 'whatsapp.number', value: '' }],
    }),
  });
  check('WhatsApp cannot be enabled without a number', waGuard.status === 400, `status ${waGuard.status}`);

  // Managed build asset cannot be deleted.
  const media = await authed('/api/admin/media?kind=image&limit=1');
  const managed = media.json?.data?.items?.find((m: any) => m.isManaged);
  if (managed) {
    const del = await authed(`/api/admin/media/${managed.id}`, { method: 'DELETE' });
    check('build-managed media cannot be deleted', del.status === 409, `status ${del.status}`);
  } else {
    check('build-managed media cannot be deleted', false, 'no managed asset found to probe');
  }

  // Lead read returns no IP hash or user agent.
  const lead = await authed('/api/admin/leads/inquiries/1');
  if (lead.status === 200) {
    check('lead response omits ip_hash', !('ip_hash' in (lead.json?.data ?? {})));
    check('lead response omits user_agent', !('user_agent' in (lead.json?.data ?? {})));
  } else {
    check('lead detail readable by admin', false, `status ${lead.status}`);
  }

  // Unknown lead type must 404, not leak another table.
  const badType = await authed('/api/admin/leads/users/1');
  check('unknown lead type rejected', badType.status === 404, `status ${badType.status}`);

  // IDOR probes: non-existent ids must 404, never 200.
  for (const path of ['/api/admin/studios/999999', '/api/admin/leads/inquiries/999999']) {
    const res = await authed(path);
    check(`${path} returns 404`, res.status === 404, `status ${res.status}`);
  }

  // Path traversal in the id segment must not resolve.
  const traversal = await authed('/api/admin/studios/..%2F..%2Fetc%2Fpasswd');
  check('path traversal in id rejected', traversal.status >= 400, `status ${traversal.status}`);

  // Self-delete must be blocked.
  const users = await authed('/api/admin/users');
  const me = users.json?.data?.users?.find((u: any) => u.email === ADMIN_EMAIL);
  if (me) {
    const selfDelete = await authed(`/api/admin/users/${me.id}`, { method: 'DELETE' });
    check('cannot delete own account', selfDelete.status === 409, `status ${selfDelete.status}`);

    // Last super admin cannot be demoted.
    const editor = users.json?.data?.roles?.find((r: any) => r.slug === 'editor');
    if (editor) {
      const demote = await authed(`/api/admin/users/${me.id}`, {
        method: 'PUT',
        body: JSON.stringify({ email: me.email, name: me.name, role_id: editor.id, is_active: true }),
      });
      check('last super admin cannot be demoted', demote.status === 409, `status ${demote.status}`);
    }
  }
}

/** Creates a limited-permission user and verifies the permission wall holds. */
async function testRoleEnforcement(cookie: string, csrf: string) {
  group('Role enforcement');

  const authed = (path: string, init: RequestInit = {}) =>
    req(path, {
      ...init,
      cookie,
      headers: { ...(init.headers ?? {}), 'x-csrf-token': csrf, 'content-type': 'application/json' },
    });

  const usersRes = await authed('/api/admin/users');
  const roles = usersRes.json?.data?.roles ?? [];
  const analyticsRole = roles.find((r: any) => r.slug === 'analytics');
  if (!analyticsRole) {
    check('analytics role exists', false, 'role not found');
    return;
  }

  const email = `smoke-analytics-${Date.now()}@example.com`;
  const created = await authed('/api/admin/users', {
    method: 'POST',
    body: JSON.stringify({ email, name: 'Smoke Analytics', role_id: analyticsRole.id, is_active: true }),
  });
  if (created.status !== 201) {
    check('created limited-permission user', false, `status ${created.status}`);
    return;
  }
  check('created limited-permission user', true);

  const tempPassword = created.json.data.temporaryPassword;
  const limitedCookie = await login(email, tempPassword);
  if (!limitedCookie) {
    check('limited user can sign in', false);
    return;
  }
  check('limited user can sign in', true);

  // The account is flagged must_change_pw, so everything except the password
  // endpoint must be refused — this is itself a security property worth testing.
  const blocked = await req('/api/admin/studios', { cookie: limitedCookie });
  check(
    'user forced to rotate password cannot use other endpoints',
    blocked.status === 403,
    `status ${blocked.status}`,
  );

  // Rotate the password, then re-test permissions properly.
  const newPassword = `Sm0ke!Rotate${Date.now()}`;
  const csrfForLimited = await fetchCsrf(limitedCookie);
  const rotate = await req('/api/admin/account/password', {
    method: 'POST',
    cookie: limitedCookie,
    headers: { 'content-type': 'application/json', 'x-csrf-token': csrfForLimited ?? '' },
    body: JSON.stringify({
      current_password: tempPassword,
      new_password: newPassword,
      confirm_password: newPassword,
    }),
  });
  check('forced password rotation succeeds', rotate.status === 200, `status ${rotate.status}`);

  const freshCookie = await login(email, newPassword);
  if (!freshCookie) {
    check('limited user signs in after rotation', false);
    return;
  }
  const freshCsrf = await fetchCsrf(freshCookie);

  // Analytics role: may read content, may NOT write content, media or users.
  const readOk = await req('/api/admin/studios', { cookie: freshCookie });
  check('analytics role can read content', readOk.status === 200, `status ${readOk.status}`);

  const writeAttempt = await req('/api/admin/studios', {
    method: 'POST',
    cookie: freshCookie,
    headers: { 'content-type': 'application/json', 'x-csrf-token': freshCsrf ?? '' },
    body: JSON.stringify({
      slug: 'unauthorised-studio', code: 'X', name: 'Should Not Exist',
      status: 'available', accent: '#ffffff',
    }),
  });
  check('analytics role cannot create studios', writeAttempt.status === 403, `status ${writeAttempt.status}`);

  const usersAttempt = await req('/api/admin/users', { cookie: freshCookie });
  check('analytics role cannot list users', usersAttempt.status === 403, `status ${usersAttempt.status}`);

  const mediaAttempt = await req('/api/admin/media', { cookie: freshCookie });
  check('analytics role cannot read media library', mediaAttempt.status === 403, `status ${mediaAttempt.status}`);

  const settingsAttempt = await req('/api/admin/settings', { cookie: freshCookie });
  check('analytics role cannot read settings', settingsAttempt.status === 403, `status ${settingsAttempt.status}`);

  const leadsAttempt = await req('/api/admin/leads/inquiries/1', { cookie: freshCookie });
  check('analytics role cannot read leads', leadsAttempt.status === 403, `status ${leadsAttempt.status}`);

  // Clean up.
  const me = (await authed('/api/admin/users')).json?.data?.users?.find((u: any) => u.email === email);
  if (me) await authed(`/api/admin/users/${me.id}`, { method: 'DELETE' });
}

/** Reads the CSRF token out of the rendered admin page payload. */
async function fetchCsrf(cookie: string): Promise<string | null> {
  const res = await req('/admin/account', { cookie });
  // The token is embedded in the RSC payload as a plain string prop.
  const match = res.body.match(/"csrfToken\\?":\\?"([A-Za-z0-9_-]+)\\?"/);
  return match?.[1] ?? null;
}

async function testLoginSecurity() {
  group('Authentication');

  const wrong = await req('/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: 'definitely-wrong-password' }),
  });
  check('wrong password rejected', wrong.status === 401, `status ${wrong.status}`);

  const unknown = await req('/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'nobody@example.com', password: 'whatever-password' }),
  });
  check('unknown account rejected', unknown.status === 401, `status ${unknown.status}`);
  check(
    'wrong password and unknown account are indistinguishable',
    wrong.json?.error?.message === unknown.json?.error?.message,
    `"${wrong.json?.error?.message}" vs "${unknown.json?.error?.message}"`,
  );

  const crossOrigin = await req('/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://evil.example' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: 'x' }),
  });
  check('cross-origin login rejected', crossOrigin.status === 403, `status ${crossOrigin.status}`);

  // Session cookie hardening.
  const good = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: BASE },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    redirect: 'manual',
  });
  const setCookie = good.headers.get('set-cookie') ?? '';
  check('login succeeds with correct credentials', good.ok, `status ${good.status}`);
  check('session cookie is HttpOnly', /HttpOnly/i.test(setCookie));
  check('session cookie is SameSite', /SameSite=Lax|SameSite=Strict/i.test(setCookie));
  check('session cookie is path-scoped', /Path=\//i.test(setCookie));

  // A forged cookie must not authenticate.
  const forged = await req('/api/admin/studios', { cookie: 'lm_session=fake.fabricated-secret' });
  check('forged session cookie rejected', forged.status === 401, `status ${forged.status}`);
}

async function testXssStorage(cookie: string, csrf: string) {
  group('XSS / injection');

  // Store a payload through the public form, then confirm it is escaped when
  // rendered back in the admin UI.
  const payload = '<script>alert("xss")</script><img src=x onerror=alert(1)>';
  await req('/api/contact', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      full_name: payload,
      email: 'xss@example.com',
      message: `Injection probe ${payload} for the automated smoke suite.`,
      _t: Math.floor(Date.now() / 1000) - 30,
    }),
  });

  const adminPage = await req('/admin/inquiries', { cookie });
  check(
    'stored payload is not rendered as a live script tag',
    !adminPage.body.includes('<script>alert("xss")</script>'),
  );

  // SQL injection probe against a search parameter.
  const sqli = await req(`/api/admin/media?q=${encodeURIComponent("' OR 1=1 --")}`, { cookie });
  check('SQL injection probe handled safely', sqli.status === 200, `status ${sqli.status}`);

  // Oversized payload must be rejected by the schema, not crash the server.
  const huge = await req('/api/contact', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      full_name: 'Size Probe',
      email: 'size@example.com',
      message: 'x'.repeat(50_000),
      _t: Math.floor(Date.now() / 1000) - 30,
    }),
  });
  check('oversized message rejected', huge.status === 400 || huge.status === 429, `status ${huge.status}`);
}

async function testAnalytics() {
  group('Analytics');

  const res = await req('/api/analytics', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'pageview', path: '/smoke-test' }),
  });
  check('analytics beacon accepted', res.status === 200, `status ${res.status}`);

  const malformed = await req('/api/analytics', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'not-a-real-type', path: '/x' }),
  });
  check('malformed beacon ignored without error', malformed.status === 200, `status ${malformed.status}`);
  check('malformed beacon not recorded', malformed.json?.data?.recorded === false);
}

// ---------------------------------------------------------------------------

const ADMIN_EMAIL = process.env.SMOKE_ADMIN_EMAIL ?? 'miracle@gmail.com';
const ADMIN_PASSWORD = process.env.SMOKE_ADMIN_PASSWORD ?? '';

async function main() {
  console.log(`\nLive Miracle — smoke & security suite\nTarget: ${BASE}\n`);

  await testPublicRoutes();
  await testSeoAndContent();
  await testSecurityHeaders();
  await testForms();
  await testAnalytics();
  await testAdminAuthorization();

  if (!ADMIN_PASSWORD) {
    console.log('\n  ! SMOKE_ADMIN_PASSWORD not set — skipping authenticated tests.\n');
  } else {
    await testLoginSecurity();
    const cookie = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
    if (!cookie) {
      check('admin login for authenticated tests', false, 'could not sign in');
    } else {
      const csrf = await fetchCsrf(cookie);
      if (!csrf) {
        check('CSRF token retrievable from admin page', false);
      } else {
        check('CSRF token retrievable from admin page', true);
        await testAuthenticatedAdmin(cookie, csrf);
        await testXssStorage(cookie, csrf);
        await testRoleEnforcement(cookie, csrf);
      }
    }
  }

  // Rate limiting last: it deliberately exhausts the contact form budget.
  await testRateLimit();

  // Summary
  const failed = results.filter((r) => !r.ok);
  const byGroup = new Map<string, { pass: number; fail: number }>();
  for (const r of results) {
    const g = byGroup.get(r.group) ?? { pass: 0, fail: 0 };
    r.ok ? g.pass++ : g.fail++;
    byGroup.set(r.group, g);
  }

  console.log('\n' + '='.repeat(64));
  for (const [g, counts] of byGroup) {
    const status = counts.fail === 0 ? 'PASS' : 'FAIL';
    console.log(`  ${status.padEnd(5)} ${g.padEnd(32)} ${counts.pass} passed, ${counts.fail} failed`);
  }
  console.log('='.repeat(64));
  console.log(`  TOTAL: ${results.length - failed.length}/${results.length} passed`);

  if (failed.length) {
    console.log('\n  Failures:');
    for (const f of failed) console.log(`    ✗ [${f.group}] ${f.name}${f.detail ? ` — ${f.detail}` : ''}`);
    process.exit(1);
  }
  console.log('\n  All checks passed.\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
