'use client';

import { useState } from 'react';

import { CmsValue, Index, isPlaceholder } from '@/components/ui';
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
  const marker = (i: number) => [{ x: 66, y: 30 }, { x: 69, y: 51 }, { x: 27, y: 44 }, { x: 42, y: 19 }][i] ?? { x: 50, y: 35 };

  return (
    <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-14">
      {/* Map */}
      <div className="regional-board relative aspect-[4/3] overflow-hidden sm:aspect-[16/10]">
        <svg
          viewBox="0 0 100 75"
          className="absolute inset-0 h-full w-full"
          role="group"
          aria-label={`Map showing Live Miracle markets: ${locations.map((l) => l.country).join(', ')}.`}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id="region-land" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fffdf7"/><stop offset="1" stopColor="#e5cf9e"/></linearGradient>
            <radialGradient id="region-pin" cx="30%" cy="20%"><stop stopColor="#cb5664"/><stop offset="1" stopColor="#790a1b"/></radialGradient>
            <filter id="region-depth" x="-30%" y="-30%" width="160%" height="180%"><feDropShadow dx="0" dy="2" stdDeviation="1.3" floodColor="#64481e" floodOpacity=".22"/></filter>
          </defs>
          <ellipse cx="50" cy="43" rx="39" ry="23" fill="#e4d4b2" opacity=".3" />
          <path d="M12 27 L49 9 L89 29 L89 48 L52 66 L12 47Z" fill="#c4a162" opacity=".55" />
          <path d="M12 25 L49 7 L89 27 L89 44 L52 62 L12 43Z" fill="url(#region-land)" stroke="#c1a36f" strokeWidth=".3" filter="url(#region-depth)" />
          {/* Graticule */}
          <g stroke="rgba(156,119,53,0.12)" strokeWidth="0.15">
            {Array.from({ length: 11 }, (_, i) => (
              <line key={`v${i}`} x1={i * 10} y1="0" x2={i * 10} y2="75" />
            ))}
            {Array.from({ length: 9 }, (_, i) => (
              <line key={`h${i}`} x1="0" y1={i * 10} x2="100" y2={i * 10} />
            ))}
          </g>

          {/* Connection lines between markets — the regional network */}
          {locations.map((loc, i) => {
            if (locations.length < 2) return null;
            return (
              <line
                key={`link-${loc.slug}`}
                x1={marker(i).x}
                y1={marker(i).y}
                x2={marker((i + 1) % locations.length).x}
                y2={marker((i + 1) % locations.length).y}
                stroke="#b38b44"
                strokeWidth="0.45"
                strokeDasharray="1 1.2"
              />
            );
          })}

          {/* Markers */}
          {locations.map((loc, i) => {
            const isActive = selected === loc.slug;
            return (
              <g
                key={loc.slug}
                transform={`translate(${marker(i).x} ${marker(i).y})`}
                className="cursor-pointer"
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(loc.slug); } }}
                onClick={() => setSelected(loc.slug)}
                onMouseEnter={() => setSelected(loc.slug)}
                onFocus={() => setSelected(loc.slug)}
                tabIndex={0}
                role="button"
                aria-pressed={isActive}
                aria-label={`${loc.country}${loc.studioCount ? ` — ${loc.studioCount} studios` : ''}`}
              >
                <ellipse cx="0" cy="2" rx="3" ry="1.2" fill="#745222" opacity=".18" />
                {isActive && (
                  <circle r="4.2" fill="none" stroke="#820b1b" strokeWidth="0.2" opacity="0.45" />
                )}
                <circle
                  r={isActive ? 2 : 1.5}
                  fill={isActive ? "url(#region-pin)" : "#b18a40"} stroke="#fff9e9" strokeWidth=".35"
                  className="transition-all duration-300"
                />
                <text
                  y="-4.5"
                  textAnchor="middle"
                  className={cn(
                    'font-mono transition-colors duration-300',
                    isActive ? 'fill-signal' : 'fill-mist',
                  )}
                  style={{ fontSize: 2.5, letterSpacing: '0.28' }}
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
