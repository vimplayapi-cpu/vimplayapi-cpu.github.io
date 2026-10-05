import { cn } from '@/lib/cn';

/**
 * Capability icons.
 *
 * Drawn specifically for this project rather than pulled from a generic set:
 * each one depicts real broadcast apparatus (a camera on a pedestal, a set
 * plan, a signal path, an operator position, a rack, a monitored path) at a
 * consistent 1px stroke on a 24-unit grid, so a row of them reads as one
 * technical drawing.
 */

const base = 'shrink-0';
const strokeProps = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.25,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export type IconKey =
  | 'studio' | 'design' | 'stream' | 'shared' | 'staff' | 'training' | 'support'
  | 'camera' | 'lighting' | 'audio' | 'control' | 'encoding' | 'streaming'
  | 'monitoring' | 'distribution';

export function CapabilityIcon({
  name,
  className,
  size = 30,
}: {
  name: string;
  className?: string;
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    'aria-hidden': true,
    className: cn(base, className),
  };

  switch (name) {
    // Studio production — camera body on a pedestal
    case 'studio':
    case 'camera':
      return (
        <svg {...common}>
          <g {...strokeProps}>
            <rect x="2.5" y="6" width="12" height="8" />
            <path d="M14.5 8.5l5-2.5v8l-5-2.5z" />
            <path d="M8.5 14v5M5 21h7M4.5 6V4.5M8 6V4.5" />
          </g>
        </svg>
      );

    // Custom design — set plan with a marked-out area
    case 'design':
      return (
        <svg {...common}>
          <g {...strokeProps}>
            <path d="M2.5 4.5h19v15h-19z" />
            <path d="M2.5 9h6v10.5M8.5 9h13M14 9v5.5h7.5" />
            <circle cx="5.5" cy="14" r="1.75" />
          </g>
        </svg>
      );

    // Streaming technology — signal radiating from a node
    case 'stream':
    case 'streaming':
      return (
        <svg {...common}>
          <g {...strokeProps}>
            <circle cx="12" cy="12" r="2.25" />
            <path d="M8.1 8.1a5.5 5.5 0 0 0 0 7.8M15.9 15.9a5.5 5.5 0 0 0 0-7.8" />
            <path d="M5.3 5.3a9.5 9.5 0 0 0 0 13.4M18.7 18.7a9.5 9.5 0 0 0 0-13.4" />
          </g>
        </svg>
      );

    // Shared production — two overlapping operating areas
    case 'shared':
      return (
        <svg {...common}>
          <g {...strokeProps}>
            <rect x="2.5" y="5.5" width="12" height="13" />
            <path d="M9.5 5.5h12v13h-12" strokeDasharray="2.5 2.5" />
            <path d="M6 10.5h5M6 13.5h5" />
          </g>
        </svg>
      );

    // Staff — operator at a control position
    case 'staff':
      return (
        <svg {...common}>
          <g {...strokeProps}>
            <circle cx="12" cy="7" r="3" />
            <path d="M5.5 20v-1.5a6.5 6.5 0 0 1 13 0V20" />
            <path d="M2.5 20h19" />
          </g>
        </svg>
      );

    // Training — procedure sheet with checked steps
    case 'training':
      return (
        <svg {...common}>
          <g {...strokeProps}>
            <path d="M4.5 3.5h15v17h-15z" />
            <path d="M7.5 8.5l1.5 1.5 3-3M7.5 14.5l1.5 1.5 3-3" />
            <path d="M14 8.5h3M14 15.5h3" />
          </g>
        </svg>
      );

    // Technical support — rack unit with status
    case 'support':
      return (
        <svg {...common}>
          <g {...strokeProps}>
            <rect x="3.5" y="3.5" width="17" height="6" />
            <rect x="3.5" y="14.5" width="17" height="6" />
            <path d="M6.5 6.5h1M6.5 17.5h1" />
            <path d="M12 9.5v5" />
          </g>
          <circle cx="17" cy="6.5" r="1" fill="currentColor" />
          <circle cx="17" cy="17.5" r="1" fill="currentColor" />
        </svg>
      );

    // Lighting — fresnel with barn doors
    case 'lighting':
      return (
        <svg {...common}>
          <g {...strokeProps}>
            <path d="M8 3.5h8l2 5H6z" />
            <path d="M12 8.5V13M8 21h8M12 17v4" />
            <circle cx="12" cy="15" r="2" />
          </g>
        </svg>
      );

    // Audio — capsule microphone
    case 'audio':
      return (
        <svg {...common}>
          <g {...strokeProps}>
            <rect x="9.5" y="2.5" width="5" height="11" rx="2.5" />
            <path d="M6 11.5a6 6 0 0 0 12 0M12 17.5V21M9 21h6" />
          </g>
        </svg>
      );

    // Control — vision mixer bank
    case 'control':
      return (
        <svg {...common}>
          <g {...strokeProps}>
            <rect x="2.5" y="4.5" width="19" height="15" />
            <path d="M2.5 12.5h19M6 8h3M11 8h3M16 8h2M6 16h2M10 16h8" />
          </g>
        </svg>
      );

    // Encoding — signal converted into stream packets
    case 'encoding':
      return (
        <svg {...common}>
          <g {...strokeProps}>
            <path d="M2.5 12h5M16.5 12h5" />
            <rect x="7.5" y="7.5" width="9" height="9" />
            <path d="M10.5 10.5h3M10.5 13.5h3" />
          </g>
        </svg>
      );

    // Monitoring — waveform under observation
    case 'monitoring':
      return (
        <svg {...common}>
          <g {...strokeProps}>
            <rect x="2.5" y="4.5" width="19" height="12" />
            <path d="M5.5 11l2.5-3 2.5 5 2.5-7 2.5 5 2-2" />
            <path d="M8.5 20h7M12 16.5V20" />
          </g>
        </svg>
      );

    // Distribution — one source to many destinations
    case 'distribution':
      return (
        <svg {...common}>
          <g {...strokeProps}>
            <circle cx="4.5" cy="12" r="2" />
            <circle cx="19.5" cy="5.5" r="2" />
            <circle cx="19.5" cy="12" r="2" />
            <circle cx="19.5" cy="18.5" r="2" />
            <path d="M6.5 12h4M10.5 12V6.5h7M10.5 12h7M10.5 12v5.5h7" />
          </g>
        </svg>
      );

    default:
      return (
        <svg {...common}>
          <g {...strokeProps}>
            <rect x="3.5" y="3.5" width="17" height="17" />
            <path d="M8 12h8" />
          </g>
        </svg>
      );
  }
}
