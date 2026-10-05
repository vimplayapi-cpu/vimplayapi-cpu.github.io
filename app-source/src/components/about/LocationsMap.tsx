'use client';

import { useState } from 'react';

import { CmsValue, Index, isPlaceholder } from '@/components/ui';
import type { Location } from '@/lib/db/types';
import { cn } from '@/lib/cn';
import { WorldMap } from './WorldMap';

/** Geographic markets map with synchronized country details. */
export function LocationsMap({ locations }: { locations: Location[] }) {
  const [selected, setSelected] = useState<string | null>(locations[0]?.slug ?? null);


  return (
    <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-14">
      <WorldMap locations={locations} selected={selected} onSelect={setSelected} />

      {/* Detail panel */}
      <div className="regional-details">
        <ul className="border-t border-hairline">
          {locations.map((loc, i) => {
            const isActive = selected === loc.slug;
            return (
              <li key={loc.slug} className={`region-card ${isActive ? "is-active" : ""}`}>
                <button
                  type="button"
                  onClick={() => setSelected(isActive ? null : loc.slug)}
                  aria-expanded={isActive}
                  className="flex w-full items-center justify-between gap-4 py-5 text-left"
                >
                  <span className="flex items-center gap-5">
                    <Index value={i + 1} />
                    <span
                      className={cn(
                        'font-display text-xl font-semibold uppercase tracking-tight transition-colors sm:text-2xl',
                        isActive ? 'text-signal' : 'text-chalk',
                      )}
                    >
                      {loc.country}
                    </span>
                  </span>
                  <span
                    aria-hidden
                    className={cn(
                      'block h-px w-5 shrink-0 transition-all duration-500',
                      isActive ? 'w-9 bg-signal' : 'bg-ash',
                    )}
                  />
                </button>

                {/* Expanded card */}
                <div
                  className={cn(
                    'grid transition-[grid-template-rows,opacity] duration-500 ease-cinematic',
                    isActive ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
                  )}
                >
                  <div className="overflow-hidden">
                    <dl className="space-y-4 pb-6">
                      <Row label="City" value={loc.city} />
                      {/* Address is published only when actually supplied. */}
                      {loc.address && <Row label="Address" value={loc.address} />}
                      {loc.email && <Row label="Email" value={loc.email} href={`mailto:${loc.email}`} />}
                      {loc.phone && <Row label="Phone" value={loc.phone} href={`tel:${loc.phone}`} />}
                      <Row label="Studio availability" value={loc.studioAvailability} />
                      {loc.studioCount > 0 && (
                        <Row label="Studios assigned" value={String(loc.studioCount)} />
                      )}
                      {loc.services.length > 0 && (
                        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
                          <dt className="tech-label">Services</dt>
                          <dd className="text-right text-sm text-mist">
                            {loc.services.join(' · ')}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <p className="mt-6 text-xs leading-relaxed text-muted">
          Site addresses are published only where an administrator has supplied them.
        </p>
      </div>
    </div>
  );
}

function Row({ label, value, href }: { label: string; value: string; href?: string }) {
  if (!value || isPlaceholder(value)) return null;
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
      <dt className="tech-label">{label}</dt>
      <dd className="text-right text-sm text-mist">
        {href ? (
          <a href={href} className="link-draw text-chalk">
            {value}
          </a>
        ) : (
          <CmsValue value={value} />
        )}
      </dd>
    </div>
  );
}
