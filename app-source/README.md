# Live Miracle

Multi-page corporate website for **Live Miracle** — a broadcast studio and
live-streaming infrastructure company operating across Georgia, Armenia,
Bulgaria and Ukraine.

Next.js 15 (App Router) · TypeScript · Tailwind · SQLite · GSAP

---

## Quick start

```bash
npm install

# Required. Generate a secret (the app refuses to boot in production without one):
cp .env.example .env.local
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
# paste into LM_APP_SECRET in .env.local

npm run build      # also generates image derivatives + brand assets
npm run db:seed    # creates schema, content and the first administrator
npm start
```

The seed prints the initial administrator credentials **once**. If
`LM_ADMIN_PASSWORD` is not set, a strong password is generated and must be
changed at first sign-in.

Back office: `/admin`

---

## Architecture

| Area | Location |
| --- | --- |
| Public pages | `src/app/(site)` |
| Back office | `src/app/admin` |
| APIs | `src/app/api` |
| Data access (public) | `src/lib/db/queries.ts` |
| Data access (admin) | `src/lib/admin/queries.ts` |
| Schema & migrations | `src/lib/db/migrations` |
| Auth, RBAC, CSRF, guards | `src/lib/auth` |
| Seed content | `src/lib/db/seed-data.ts`, `seed-content.ts` |

### Content model

Everything the public site renders — headlines, body copy, CTA labels, studio
records, SEO, contact details, social links — is stored in SQLite and editable
in the back office. **No deploy is required for a content change.** Public pages
render per request (`dynamic = 'force-dynamic'`) so edits appear immediately;
data comes from local SQLite, so this stays cheap.

### Media

Studio photography masters live in `assets/source/studios` (committed). The
`prebuild` step generates AVIF + WebP derivatives at three widths, plus a blur
placeholder, into `public/media` (gitignored, reproducible). Administrator
uploads go to `public/uploads` and are processed the same way at upload time.

`assets/studio-source-map.json` maps each studio's four brief-mandated image
roles (wide environment / alternate angle / production detail / technical
overhead) to its source files, and carries each studio's signature accent
colour.

---

## Security

- Sessions: opaque id + secret; only a SHA-256 digest of the secret is stored,
  so database read access cannot mint a working cookie. HttpOnly, Secure,
  SameSite, `__Host-` prefixed in production. Absolute and idle expiry.
- Passwords: scrypt (N=2^15), constant-time verification, strength policy,
  forced rotation for generated passwords.
- Authorization: **every** admin endpoint resolves permissions server-side from
  the session record on each request. No endpoint trusts a role supplied by the
  client. Page-level guards are defence in depth, not the boundary.
- CSRF: per-session secret, HMAC double-submit token, plus same-origin checks on
  every state-changing request.
- Rate limiting: SQLite-backed fixed window, survives restart. Login has
  progressive account lockout; forms are administrator-configurable.
- Uploads: type decided by sniffing bytes (sharp / magic numbers), never the
  declared Content-Type or filename. Storage keys are server-generated; every
  path is re-checked to be inside the upload root.
- Privacy: no raw IPs stored anywhere — only salted hashes. Analytics are
  cookieless with a daily-rotating visitor digest, so no one can be followed
  across days.
- Audit log: append-only, with sensitive keys redacted before writing.

Run the suite (server must be running):

```bash
SMOKE_ADMIN_PASSWORD='<password>' npm run smoke
```

It covers every public route, form validation, spam and rate limiting, security
headers, and asserts that all 43 admin endpoints reject anonymous callers and
that role permissions are enforced server-side rather than merely hidden in the
UI.

---

## Content policy

Per the brief, nothing factual is invented. Studio copy describes only what is
observably present in the supplied photography. Anything requiring knowledge we
do not have — capacity, hard specifications, which market a set physically sits
in, company history — is seeded as a bracketed placeholder (`[ADD CAPACITY]`)
and rendered on the public site as visibly pending rather than as a real value.
The company timeline ships empty for the same reason.

Legal documents (privacy, terms, cookies) are baseline drafts carrying a
"pending legal review" notice, editable in the CMS. The notice can be cleared by
an administrator once the documents have been reviewed.

---

## Environment

See `.env.example`. `LM_APP_SECRET` is required in production. Set
`LM_TRUSTED_PROXIES` only if you terminate TLS behind a proxy you control — a
wrong value lets a client spoof its address and evade rate limits.

---

## Known gaps

- Studio videos: the full pipeline (upload, transcode-free storage, poster
  frames, lazy loading, controls) is implemented, but no video files were
  supplied, so every studio renders the "no video uploaded" empty state until an
  administrator adds one.
- Unknown `/studios/<slug>` and `/services/<slug>` URLs render the 404 page but
  return HTTP 200 (a soft 404). These routes are dynamically rendered so that
  CMS edits appear without a rebuild, and Next streams dynamic responses — the
  status is committed before `notFound()` runs. Raising it from
  `generateMetadata` and scoping the `loading.tsx` boundary were both tried and
  neither moves the status. The fix is either `dynamicParams = false` with
  static generation (which would mean a rebuild for every content change,
  contradicting §24) or intercepting in middleware (which cannot reach SQLite
  on the edge runtime). Genuinely unmatched routes such as `/nonsense` return a
  correct 404.
