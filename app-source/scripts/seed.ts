/**
 * Seeds the database with roles, the initial administrator, CMS content and
 * the studio records backed by the supplied photography.
 *
 * Idempotent: re-running updates the managed rows in place rather than
 * duplicating them, and never overwrites editorial changes to content blocks
 * that an administrator has already touched (tracked via updated_by).
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

import { openDb, migrate, now } from '../src/lib/db/client';
import { hashPassword, randomToken } from '../src/lib/auth/password';
import {
  ROLES, LOCATIONS, STUDIOS, SERVICES, GALLERY_CATEGORIES,
  TIMELINE_PLACEHOLDERS, TECHNICAL_SPEC_ROWS, PLACEHOLDER,
} from '../src/lib/db/seed-data';
import { CONTENT_BLOCKS, SITE_SETTINGS, SEO_ROUTES, PAGES } from '../src/lib/db/seed-content';

const ROOT = path.resolve(import.meta.dirname, '..');
const MANIFEST_PATH = path.join(ROOT, 'src/generated/media-manifest.json');

interface ManifestImage {
  role: 'wide' | 'alt' | 'detail' | 'tech';
  roleLabel: string;
  position: number;
  width: number;
  height: number;
  avif: string;
  webp: string;
  avifSrcSet: string;
  webpSrcSet: string;
  lqip: string;
  dominant: string;
  sourceFile: string;
  bytes: number;
}
interface Manifest {
  studios: { slug: string; accent: string; images: ManifestImage[] }[];
}

/** Human-readable alt text derived from the studio and the frame's role. */
function altFor(studioName: string, role: ManifestImage['role']): string {
  switch (role) {
    case 'wide':
      return `Wide view of the ${studioName} broadcast studio environment, showing the set, lighting and surrounding camera positions.`;
    case 'alt':
      return `Alternate camera angle of the ${studioName} studio, with a production camera in the foreground.`;
    case 'detail':
      return `Production detail of the ${studioName} studio, framed between camera positions toward the presenter.`;
    case 'tech':
      return `Overhead technical view of the ${studioName} studio showing the surrounding multi-camera rig array.`;
  }
}

