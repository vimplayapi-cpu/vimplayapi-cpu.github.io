import Link from 'next/link';

import { BarList, Card, PageHeader, StatTile, formatDate } from '@/components/admin/ui';
import { adminAnalytics, adminCountLeads, adminListStudios } from '@/lib/admin/queries';
import { readAudit } from '@/lib/audit';
import { getDb } from '@/lib/db/client';
import { pageSession } from '@/lib/auth/guard';
import { hasPermission } from '@/lib/auth/rbac';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await pageSession();
  // The layout already redirected if there is no session; this satisfies the
  // type checker and keeps the page safe if it is ever rendered standalone.
  if (!session) return null;

  const perms = session.user.permissions;
  const canAnalytics = hasPermission(perms, 'analytics.read');
  const canLeads = hasPermission(perms, 'leads.read');
  const canAudit = hasPermission(perms, 'audit.read');

  const analytics = canAnalytics ? adminAnalytics(30) : null;
  const leads = canLeads ? adminCountLeads() : null;
  const studios = adminListStudios();
  const recentAudit = canAudit ? readAudit(8) : [];

  const db = getDb();
  const mediaCount = (db.prepare('SELECT COUNT(*) c FROM media').get() as { c: number }).c;
  const published = studios.filter((s) => s.isPublished).length;
  const missingMedia = studios.filter((s) => s.imageCount < 4).length;
  const missingVideo = studios.filter((s) => !s.hasVideo).length;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Signed in as ${session.user.name} · ${session.user.roleName}`}
      />

      {/* Content health */}
      <section aria-labelledby="health" className="mb-10">
        <h2 id="health" className="tech-label mb-4">
          Content
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Studios published" value={`${published} / ${studios.length}`} />
          <StatTile label="Media items" value={mediaCount} />
          <StatTile
            label="Studios missing images"
            value={missingMedia}
            tone={missingMedia > 0 ? 'warn' : 'default'}
            sub={missingMedia > 0 ? 'Fewer than four frames attached' : 'All four frames attached'}
          />
          <StatTile
            label="Studios without video"
            value={missingVideo}
            tone={missingVideo > 0 ? 'warn' : 'default'}
            sub="Upload from the media library"
          />
        </div>
      </section>

      {/* Leads */}
      {leads && (
        <section aria-labelledby="leads" className="mb-10">
          <h2 id="leads" className="tech-label mb-4">
            Leads
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label="New inquiries"
              value={leads.inquiriesNew}
              tone={leads.inquiriesNew > 0 ? 'accent' : 'default'}
              sub={`${leads.inquiriesTotal} total`}
            />
            <StatTile
              label="New demo requests"
              value={leads.demoNew}
              tone={leads.demoNew > 0 ? 'accent' : 'default'}
              sub={`${leads.demoTotal} total`}
            />
            {analytics && (
              <>
                <StatTile label="Conversion rate" value={`${analytics.conversionRate}%`} sub="Of unique visitors, 30 days" />
                <StatTile label="Studio page views" value={analytics.studioViews} sub="Last 30 days" />
              </>
            )}
          </div>
          <div className="mt-4 flex gap-4">
            <Link href="/admin/inquiries" className="link-draw font-mono text-tech uppercase text-mist">
              View inquiries
            </Link>
            <Link href="/admin/demo-requests" className="link-draw font-mono text-tech uppercase text-mist">
              View demo requests
            </Link>
          </div>
        </section>
      )}

      {/* Analytics */}
      {analytics && (
        <section aria-labelledby="analytics" className="mb-10">
          <h2 id="analytics" className="tech-label mb-4">
            Audience — last 30 days
          </h2>

          <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="Unique visitors" value={analytics.visitors.toLocaleString()} />
            <StatTile label="Page views" value={analytics.pageviews.toLocaleString()} />
            <StatTile label="Gallery views" value={analytics.galleryViews.toLocaleString()} />
            <StatTile
              label="Conversions"
              value={analytics.inquiries + analytics.demoRequests}
              sub={`${analytics.inquiries} inquiries · ${analytics.demoRequests} demo`}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <h3 className="tech-label mb-4">Top pages</h3>
              <BarList items={analytics.topPages.map((p) => ({ label: p.path, value: p.views }))} />
            </Card>
            <Card>
              <h3 className="tech-label mb-4">Top studios</h3>
              <BarList items={analytics.topStudios.map((p) => ({ label: p.name, value: p.views }))} />
            </Card>
            <Card>
              <h3 className="tech-label mb-4">Traffic sources</h3>
              <BarList items={analytics.sources.map((p) => ({ label: p.host, value: p.views }))} />
            </Card>
            <Card>
              <h3 className="tech-label mb-4">Countries</h3>
              <BarList items={analytics.countries.map((p) => ({ label: p.code, value: p.views }))} />
            </Card>
            <Card className="lg:col-span-2">
              <h3 className="tech-label mb-4">Devices</h3>
              <BarList items={analytics.devices.map((p) => ({ label: p.device, value: p.views }))} />
            </Card>
          </div>

          <p className="mt-4 text-xs text-muted">
            Analytics are cookieless and cannot identify a visitor. The visitor digest is salted and
            rotates daily, so no one can be followed between days.
          </p>
        </section>
      )}

      {/* Recent activity */}
      {canAudit && recentAudit.length > 0 && (
        <section aria-labelledby="activity">
          <h2 id="activity" className="tech-label mb-4">
            Recent activity
          </h2>
          <Card className="p-0">
            <ul className="divide-y divide-[rgba(242,245,248,0.08)]">
              {recentAudit.map((entry) => (
                <li key={entry.id} className="flex flex-wrap items-baseline justify-between gap-3 px-5 py-3">
                  <span className="font-mono text-tech-sm uppercase text-chalk">{entry.action}</span>
                  <span className="text-xs text-muted">
                    {entry.actorEmail ?? 'system'} · {formatDate(entry.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
          <Link href="/admin/audit" className="link-draw mt-4 inline-block font-mono text-tech uppercase text-mist">
            View full audit log
          </Link>
        </section>
      )}
    </>
  );
}
