import { redirect } from 'next/navigation';

import { SettingsEditor, type SettingRow } from '@/components/admin/SettingsEditor';
import { PageHeader } from '@/components/admin/ui';
import { pageSession } from '@/lib/auth/guard';
import { getDb } from '@/lib/db/client';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const session = await pageSession('settings.write');
  if (!session) redirect('/admin');

  const settings = getDb()
    .prepare(`
      SELECT key, value, value_type, label, hint, group_key
      FROM site_settings ORDER BY group_key, sort_order
    `)
    .all() as SettingRow[];

  return (
    <>
      <PageHeader
        title="Site settings"
        description="Contact details, social links, SEO defaults and form protection. No secrets are stored here and nothing on this page is exposed to the public frontend unless explicitly enabled."
      />
      <SettingsEditor settings={settings} />
    </>
  );
}