async function main() {
  const db = openDb();
  const applied = migrate(db);
  if (applied.length) console.log(`migrations applied: ${applied.join(', ')}`);

  const t = now();

  if (!existsSync(MANIFEST_PATH)) {
    throw new Error('Media manifest missing. Run `npm run build:media` (or `npm run build`) first.');
  }
  const manifest: Manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
  const mediaByStudio = new Map(manifest.studios.map((s) => [s.slug, s]));

  // ---- Initial administrator ------------------------------------------------
  // Credentials come from the environment so nothing secret is committed. When
  // no password is supplied a strong one is generated and printed exactly once.
  // Hashing is async, so it happens before the synchronous seed transaction.
  const adminEmail = (process.env.LM_ADMIN_EMAIL ?? 'miracle@gmail.com').trim();
  const adminEmailKey = adminEmail.toLowerCase();
  const adminExists = db.prepare('SELECT id FROM users WHERE email_key = ?').get(adminEmailKey) as
    | { id: number }
    | undefined;

  let newAdmin: { password: string; hash: string; generated: boolean } | null = null;
  if (!adminExists) {
    const generated = !process.env.LM_ADMIN_PASSWORD;
    const password = process.env.LM_ADMIN_PASSWORD ?? `${randomToken(12)}Aa1!`;
    newAdmin = { password, hash: await hashPassword(password), generated };
  }

  const seed = db.transaction(() => {
    // ---- Roles ------------------------------------------------------------
    const upsertRole = db.prepare(`
      INSERT INTO roles (slug, name, description, permissions, sort_order)
      VALUES (@slug, @name, @description, @permissions, @sort_order)
      ON CONFLICT(slug) DO UPDATE SET
        name = excluded.name,
        description = excluded.description,
        permissions = excluded.permissions,
        sort_order = excluded.sort_order
    `);
    for (const r of ROLES) {
      upsertRole.run({ ...r, permissions: JSON.stringify(r.permissions) });
    }
    const roleId = (slug: string): number =>
      (db.prepare('SELECT id FROM roles WHERE slug = ?').get(slug) as { id: number }).id;

    if (newAdmin) {
      db.prepare(`
        INSERT INTO users (email, email_key, name, password_hash, role_id, is_active,
                           must_change_pw, created_at, updated_at)
        VALUES (@email, @email_key, 'Administrator', @hash, @role_id, 1, @must_change, @t, @t)
      `).run({
        email: adminEmail,
        email_key: adminEmailKey,
        hash: newAdmin.hash,
        role_id: roleId('super_admin'),
        // A generated password must be changed on first sign-in.
        must_change: newAdmin.generated ? 1 : 0,
        t,
      });
    }

    // ---- Pages -------------------------------------------------------------
    const upsertPage = db.prepare(`
      INSERT INTO pages (slug, title, nav_label, show_in_nav, is_published, sort_order, updated_at)
      VALUES (@slug, @title, @nav_label, @show_in_nav, 1, @sort_order, @t)
      ON CONFLICT(slug) DO UPDATE SET
        title = excluded.title, nav_label = excluded.nav_label,
        show_in_nav = excluded.show_in_nav, sort_order = excluded.sort_order,
        updated_at = excluded.updated_at
    `);
    for (const p of PAGES) upsertPage.run({ ...p, t });

    // ---- Content blocks ----------------------------------------------------
    // Only insert; an existing block may carry administrator edits.
    const insertBlock = db.prepare(`
      INSERT INTO content_blocks (page, block_key, value, value_type, label, hint, sort_order, updated_at)
      VALUES (@page, @key, @value, @type, @label, @hint, @sort_order, @t)
      ON CONFLICT(page, block_key) DO UPDATE SET
        label = excluded.label,
        hint = excluded.hint,
        sort_order = excluded.sort_order,
        -- Refresh the seeded copy only while nobody has edited it.
        value = CASE WHEN content_blocks.updated_by IS NULL THEN excluded.value ELSE content_blocks.value END,
        value_type = CASE WHEN content_blocks.updated_by IS NULL THEN excluded.value_type ELSE content_blocks.value_type END
    `);
    CONTENT_BLOCKS.forEach((blk, i) =>
      insertBlock.run({ ...blk, type: blk.type ?? 'text', hint: blk.hint ?? '', sort_order: i, t }),
    );

    // ---- Site settings -----------------------------------------------------
    const insertSetting = db.prepare(`
      INSERT INTO site_settings (key, value, value_type, label, hint, group_key, sort_order, updated_at)
      VALUES (@key, @value, @type, @label, @hint, @group, @sort_order, @t)
      ON CONFLICT(key) DO UPDATE SET
        label = excluded.label, hint = excluded.hint,
        group_key = excluded.group_key, sort_order = excluded.sort_order,
        value = CASE WHEN site_settings.updated_by IS NULL THEN excluded.value ELSE site_settings.value END
    `);
    SITE_SETTINGS.forEach((s, i) =>
      insertSetting.run({ ...s, hint: s.hint ?? '', sort_order: i, t }),
    );

    // ---- SEO ----------------------------------------------------------------
    const insertSeo = db.prepare(`
      INSERT INTO seo_metadata (route, title, description, canonical, robots, updated_at)
      VALUES (@route, @title, @description, '', 'index,follow', @t)
      ON CONFLICT(route) DO NOTHING
    `);
    for (const s of SEO_ROUTES) insertSeo.run({ ...s, t });

    // ---- Locations -----------------------------------------------------------
    const upsertLocation = db.prepare(`
      INSERT INTO locations (slug, country, country_code, city, address, email, phone,
                             studio_availability, services, map_x, map_y, is_published, sort_order, updated_at)
      VALUES (@slug, @country, @country_code, @city, @address, @email, @phone,
              @studio_availability, @services, @map_x, @map_y, 1, @sort_order, @t)
      ON CONFLICT(slug) DO UPDATE SET
        country = excluded.country, country_code = excluded.country_code,
        map_x = excluded.map_x, map_y = excluded.map_y, sort_order = excluded.sort_order
    `);
    LOCATIONS.forEach((l, i) =>
      upsertLocation.run({ ...l, services: JSON.stringify(l.services), sort_order: i, t }),
    );

    // ---- Services -------------------------------------------------------------
    const upsertService = db.prepare(`
      INSERT INTO services (slug, code, title, summary, body, inclusions, icon,
                            cta_label, seo_title, seo_description, is_published, sort_order, created_at, updated_at)
      VALUES (@slug, @code, @title, @summary, @body, @inclusions, @icon,
              'REQUEST A DEMO', @seo_title, @seo_description, 1, @sort_order, @t, @t)
      ON CONFLICT(slug) DO UPDATE SET
        code = excluded.code, title = excluded.title, summary = excluded.summary,
        body = excluded.body, inclusions = excluded.inclusions, icon = excluded.icon,
        sort_order = excluded.sort_order, updated_at = excluded.updated_at
    `);
    SERVICES.forEach((s, i) =>
      upsertService.run({
        slug: s.slug, code: s.code, title: s.title, summary: s.summary, body: s.body,
        inclusions: JSON.stringify(s.inclusions), icon: s.icon,
        seo_title: `${s.title} — Live Miracle`,
        seo_description: s.summary,
        sort_order: i, t,
      }),
    );

    // ---- Media (managed build assets) -------------------------------------------
    const upsertMedia = db.prepare(`
      INSERT INTO media (kind, storage_key, original_name, mime, bytes, width, height,
                         alt, caption, variants, lqip, dominant, is_managed, created_at, updated_at)
      VALUES ('image', @storage_key, @original_name, 'image/jpeg', @bytes, @width, @height,
              @alt, '', @variants, @lqip, @dominant, 1, @t, @t)
      ON CONFLICT(storage_key) DO UPDATE SET
        variants = excluded.variants, lqip = excluded.lqip, dominant = excluded.dominant,
        width = excluded.width, height = excluded.height, bytes = excluded.bytes,
        -- Alt text is editorial; keep any administrator edit.
        alt = CASE WHEN media.alt = '' THEN excluded.alt ELSE media.alt END,
        updated_at = excluded.updated_at
      RETURNING id
    `);
    const mediaIdFor = db.prepare('SELECT id FROM media WHERE storage_key = ?');

    // ---- Studios --------------------------------------------------------------
    const upsertStudio = db.prepare(`
      INSERT INTO studios (slug, code, name, tagline, description, environment, capacity,
                           production_characteristics, technical_capabilities, status,
                           availability_note, accent, cta_label, seo_title, seo_description,
                           is_published, sort_order, created_at, updated_at)
      VALUES (@slug, @code, @name, @tagline, @description, @environment, @capacity,
              @characteristics, @capabilities, 'available',
              @availability_note, @accent, 'REQUEST INFORMATION', @seo_title, @seo_description,
              1, @sort_order, @t, @t)
      ON CONFLICT(slug) DO UPDATE SET
        code = excluded.code, name = excluded.name, tagline = excluded.tagline,
        description = excluded.description, environment = excluded.environment,
        production_characteristics = excluded.production_characteristics,
        accent = excluded.accent, sort_order = excluded.sort_order,
        seo_title = excluded.seo_title, seo_description = excluded.seo_description,
        updated_at = excluded.updated_at
    `);
    const studioIdFor = db.prepare('SELECT id FROM studios WHERE slug = ?');
    const upsertStudioImage = db.prepare(`
      INSERT INTO studio_images (studio_id, media_id, role, position, alt, caption)
      VALUES (@studio_id, @media_id, @role, @position, @alt, @caption)
      ON CONFLICT(studio_id, position) DO UPDATE SET
        media_id = excluded.media_id, role = excluded.role,
        alt = CASE WHEN studio_images.alt = '' THEN excluded.alt ELSE studio_images.alt END
    `);
    // Every studio gets a video slot; it stays empty until an administrator
    // uploads footage, and the UI renders an explicit empty state meanwhile.
    const ensureVideoSlot = db.prepare(`
      INSERT INTO studio_videos (studio_id, media_id, poster_media_id, title, caption)
      VALUES (@studio_id, NULL, @poster_media_id, @title, '')
      ON CONFLICT(studio_id) DO UPDATE SET poster_media_id = excluded.poster_media_id
    `);

    const specs = TECHNICAL_SPEC_ROWS.map((label) => ({ label, value: PLACEHOLDER.value }));

    STUDIOS.forEach((s, i) => {
      const media = mediaByStudio.get(s.slug);
      if (!media) throw new Error(`No media manifest entry for studio ${s.slug}`);

      upsertStudio.run({
        slug: s.slug,
        code: `STUDIO ${String(i + 1).padStart(2, '0')}`,
        name: s.name,
        tagline: s.tagline,
        description: s.description,
        environment: s.environment,
        capacity: PLACEHOLDER.capacity,
        characteristics: JSON.stringify(s.characteristics),
        capabilities: JSON.stringify(specs),
        availability_note: PLACEHOLDER.availability,
        accent: media.accent,
        seo_title: `${s.name} — Studio Environment — Live Miracle`,
        seo_description: s.tagline
          ? `${s.name}: ${s.tagline.toLowerCase()}. ${s.description.slice(0, 110)}…`
          : s.description.slice(0, 150),
        sort_order: i,
        t,
      });

      const studioId = (studioIdFor.get(s.slug) as { id: number }).id;

      for (const img of media.images) {
        const storageKey = `studios/${s.slug}/${img.role}`;
        upsertMedia.run({
          storage_key: storageKey,
          original_name: img.sourceFile,
          bytes: img.bytes,
          width: img.width,
          height: img.height,
          alt: altFor(s.name, img.role),
          variants: JSON.stringify({
            avif: img.avif, webp: img.webp,
            avifSrcSet: img.avifSrcSet, webpSrcSet: img.webpSrcSet,
            role: img.role, roleLabel: img.roleLabel,
          }),
          lqip: img.lqip,
          dominant: img.dominant,
          t,
        });
        const mediaId = (mediaIdFor.get(storageKey) as { id: number }).id;

        upsertStudioImage.run({
          studio_id: studioId,
          media_id: mediaId,
          role: img.role,
          position: img.position,
          alt: altFor(s.name, img.role),
          caption: img.roleLabel,
        });
      }

      const posterKey = `studios/${s.slug}/wide`;
      const poster = mediaIdFor.get(posterKey) as { id: number } | undefined;
      ensureVideoSlot.run({
        studio_id: studioId,
        poster_media_id: poster?.id ?? null,
        title: `${s.name} — studio walkthrough`,
      });
    });

    // ---- Gallery ----------------------------------------------------------------
    const upsertCategory = db.prepare(`
      INSERT INTO gallery_categories (slug, name, sort_order) VALUES (@slug, @name, @sort_order)
      ON CONFLICT(slug) DO UPDATE SET name = excluded.name, sort_order = excluded.sort_order
    `);
    GALLERY_CATEGORIES.forEach((c, i) => upsertCategory.run({ ...c, sort_order: i }));

    // Populate the gallery from the studio imagery, mapping each frame's role to
    // the category it actually illustrates.
    const catId = (slug: string): number =>
      (db.prepare('SELECT id FROM gallery_categories WHERE slug = ?').get(slug) as { id: number }).id;
    const roleToCategory: Record<string, string> = {
      wide: 'studios',
      alt: 'production',
      detail: 'people',
      tech: 'cameras',
    };
    const galleryExists = db.prepare('SELECT id FROM gallery WHERE media_id = ?');
    const insertGallery = db.prepare(`
      INSERT INTO gallery (media_id, category_id, studio_id, title, caption, alt, is_published, sort_order, created_at)
      VALUES (@media_id, @category_id, @studio_id, @title, @caption, @alt, 1, @sort_order, @t)
    `);

    let order = 0;
    for (const s of STUDIOS) {
      const studioId = (studioIdFor.get(s.slug) as { id: number }).id;
      const media = mediaByStudio.get(s.slug)!;
      for (const img of media.images) {
        const row = mediaIdFor.get(`studios/${s.slug}/${img.role}`) as { id: number };
        if (galleryExists.get(row.id)) continue;
        insertGallery.run({
          media_id: row.id,
          category_id: catId(roleToCategory[img.role]),
          studio_id: studioId,
          title: s.name,
          caption: `${s.name} — ${img.roleLabel.toLowerCase()}`,
          alt: altFor(s.name, img.role),
          sort_order: order++,
          t,
        });
      }
    }

    // ---- Timeline placeholders ------------------------------------------------
    const timelineCount = (db.prepare('SELECT COUNT(*) c FROM timeline_events').get() as { c: number }).c;
    if (timelineCount === 0) {
      const insertTimeline = db.prepare(`
        INSERT INTO timeline_events (year, event, description, is_published, sort_order, updated_at)
        VALUES (@year, @event, @description, 1, @sort_order, @t)
      `);
      TIMELINE_PLACEHOLDERS.forEach((e, i) => insertTimeline.run({ ...e, sort_order: i, t }));
    }
  });

  seed();

  const counts = (table: string) =>
    (db.prepare(`SELECT COUNT(*) c FROM ${table}`).get() as { c: number }).c;

  console.log('seed complete');
  for (const table of [
    'roles', 'users', 'pages', 'content_blocks', 'site_settings', 'seo_metadata',
    'locations', 'services', 'studios', 'studio_images', 'studio_videos',
    'media', 'gallery', 'gallery_categories', 'timeline_events',
  ]) {
    console.log(`  ${table.padEnd(20)} ${counts(table)}`);
  }

  if (newAdmin) {
    console.log('\n' + '='.repeat(62));
    console.log('  INITIAL ADMINISTRATOR CREATED');
    console.log(`  Sign in at /admin/login`);
    console.log(`  Email:    ${adminEmail}`);
    if (newAdmin.generated) {
      console.log(`  Password: ${newAdmin.password}`);
      console.log('  This password was generated and is shown ONCE.');
      console.log('  You will be required to change it at first sign-in.');
    } else {
      console.log('  Password: (taken from LM_ADMIN_PASSWORD)');
    }
    console.log('='.repeat(62) + '\n');
  } else {
    console.log(`\nadmin: ${adminEmail} already exists — left unchanged\n`);
  }

  db.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
