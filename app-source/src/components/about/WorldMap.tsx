'use client';
import { useState } from 'react';
import countries from './worldMapData.json';
import type { Location } from '@/lib/db/types';

// Natural Earth country outlines, equirectangular projection. Pins mark countries, not office addresses.
const markets: Record<string, { lon: number; lat: number; world: [number, number]; region: [number, number] }> = {
  Georgia: { lon: 43.5, lat: 42.1, world: [755, 90], region: [657, 119] },
  Armenia: { lon: 44.9, lat: 40.3, world: [778, 210], region: [657, 157] },
  Bulgaria: { lon: 25.5, lat: 42.7, world: [445, 184], region: [548, 151] },
  Ukraine: { lon: 31.2, lat: 48.5, world: [515, 52], region: [572, 95] },
};
const project = (lon: number, lat: number) => ({ x: (lon + 180) * 1000 / 360, y: (90 - lat) * 1000 / 360 });
export function WorldMap({ locations, selected, onSelect }: { locations: Location[]; selected: string | null; onSelect: (slug: string) => void }) {
  const [detail, setDetail] = useState(false);
  const active = locations.find(l => l.slug === selected)?.country;
  const scale = detail ? .15 : 1;
  return <div className="world-map-card">
    <div className="world-map-toolbar"><span>OUR GLOBAL FOOTPRINT</span><div role="group" aria-label="Map view"><button type="button" aria-pressed={!detail} onClick={() => setDetail(false)}>World</button><button type="button" aria-pressed={detail} onClick={() => setDetail(true)}>Regional detail</button></div></div>
    <svg viewBox={detail ? '530 77 170 108' : '0 0 1000 500'} role="group" aria-label="World map highlighting Georgia, Armenia, Bulgaria and Ukraine" className="world-map-svg">
      <defs><linearGradient id="world-land" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#e7d5aa"/><stop offset="1" stopColor="#cfaf73"/></linearGradient></defs>
      <g aria-hidden="true">{countries.map(c => <path key={c.name} d={c.d} fill={c.name === active ? '#820b1b' : markets[c.name] ? '#bc5661' : 'url(#world-land)'} stroke="#fffbf2" strokeWidth={detail ? '.22' : '.65'} fillRule="evenodd" />)}</g>
      {locations.map(loc => {
        const market = markets[loc.country];
        if (!market) return null;
        const p = project(market.lon, market.lat);
        const [x,y] = detail ? market.region : market.world;
        const isActive = selected === loc.slug;
        return <g key={loc.slug} className="world-map-marker" role="button" tabIndex={0} aria-label={`Locate ${loc.country}`} aria-pressed={isActive} onClick={() => onSelect(loc.slug)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(loc.slug); } }}>
          <path d={`M${p.x} ${p.y} L${x} ${y}`} fill="none" stroke={isActive ? '#820b1b' : '#88652c'} strokeWidth={1.5 * scale} />
          <circle cx={p.x} cy={p.y} r={7 * scale} fill="#820b1b" stroke="#fff8e8" strokeWidth={2 * scale} />
          <circle cx={p.x} cy={p.y} r={12 * scale} fill="none" stroke="#820b1b" strokeWidth={scale} opacity={isActive ? .65 : .25} />
          <rect x={x - 63 * scale} y={y - 17 * scale} width={126 * scale} height={34 * scale} rx={8 * scale} fill={isActive ? '#820b1b' : '#fffdf7'} stroke={isActive ? '#820b1b' : '#be9e63'} strokeWidth={scale} />
          <text x={x} y={y + 5 * scale} textAnchor="middle" fontSize={16 * scale} fontWeight="600" fill={isActive ? '#fff7e4' : '#503d25'}>{loc.country}</text>
        </g>;
      })}
    </svg>
    <div className="world-map-footer"><span><i /> Four markets · One operation</span><span>Country locations</span></div>
    <a className="world-map-credit" href="https://www.naturalearthdata.com/" target="_blank" rel="noreferrer">Map data: Natural Earth</a>
  </div>;
}
