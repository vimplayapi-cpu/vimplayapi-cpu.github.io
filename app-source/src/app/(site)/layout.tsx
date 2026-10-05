import { Beacon } from '@/components/analytics/Beacon';
import { Footer } from '@/components/layout/Footer';
import { Header, type NavItem } from '@/components/layout/Header';
import { WhatsAppButton } from '@/components/layout/WhatsAppButton';
import {
  block, getBlocks, getLocations, getNavPages, getServices, getSettings, setting, settingBool,
} from '@/lib/db/queries';

/**
 * Public site shell.
 *
 * Everything variable here — nav labels, CTA text, footer copy, the WhatsApp
 * number, social links — is read from the CMS on the server, so none of it
 * requires a deploy to change and no contact details are baked into the
 * client bundle.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  const blocks = getBlocks('global');
  const settings = getSettings();
  const services = getServices();
  const locations = getLocations();

  const navPages = getNavPages();
  const items: NavItem[] = navPages.map((p) => ({
    href: p.slug === '' ? '/' : `/${p.slug}`,
    label: p.nav_label,
  }));

  const ctaLabel = block(blocks, 'nav.cta', 'REQUEST A DEMO');
  const email = setting(settings, 'contact.email', 'miracle@gmail.com');

  // The WhatsApp button appears only when explicitly enabled AND a number has
  // been saved — an enabled toggle with no number renders nothing.
  const whatsappEnabled = settingBool(settings, 'whatsapp.enabled');
  const whatsappNumber = setting(settings, 'whatsapp.number');

  const socials = [
    { label: 'Instagram', href: setting(settings, 'social.instagram.url') },
    { label: 'LinkedIn', href: setting(settings, 'social.linkedin.url') },
    { label: 'YouTube', href: setting(settings, 'social.youtube.url') },
  ].filter((s) => s.href !== '');

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>

      <Header items={items} ctaLabel={ctaLabel} />

      <main id="main" className="relative">
        {children}
      </main>

      <Footer
        statement={block(
          blocks,
          'footer.statement',
          'Broadcast studio environments, production infrastructure and trained operational teams.',
        )}
        legalLine={block(blocks, 'footer.legal', '© {year} Live Miracle. All rights reserved.')}
        email={email}
        locations={locations.map((l) => ({ slug: l.slug, country: l.country, city: l.city }))}
        services={services.map((s) => ({ slug: s.slug, title: s.title }))}
        socials={socials}
        ctaLabel={ctaLabel}
      />

      {whatsappEnabled && whatsappNumber && (
        <WhatsAppButton
          number={whatsappNumber}
          message={setting(settings, 'whatsapp.message')}
        />
      )}

      <Beacon />
    </>
  );
}
