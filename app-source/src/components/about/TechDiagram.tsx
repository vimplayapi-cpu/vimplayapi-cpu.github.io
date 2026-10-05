'use client';
import { useState } from 'react';
import { CapabilityIcon } from '@/components/icons/CapabilityIcon';

export interface TechNode { key: string; label: string; description: string }

export function TechDiagram({ nodes }: { nodes: TechNode[] }) {
  const [active, setActive] = useState(nodes[0]?.key ?? '');
  const selected = nodes.find(n => n.key === active);
  const positions = nodes.map((_, i) => {
    const angle = i / nodes.length * Math.PI * 2 - Math.PI / 2;
    return { x: 50 + Math.cos(angle) * 35, y: 50 + Math.sin(angle) * 35 };
  });
  return <div className="signal-layout">
    <div className="signal-board">
      <span className="diagram-eyebrow">CONNECTED PRODUCTION</span>
      <svg viewBox="0 0 100 100" className="signal-wires" aria-hidden="true">
        <circle cx="50" cy="50" r="35" fill="none" stroke="#c8ad78" strokeWidth=".25" strokeDasharray=".8 1.5" />
        {positions.map((p, i) => <path key={nodes[i].key} d={`M50 50 L${p.x} ${p.y}`} stroke={active === nodes[i].key ? '#820b1b' : '#bfa16a'} strokeWidth={active === nodes[i].key ? '.65' : '.35'} fill="none" />)}
      </svg>
      <div className="signal-core"><CapabilityIcon name="studio" size={32} /><strong>STUDIO</strong><span>ENVIRONMENT</span></div>
      {nodes.map((node, i) => <button key={node.key} type="button" className={`signal-node ${active === node.key ? 'is-active' : ''}`} style={{ left: `${positions[i].x}%`, top: `${positions[i].y}%` }} onClick={() => setActive(node.key)} aria-pressed={active === node.key} aria-label={node.label}>
        <span className="signal-node-icon"><CapabilityIcon name={node.key} size={25} /></span><span className="signal-node-label">{node.label}</span>
      </button>)}
      <span className="diagram-footnote">Select a component to explore the signal path</span>
    </div>
    <div className="signal-readout">
      <span className="diagram-eyebrow">SIGNAL PATH</span>
      {selected && <div className="signal-detail" aria-live="polite"><span className="detail-icon"><CapabilityIcon name={selected.key} size={32} /></span><h3>{selected.label}</h3><p>{selected.description}</p></div>}
      <p className="signal-context">Every element sits on the same path — a decision at the camera affects the encoder, and a decision at the encoder affects what the viewer sees.</p>
      <div className="signal-selectors">{nodes.map((node, i) => <button type="button" key={node.key} className={active === node.key ? 'is-active' : ''} onClick={() => setActive(node.key)} aria-pressed={active === node.key}><span>{String(i + 1).padStart(2, '0')}</span>{node.label}<span aria-hidden>↗</span></button>)}</div>
    </div>
  </div>;
}
