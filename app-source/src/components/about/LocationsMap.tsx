'use client';

import { useState } from 'react';

import { CmsValue, Index } from '@/components/ui';
import type { Location } from '@/lib/db/types';
import { cn } from '@/lib/cn';

/**
 * Interactive markets map.
 *
 * Drawn as an abstract graticule rather than a real tile map: it needs no
 * third-party map service (which would breach the site's CSP and add tracking),
 * it stays on-brand as a technical schematic, and marker positions are stored
 * as normalised 0–100 coordinates that an administrator can nudge in the CMS.
 *
 * Address lines are intentionally omitted until an administrator supplies them
 * (brief §17) — an unset address renders nothing rather than a placeholder.
 */
export function LocationsMap({ locations }: { locations: Location[] }) {
  const [selected, setSelected] = useState<string | null>(locations[0]?.slug ?? null);
  const active = locations.find((l) => l.slug === selected) ?? null;

  return (
    <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-14">
      {/* Map */}
      <div className="panel relative aspect-[4/3] overflow-hidden bg-midnight/60 sm:aspect-[16/10]">
        <svg
          viewBox="0 0 100 75"
          className="absolute inset-0 h-full w-full"
          role="img"
          aria-label={`Map showing Live Miracle markets: ${locations.map((l) => l.country).join(', ')}.`}
          preserveAspectRatio="xMidYMid slice"
        >
          {/* Graticule */}
          <g stroke="rgba(242,245,248,0.06)" strokeWidth="0.15">
            {Array.from({ length: 11 }, (_, i) => (
              <line key={`v${i}`} x1={i * 10} y1="0" x2={i * 10} y2="75" />
            ))}
            {Array.from({ length: 9 }, (_, i) => (
              <line key={`h${i}`} x1="0" y1={i * 10} x2="100" y2={i * 10} />
            ))}
          </g>

          {/* Connection lines between markets — the regional network */}
          {locations.map((loc, i) => {
            const next = locations[(i + 1) % locations.length];
            if (locations.length < 2) return null;
            return (
              <line
                key={`link-${loc.slug}`}
                x1={loc.mapX}
                y1={loc.mapY}
                x2={next.mapX}
                y2={next.mapY}
                stroke="rgba(61,220,232,0.18)"
                strokeWidth="0.2"
                strokeDasharray="1 1.2"
              />
            );
          })}

          {/* Markers */}
          {locations.map((loc) => {
            const isActive = selected === loc.slug;
            return (
              <g
                key={loc.slug}
                transform={`translate(${loc.mapX} ${loc.mapY})`}
                className="cursor-pointer"
                onClick={() => setSelected(loc.slug)}
                onMouseEnter={() => setSelected(loc.slug)}
                onFocus={() => setSelected(loc.slug)}
                tabIndex={0}
                role="button"
                aria-pressed={isActive}
                aria-label={`${loc.country}${loc.studioCount ? ` — ${loc.studioCount} studios` : ''}`}
              >
                {isActive && (
                  <circle r="4.2" fill="none" stroke="#3DDCE8" strokeWidth="0.2" opacity="0.5" />
                )}
                <circle
                  r={isActive ? 1.6 : 1.1}
                  fill={isActive ? '#3DDCE8' : 'rgba(242,245,248,0.55)'}
                  className="transition-all duration-300"
                />
                <text
                  y="-3"
                  textAnchor="middle"
                  className={cn(
                    'font-mono transition-colors duration-300',
                    isActive ? 'fill-signal' : 'fill-mist',
                  )}
                  style={{ fontSize: 2.4, letterSpacing: '0.28' }}
                >
                  {loc.country.toUpperCase()}
                </text>
              </g>
            );
          })}
        </svg>

        <div aria-hidden className="pointer-events-none absolute inset-0 grain" />
        <p className="pointer-events-none absolute bottom-3 left-4 font-mono text-tech-sm uppercase text-muted">
          Regional presence · schematic
        </p>
      </div>

      {/* Detail panel */}
      <div>
        <ul className="border-t border-hairline">
          {locations.map((loc, i) => {
            const isActive = selected === loc.slug;
            return (
              <li key={loc.slug} className="border-b border-hairline">
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
