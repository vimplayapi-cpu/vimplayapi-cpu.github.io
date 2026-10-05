import Link from '@/components/ui/SiteLink';

import { CapabilityIcon } from '@/components/icons/CapabilityIcon';
import { Frame } from '@/components/media/Frame';
import { Reveal } from '@/components/motion/Reveal';
import { Arrow, SectionIntro } from '@/components/ui';
import type { ImageAsset } from '@/lib/db/types';

export interface CapabilityEntry {
  key: string;
  title: string;
  description: string;
  icon: string;
  href: string;
  image: ImageAsset | null;
  accent: string;
}

/** Existing service content presented as an editorial photo grid. */
export function Capabilities({ eyebrow, headline, body, items }: {
  eyebrow: string; headline: string; body: string; items: CapabilityEntry[];
}) {
  return (
    <section className="section relative border-t border-hairline" aria-label={eyebrow}>
      <div className="shell">
        <Reveal><SectionIntro eyebrow={eyebrow} headline={headline} body={body} className="max-w-4xl" /></Reveal>
        <ul className="lux-capabilities mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item, i) => (
            <li key={item.key}>
              <Reveal delay={(i % 3) * 70} className="h-full">
                <Link href={item.href} className="lux-service group flex h-full flex-col overflow-hidden rounded-2xl border border-hairline bg-white/[0.03]">
                  <div className="relative aspect-[16/10] overflow-hidden">
                    {item.image && <Frame image={item.image} sizes="(max-width: 767px) 92vw, (max-width: 1023px) 46vw, 30vw" className="h-full" imgClassName="transition-transform duration-700 group-hover:scale-105" />}
                    <span className="absolute inset-0 bg-gradient-to-t from-void/80 to-transparent" aria-hidden />
                    <span className="absolute left-5 top-5 rounded-full border border-white/15 bg-black/50 px-3 py-2 font-mono text-tech text-chalk">0{i + 1}</span>
                    <span className="absolute bottom-5 right-5 text-signal" aria-hidden><CapabilityIcon name={item.icon} /></span>
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <h3 className="text-xl leading-snug">{item.title}</h3>
                    <p className="mb-7 mt-3 text-sm leading-relaxed text-mist">{item.description}</p>
                    <span className="mt-auto flex items-center justify-between border-t border-hairline pt-5 font-mono text-tech text-signal">EXPLORE<Arrow /></span>
                  </div>
                </Link>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
