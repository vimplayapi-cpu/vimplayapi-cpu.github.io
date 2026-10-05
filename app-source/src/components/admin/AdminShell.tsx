'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useContext, useState } from 'react';

import { Wordmark } from '@/components/brand/Wordmark';
import { hasAnyPermission, type Permission } from '@/lib/auth/rbac';
import { cn } from '@/lib/cn';

interface AdminUser {
  name: string;
  email: string;
  roleName: string;
  permissions: string[];
  mustChangePassword: boolean;
}

interface AdminContextValue {
  user: AdminUser;
  csrfToken: string;
  /** fetch wrapper that attaches the CSRF token to every mutating request. */
  api: (path: string, init?: RequestInit) => Promise<Response>;
  can: (permission: Permission) => boolean;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function useAdmin(): AdminContextValue {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used inside AdminShell');
  return ctx;
}

interface NavGroup {
  label: string;
  items: { href: string; label: string; permissions: Permission[] }[];
}

const NAV: NavGroup[] = [
  {
    label: 'Overview',
    items: [{ href: '/admin', label: 'Dashboard', permissions: ['analytics.read', 'content.read'] }],
  },
  {
    label: 'Content',
    items: [
      { href: '/admin/studios', label: 'Studios', permissions: ['content.read'] },
      { href: '/admin/services', label: 'Services', permissions: ['content.read'] },
      { href: '/admin/gallery', label: 'Gallery', permissions: ['content.read'] },
      { href: '/admin/locations', label: 'Locations', permissions: ['content.read'] },
      { href: '/admin/timeline', label: 'Timeline', permissions: ['content.read'] },
      { href: '/admin/pages', label: 'Page content', permissions: ['content.read'] },
      { href: '/admin/seo', label: 'SEO', permissions: ['content.read'] },
    ],
  },
  {
    label: 'Media',
    items: [{ href: '/admin/media', label: 'Media library', permissions: ['media.read'] }],
  },
  {
    label: 'Leads',
    items: [
      { href: '/admin/inquiries', label: 'Inquiries', permissions: ['leads.read'] },
      { href: '/admin/demo-requests', label: 'Demo requests', permissions: ['leads.read'] },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/admin/settings', label: 'Settings', permissions: ['settings.write'] },
      { href: '/admin/users', label: 'Users', permissions: ['users.read'] },
      { href: '/admin/audit', label: 'Audit log', permissions: ['audit.read'] },
      { href: '/admin/account', label: 'My account', permissions: [] },
    ],
  },
];

export function AdminShell({
  user,
  csrfToken,
  children,
}: {
  user: AdminUser;
  csrfToken: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [navOpen, setNavOpen] = useState(false);

  const can = (permission: Permission) => hasAnyPermission(user.permissions, [permission]);

  const api = (path: string, init: RequestInit = {}) => {
    const method = (init.method ?? 'GET').toUpperCase();
    const headers = new Headers(init.headers);
    // Anything that changes state carries the session-bound CSRF token.
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) headers.set('x-csrf-token', csrfToken);
    if (init.body && typeof init.body === 'string' && !headers.has('content-type')) {
      headers.set('content-type', 'application/json');
    }
    return fetch(path, { ...init, headers });
  };

  async function signOut() {
    await api('/api/auth/logout', { method: 'POST' });
    router.push('/admin/login');
    router.refresh();
  }

  const visibleNav = NAV.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) => item.permissions.length === 0 || hasAnyPermission(user.permissions, item.permissions),
    ),
  })).filter((group) => group.items.length > 0);

  return (
    <AdminContext.Provider value={{ user, csrfToken, api, can }}>
      <div className="flex min-h-dvh flex-col lg:flex-row">
        {/* Sidebar */}
        <aside
          className={cn(
            'shrink-0 border-b border-hairline bg-void lg:sticky lg:top-0 lg:h-dvh lg:w-64 lg:border-b-0 lg:border-r',
            'flex flex-col',
          )}
        >
          <div className="flex items-center justify-between gap-4 border-b border-hairline px-5 py-4">
            <Link href="/admin" aria-label="Back office home">
              <Wordmark animate={false} showRule={false} />
            </Link>
            <button
              type="button"
              onClick={() => setNavOpen((v) => !v)}
              aria-expanded={navOpen}
              aria-controls="admin-nav"
              className="font-mono text-tech uppercase text-mist lg:hidden"
            >
              {navOpen ? 'CLOSE' : 'MENU'}
            </button>
          </div>

          <nav
            id="admin-nav"
            aria-label="Back office"
            className={cn('flex-1 overflow-y-auto px-3 py-5', navOpen ? 'block' : 'hidden lg:block')}
          >
            {visibleNav.map((group) => (
              <div key={group.label} className="mb-6">
                <p className="px-2 pb-2 font-mono text-tech-sm uppercase text-muted">{group.label}</p>
                <ul className="space-y-0.5">
                  {group.items.map((item) => {
                    const active =
                      item.href === '/admin'
                        ? pathname === '/admin'
                        : pathname.startsWith(item.href);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setNavOpen(false)}
                          aria-current={active ? 'page' : undefined}
                          className={cn(
                            'block border-l-2 px-3 py-2 text-sm transition-colors',
                            active
                              ? 'border-signal bg-signal/10 text-chalk'
                              : 'border-transparent text-mist hover:border-hairline-strong hover:text-chalk',
                          )}
                        >
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>

          <div className={cn('border-t border-hairline px-5 py-4', navOpen ? 'block' : 'hidden lg:block')}>
            <p className="truncate text-sm text-chalk">{user.name}</p>
            <p className="truncate font-mono text-tech-sm uppercase text-muted">{user.roleName}</p>
            <div className="mt-4 flex items-center gap-4">
              <Link
                href="/"
                target="_blank"
                rel="noopener"
                className="link-draw font-mono text-tech-sm uppercase text-mist"
              >
                View site
              </Link>
              <button
                type="button"
                onClick={signOut}
                className="link-draw font-mono text-tech-sm uppercase text-mist hover:text-live"
              >
                Sign out
              </button>
            </div>
          </div>
        </aside>

        {/* Content */}
        <div className="min-w-0 flex-1">
          {user.mustChangePassword && pathname !== '/admin/account' && (
            <div className="border-b border-standby/40 bg-standby/10 px-6 py-3">
              <p className="font-mono text-tech uppercase text-standby">
                Password change required —{' '}
                <Link href="/admin/account" className="underline">
                  update it now
                </Link>{' '}
                to continue.
              </p>
            </div>
          )}
          <main className="px-5 py-8 sm:px-8 lg:px-10">{children}</main>
        </div>
      </div>
    </AdminContext.Provider>
  );
}
