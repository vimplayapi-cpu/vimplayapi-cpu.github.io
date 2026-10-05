'use client';

import { useState } from 'react';

import { CapabilityIcon } from '@/components/icons/CapabilityIcon';
import { useGsapContext, usePrefersReducedMotion } from '@/lib/motion/useGsap';
import { cn } from '@/lib/cn';

export interface TechNode {
  key: string;
  label: string;
  description: string;
}

/**
 * The signal-path diagram.
 *
 * A central studio node with eight connections radiating outward. The lines
 * *draw* as the section enters — the point being that these are one connected
 * path, not eight independent boxes. Selecting a node explains it.
 *
 * Deliberately carries no numbers or specifications: per the brief, technical
 * claims come from the CMS, and this diagram asserts structure only.
 */
export function TechDiagram({ nodes }: { nodes: TechNode[] }) {
  const [active, setActive] = useState<string | null>(null);
  const reduced = usePrefersReducedMotion();

  const ref = useGsapContext<HTMLDivElement>(
    ({ gsap, root }) => {
      const lines = root.querySelectorAll<SVGPathElement>('[data-tech-line]');
      const dots = root.querySelectorAll('[data-tech-node]');
      const core = root.querySelector('[data-tech-core]');

      gsap.set(lines, { strokeDasharray: (i, el: SVGPathElement) => el.getTotalLength() });

      const tl = gsap.timeline({
        scrollTrigger: { trigger: root, start: 'top 72%', once: true },
      });

      tl.fromTo(core, { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.8, ease: 'power3.out' })
        .fromTo(
          lines,
          { strokeDashoffset: (i, el: SVGPathElement) => el.getTotalLength() },
          { strokeDashoffset: 0, duration: 1.1, stagger: 0.07, ease: 'power2.inOut' },
          0.35,
        )
        .fromTo(
          dots,
          { scale: 0.3, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.5, stagger: 0.07, ease: 'back.out(2)' },
          0.8,
        );
    },
    [nodes.length],
    !reduced,
  );

  // Eight nodes on a circle, starting at the top.
  const R = 190;
  const CX = 300;
  const CY = 250;
  const positions = nodes.map((_, i) => {
    const angle = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
    return { x: CX + Math.cos(angle) * R, y: CY + Math.sin(angle) * R };
  });

  const activeNode = nodes.find((n) => n.key === active) ?? null;

  return (
    <div ref={ref} className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
      {/* Diagram */}
      <div className="relative mx-auto w-full max-w-[600px]">
        <svg
          viewBox="0 0 600 500"
          className="h-auto w-full"
          role="img"
          aria-label="Diagram: a central studio connected to cameras, lighting, audio, control, encoding, streaming, monitoring and distribution."
        >
          {/* Connections */}
          {positions.map((p, i) => (
            <path
              key={nodes[i].key}
              data-tech-line
              d={`M ${CX} ${CY} L ${p.x} ${p.y}`}
              stroke={active === nodes[i].key ? '#3DDCE8' : 'rgba(242,245,248,0.16)'}
              strokeWidth={active === nodes[i].key ? 1.5 : 1}
              fill="none"
              className="transition-all duration-500"
              style={reduced ? undefined : { strokeDashoffset: 0 }}
            />
          ))}

          {/* Central studio */}
          <g data-tech-core>
            <circle cx={CX} cy={CY} r="62" fill="#0A0D12" stroke="rgba(61,220,232,0.35)" strokeWidth="1" />
            <circle cx={CX} cy={CY} r="46" fill="none" stroke="rgba(61,220,232,0.18)" strokeWidth="1" />
            <text
              x={CX}
              y={CY - 4}
              textAnchor="middle"
              className="fill-chalk font-mono"
              style={{ fontSize: 13, letterSpacing: '0.18em' }}
            >
              STUDIO
            </text>
            <text
              x={CX}
              y={CY + 14}
              textAnchor="middle"
              className="fill-muted font-mono"
              style={{ fontSize: 10, letterSpacing: '0.2em' }}
            >
              ENVIRONMENT
            </text>
          </g>

          {/* Nodes */}
          {positions.map((p, i) => {
            const node = nodes[i];
            const isActive = active === node.key;
            // Keep labels from colliding with the circle: flip side by x.
            const anchor = p.x < CX - 20 ? 'end' : p.x > CX + 20 ? 'start' : 'middle';
            const dx = anchor === 'end' ? -18 : anchor === 'start' ? 18 : 0;
            const dy = anchor === 'middle' ? (p.y < CY ? -20 : 28) : 4;

            return (
              <g
                key={node.key}
                data-tech-node
                className="cursor-pointer"
                onMouseEnter={() => setActive(node.key)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(node.key)}
                onBlur={() => setActive(null)}
                onClick={() => setActive((v) => (v === node.key ? null : node.key))}
                tabIndex={0}
                role="button"
                aria-pressed={isActive}
                aria-label={`${node.label}: ${node.description}`}
              >
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="11"
                  fill={isActive ? '#3DDCE8' : '#0A0D12'}
                  stroke={isActive ? '#3DDCE8' : 'rgba(242,245,248,0.3)'}
                  strokeWidth="1"
                  className="transition-all duration-300"
                />
                <text
                  x={p.x + dx}
                  y={p.y + dy}
                  textAnchor={anchor}
                  className={cn('font-mono transition-colors duration-300', isActive ? 'fill-signal' : 'fill-mist')}
                  style={{ fontSize: 11, letterSpacing: '0.16em' }}
                >
                  {node.label.toUpperCase()}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Readout */}
      <div>
        <div className="panel min-h-[9rem] p-7">
          {activeNode ? (
            <>
              <div className="flex items-center gap-4 text-signal">
                <CapabilityIcon name={activeNode.key} size={28} />
                <p className="font-mono text-tech uppercase">{activeNode.label}</p>
              </div>
              <p className="mt-5 text-sm leading-relaxed text-mist">{activeNode.description}</p>
            </>
          ) : (
            <>
              <p className="tech-label">Signal path</p>
              <p className="mt-5 text-sm leading-relaxed text-muted">
                Select any node to see what it covers. Every element sits on the same path — a
                decision at the camera affects the encoder, and a decision at the encoder affects
                what the viewer sees.
              </p>
            </>
          )}
        </div>

        {/* Node index, also the accessible list for keyboard/AT users */}
        <ul className="mt-6 grid grid-cols-2 gap-x-6">
          {nodes.map((node) => (
            <li key={node.key} className="border-b border-hairline">
              <button
                type="button"
                onMouseEnter={() => setActive(node.key)}
                onMouseLeave={() => setActive(null)}
                onClick={() => setActive((v) => (v === node.key ? null : node.key))}
                className={cn(
                  'flex w-full items-center justify-between gap-3 py-3 text-left font-mono text-tech uppercase transition-colors',
                  active === node.key ? 'text-signal' : 'text-mist hover:text-chalk',
                )}
              >
                {node.label}
                <span
                  aria-hidden
                  className={cn(
                    'block h-1.5 w-1.5 shrink-0 rounded-full transition-colors',
                    active === node.key ? 'bg-signal' : 'bg-ash',
                  )}
                />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
