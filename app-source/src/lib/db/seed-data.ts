/**
 * Seed content for Live Miracle.
 *
 * Editorial rule (brief §36): nothing factual is invented. Studio copy
 * describes only what is observably present in the supplied photography —
 * set construction, lighting character, camera coverage. Every claim that
 * would require knowledge we do not have (capacity, hard specifications,
 * which city a set physically lives in, company history, statistics) is
 * seeded as a bracketed placeholder for the administrator to complete.
 */

export const PLACEHOLDER = {
  capacity: '[ADD CAPACITY]',
  value: '[ADD SPECIFICATION]',
  count: '[ADD COUNT]',
  availability: '[ADD AVAILABILITY DETAIL]',
  address: '[ADD ADDRESS]',
  phone: '[ADD PHONE NUMBER]',
  city: '[ADD CITY]',
  year: '[ADD YEAR]',
  milestone: '[ADD COMPANY MILESTONE]',
} as const;

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

/**
 * Permissions are checked server-side on every admin endpoint. 'super' is a
 * wildcard understood by the authorization helper.
 */
export const ROLES = [
  {
    slug: 'super_admin',
    name: 'Super Admin',
    description: 'Full access including user management, settings and destructive operations.',
    permissions: ['super'],
    sort_order: 1,
  },
  {
    slug: 'editor',
    name: 'Editor',
    description: 'Create, edit, publish and delete all site content and media.',
    permissions: [
      'content.read', 'content.write', 'content.publish', 'content.delete',
      'media.read', 'media.write', 'media.delete',
      'leads.read', 'leads.write',
      'analytics.read',
    ],
    sort_order: 2,
  },
  {
    slug: 'content_manager',
    name: 'Content Manager',
    description: 'Edit content and upload media. Cannot publish, delete or manage users.',
    permissions: ['content.read', 'content.write', 'media.read', 'media.write', 'leads.read'],
    sort_order: 3,
  },
  {
    slug: 'analytics',
    name: 'Analytics',
    description: 'Read-only access to the analytics dashboard and lead volumes.',
    permissions: ['analytics.read', 'content.read'],
    sort_order: 4,
  },
] as const;

// ---------------------------------------------------------------------------
// Locations — the four supplied markets. Detail is left for the administrator.
// ---------------------------------------------------------------------------

export const LOCATIONS = [
  { slug: 'georgia',  country: 'Georgia',  country_code: 'GE', map_x: 63.5, map_y: 44.0 },
  { slug: 'armenia',  country: 'Armenia',  country_code: 'AM', map_x: 65.0, map_y: 50.5 },
  { slug: 'bulgaria', country: 'Bulgaria', country_code: 'BG', map_x: 47.0, map_y: 41.0 },
  { slug: 'ukraine',  country: 'Ukraine',  country_code: 'UA', map_x: 52.0, map_y: 26.0 },
].map((l) => ({
  ...l,
  city: PLACEHOLDER.city,
  address: '',            // never published until an administrator supplies it
  email: 'miracle@gmail.com',
  phone: '',
  studio_availability: PLACEHOLDER.availability,
  services: [
    'Studio production',
    'Custom studio design',
    'Streaming technology',
    'Production staff',
  ],
}));

// ---------------------------------------------------------------------------
// Studios — ten environments, described from the supplied photography.
// ---------------------------------------------------------------------------

interface StudioSeed {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  environment: string;
  characteristics: string[];
}

export const STUDIOS: StudioSeed[] = [
  {
    slug: 'arctic-ice',
    name: 'Arctic Ice',
    tagline: 'High-key broadcast environment',
    description:
      'A high-key environment built in white marble and backlit frosted panelling. The curved presenter desk carries a continuous LED underglow, and the surrounding wall panels act as large soft sources, producing an almost shadowless field that holds detail across white wardrobe and pale surfaces.',
    environment:
      'Cool, daylight-balanced set with full-height illuminated wall panels, polished stone flooring and a curved central desk. Camera positions are arranged symmetrically around the desk with an overhead position directly above the playing surface.',
    characteristics: [
      'High-key, daylight-balanced lighting',
      'Symmetrical multi-camera coverage',
      'Overhead top-down camera position',
      'Illuminated panel walls as primary soft sources',
      'Single presenter position',
    ],
  },
  {
    slug: 'desert-mirage',
    name: 'Desert Mirage',
    tagline: 'Warm architectural environment',
    description:
      'A warm, architecturally detailed set built around arched openings and pierced screen work, with a landscape vista treatment behind. Copper and terracotta surfaces are lit with low-colour-temperature practicals, giving a rich amber field that separates cleanly from the darker surround.',
    environment:
      'Arched architectural set with patterned screen panels, lantern practicals and a wide horizon backdrop. The octagonal playing surface sits centrally with camera positions on all approaches, including an overhead rig.',
    characteristics: [
      'Warm tungsten-balanced practical lighting',
      'Architectural arch and screen set construction',
      'Horizon backdrop treatment',
      'Overhead top-down camera position',
      'Octagonal centre table layout',
    ],
  },
  {
    slug: 'emerald-forest',
    name: 'Emerald Forest',
    tagline: 'Botanical environment',
    description:
      'A botanical environment using dense living-wall foliage, natural timber and suspended filament practicals. The green field of the set is picked up by the table surface, and the warm point sources read as depth cues against the planting rather than as key light.',
    environment:
      'Planted wall treatment with timber structure, hanging practicals and a deep green playing surface. Cameras are positioned close to the table on multiple sides, with an overhead position above the centre.',
    characteristics: [
      'Living-wall botanical set dressing',
      'Warm filament practicals as accent sources',
      'Close-in multi-camera coverage',
      'Overhead top-down camera position',
      'Natural timber and planting materials',
    ],
  },
  {
    slug: 'havana-gold',
    name: 'Havana Gold',
    tagline: 'Colonial interior environment',
    description:
      'A colonial-interior set in dark timber panelling with palm planting, draped windows and brass sconce practicals. The warm tungsten field and deep shadow areas give the environment a low, contained feel that suits close presenter framing.',
    environment:
      'Panelled interior with drapery, planting and wall-mounted practicals. A curved playing surface sits centre-set with camera positions arranged around it and an overhead rig above.',
    characteristics: [
      'Warm tungsten interior lighting',
      'Dark timber panelled set construction',
      'Drapery and planting set dressing',
      'Overhead top-down camera position',
      'Curved presenter-facing table',
    ],
  },
  {
    slug: 'midnight-galaxy',
    name: 'Midnight Galaxy',
    tagline: 'Deep-field LED environment',
    description:
      'A dark environment built against a deep violet nebula field, with the playing surface outlined in continuous LED and the presenter separated by a magenta rim. Almost all the light in the set is emissive, which keeps the surround genuinely black rather than grey.',
    environment:
      'Curved wall carrying a starfield and nebula treatment, with LED edge-lighting on the desk and floor. Camera positions ring the desk, including an overhead position above the surface.',
    characteristics: [
      'Emissive LED-led lighting design',
      'Deep-field nebula backdrop treatment',
      'Magenta rim separation on presenter',
      'Overhead top-down camera position',
      'True-black surround for high contrast',
    ],
  },
  {
    slug: 'monte-carlo-classic',
    name: 'Monte Carlo Classic',
    tagline: 'Belle-époque salon environment',
    description:
      'A formal salon set in ivory and gold, with chandeliers, marble flooring, arched mirror detailing and orchid dressing. The lighting is broad and even, keeping the pale surfaces controlled while retaining the specular detail in the gilt and glass.',
    environment:
      'Large, bright salon with chandeliers, mirrored arches and marble floor. Multiple table positions are visible in the set, with camera positions on tripods around the room and an overhead rig above the main surface.',
    characteristics: [
      'Broad, even high-key lighting',
      'Chandelier and mirrored architectural detail',
      'Multiple table positions within one set',
      'Overhead top-down camera position',
      'Marble and gilt surface finishes',
    ],
  },
  {
    slug: 'neon-noir',
    name: 'Neon Noir',
    tagline: 'Technical low-key environment',
    description:
      'The most overtly technical of the environments: a low-key set built from edge-lit hexagonal geometry with data displays banked behind the presenter position. Cyan and blue LED lines describe the architecture, and the surrounding surfaces stay near-black.',
    environment:
      'Faceted dark set with continuous blue LED edge-lighting, banked screen displays and an illuminated playing surface. Camera positions surround the table with an overhead rig directly above.',
    characteristics: [
      'Low-key, LED-defined set architecture',
      'Banked display surfaces behind presenter',
      'Cyan and blue emissive edge lighting',
      'Overhead top-down camera position',
      'Near-black surround for maximum contrast',
    ],
  },
  {
    slug: 'riviera-rose',
    name: 'Riviera Rose',
    tagline: 'Soft-key blush environment',
    description:
      'A soft, warm environment in blush and rose gold, with floral wall treatment, crystal drop detailing and a rose-toned playing surface. The key is diffuse and low-contrast, which keeps skin tones soft and the metalwork gently specular.',
    environment:
      'Floral and drapery wall treatment with crystal detail, warm wall practicals and a curved rose-gold trimmed table. Cameras are positioned around the table including an overhead rig.',
    characteristics: [
      'Diffuse, low-contrast soft key',
      'Floral and crystal set dressing',
      'Rose gold metalwork detailing',
      'Overhead top-down camera position',
      'Curved presenter-facing table',
    ],
  },
  {
    slug: 'royal-velvet',
    name: 'Royal Velvet',
    tagline: 'Low-key formal environment',
    description:
      'A deep, low-key set in crimson damask and dark timber, lit with contained warm sources and a chandelier practical. Shadow is used deliberately here: the surround falls away quickly, holding attention on the table and presenter.',
    environment:
      'Damask-panelled room with chandelier, dark timber joinery and a green baize surface with a wheel position. Camera positions ring the set, including an overhead rig above the table.',
    characteristics: [
      'Low-key, high-falloff lighting design',
      'Crimson damask and dark timber construction',
      'Chandelier practical as set anchor',
      'Overhead top-down camera position',
      'Wheel and table positions in one set',
    ],
  },
  {
    slug: 'tokyo-nights',
    name: 'Tokyo Nights',
    tagline: 'Saturated colour environment',
    description:
      'A strongly saturated environment built against a blossom treatment with paper lantern practicals and a vermilion playing surface. The red field is deliberately dominant, with the lanterns providing warm point sources and the blossom giving depth behind the presenter.',
    environment:
      'Blossom backdrop with lacquered timber detail, suspended paper lanterns and a red playing surface. Camera positions are set close around the table with an overhead rig above.',
    characteristics: [
      'Saturated single-hue colour design',
      'Blossom and lantern set dressing',
      'Lacquer and timber surface finishes',
      'Overhead top-down camera position',
      'Close-in multi-camera coverage',
    ],
  },
];

/** Structural spec rows. Values stay as placeholders until supplied. */
export const TECHNICAL_SPEC_ROWS = [
  'Camera positions',
  'Lighting control',
  'Audio capture',
  'Encoding',
  'Streaming output',
  'Redundancy',
  'Control room',
  'Operator positions',
] as const;

// ---------------------------------------------------------------------------
// Services — titles and inclusion lists are as specified in the brief.
// ---------------------------------------------------------------------------

export const SERVICES = [
  {
    slug: 'studio-provision',
    code: 'SERVICE 01',
    title: 'Full Studio Provision',
    icon: 'studio',
    summary: 'Complete studio planning and production environment delivery.',
    body:
      'Full studio provision covers the delivery of a complete, operational production environment. We plan the space around the intended output, integrate the equipment, build the production and technical areas, and support the deployment through to the point the environment is running live.',
    inclusions: [
      { title: 'Studio planning', description: 'Spatial and operational planning of the production environment around the intended output.' },
      { title: 'Equipment integration', description: 'Specification and integration of the production equipment package.' },
      { title: 'Lighting', description: 'Lighting design and installation appropriate to the set and camera plan.' },
      { title: 'Cameras', description: 'Camera positions, mounting and coverage planning across the environment.' },
      { title: 'Production areas', description: 'Layout and construction of presenter, operator and support areas.' },
      { title: 'Technical infrastructure', description: 'Power, cabling, racks, connectivity and signal distribution.' },
      { title: 'Deployment support', description: 'On-site support through commissioning and first live operation.' },
    ],
  },
  {
    slug: 'custom-studio-design',
    code: 'SERVICE 02',
    title: 'Custom Studio Design & Deployment',
    icon: 'design',
    summary: "A studio environment designed around your brand, workflow and production requirements.",
    body:
      'Custom design starts from your brand and the way your team actually works, rather than from a fixed template. We develop the concept, plan the space, design the set and its visual identity, and carry the design through technical planning into a deployed, working environment.',
    inclusions: [
      { title: 'Concept design', description: 'Visual and spatial concept development for the environment.' },
      { title: 'Spatial planning', description: 'Floor planning around camera coverage, movement and operations.' },
      { title: 'Visual identity', description: 'Applying brand identity into the physical set and its on-camera treatment.' },
      { title: 'Set design', description: 'Set construction design, materials, finishes and dressing.' },
      { title: 'Technical planning', description: 'Lighting, camera, audio and infrastructure planning against the design.' },
      { title: 'Deployment', description: 'Build, installation and commissioning of the designed environment.' },
    ],
  },
  {
    slug: 'shared-production',
    code: 'SERVICE 03',
    title: 'Shared Production Environments',
    icon: 'shared',
    summary: 'A flexible production model using established, operational studio environments.',
    body:
      'Not every operation needs a dedicated build. Shared production environments let you operate from an established studio that is already built, staffed and running, with your own scheduled capacity within it. It is a lower-commitment route to a live production presence, and a practical way to begin operating while a dedicated environment is planned or under construction.',
    inclusions: [
      { title: 'Scheduled capacity', description: 'Allocated production time within an established studio environment.' },
      { title: 'Existing infrastructure', description: 'Use of the environment’s installed camera, lighting and technical systems.' },
      { title: 'Operational staffing', description: 'Access to production and technical staff already working in the environment.' },
      { title: 'Faster start', description: 'A route to live operation without a dedicated build programme.' },
      { title: 'Transition path', description: 'A defined path from shared capacity into a dedicated environment.' },
    ],
  },
  {
    slug: 'streaming-technology',
    code: 'SERVICE 04',
    title: 'Live Streaming Software & Technology',
    icon: 'stream',
    summary: 'Encoding, streaming infrastructure, production software and distribution architecture.',
    body:
      'The technology layer carries the signal from the studio floor to the viewer. We plan and implement the encoding, the streaming infrastructure behind it, the production software the operators work in, and the monitoring and redundancy that keep the output stable under live conditions.',
    inclusions: [
      { title: 'Encoding', description: 'Encoding configuration and hardware or software encoder deployment.' },
      { title: 'Streaming infrastructure', description: 'The delivery infrastructure carrying the live output.' },
      { title: 'Production software', description: 'The software layer operators use to run the production.' },
      { title: 'Monitoring', description: 'Signal, stream and system monitoring across the live path.' },
      { title: 'Redundancy', description: 'Failover design across the encoding and delivery path.' },
      { title: 'Distribution architecture', description: 'How the output is distributed to its destinations.' },
      { title: 'Technical integrations', description: 'Integration with your existing platforms and systems.' },
    ],
  },
  {
    slug: 'production-staff',
    code: 'SERVICE 05',
    title: 'Dedicated Production Staff',
    icon: 'staff',
    summary: 'Trained production personnel, technical operators and ongoing performance support.',
    body:
      'A studio environment only performs as well as the people running it. We provide trained production personnel and technical operators for live operation, together with the training and ongoing support that keeps performance consistent over time.',
    inclusions: [
      { title: 'Trained production personnel', description: 'Production staff prepared for live operational conditions.' },
      { title: 'Technical operators', description: 'Operators for the technical systems across the live path.' },
      { title: 'Presenters and hosts', description: 'On-camera presenting staff where the format requires it.' },
      { title: 'Operational training', description: 'Training in the day-to-day operation of the environment.' },
      { title: 'Workflow training', description: 'Training in the production workflows the environment runs on.' },
      { title: 'Ongoing performance support', description: 'Continued support and review of operational performance.' },
    ],
  },
  {
    slug: 'training',
    code: 'SERVICE 06',
    title: 'Training & Operations',
    icon: 'training',
    summary: 'Onboarding, technical training, operational procedures and quality control.',
    body:
      'Training and operations covers how the environment is run once it is live. We onboard the team, train them on the technical systems and the production workflows, and put the operational and quality-control procedures in place that make output repeatable.',
    inclusions: [
      { title: 'Onboarding', description: 'Structured onboarding into the environment and its systems.' },
      { title: 'Technical training', description: 'Training on the specific technical systems in the environment.' },
      { title: 'Operational procedures', description: 'Documented procedures for running the environment day to day.' },
      { title: 'Production workflows', description: 'Defined workflows covering the live production cycle.' },
      { title: 'Quality-control procedures', description: 'Checks and review procedures that hold output quality.' },
    ],
  },
] as const;

/** Home-page capabilities. Each links through to the service that delivers it. */
export const CAPABILITIES = [
  { key: 'studio-production',  title: 'Studio Production',        service: 'studio-provision',      icon: 'studio',
    description: 'Operational production environments delivered as a working whole — space, equipment, infrastructure and the people who run them.' },
  { key: 'custom-design',      title: 'Custom Studio Design',     service: 'custom-studio-design',  icon: 'design',
    description: 'Environments designed around your brand and workflow, from concept and set design through to a commissioned build.' },
  { key: 'streaming',          title: 'Live Streaming Technology', service: 'streaming-technology', icon: 'stream',
    description: 'The encoding, delivery and monitoring layer that carries the signal from the studio floor to the viewer.' },
  { key: 'operations',         title: 'Production Operations',    service: 'shared-production',     icon: 'shared',
    description: 'Day-to-day operation of live environments, including shared capacity within established studios.' },
  { key: 'staff-training',     title: 'Staff & Training',         service: 'production-staff',      icon: 'staff',
    description: 'Trained production and technical personnel, with the operational training that keeps performance consistent.' },
  { key: 'support',            title: 'Technical Support',        service: 'training',              icon: 'support',
    description: 'Ongoing technical and operational support across the live path, with defined procedures and quality control.' },
] as const;

/** The six-stage delivery workflow shown on the home page. */
export const WORKFLOW = [
  { step: '01', title: 'Plan',    description: 'Requirements, output format, operating model and constraints established before anything is drawn.' },
  { step: '02', title: 'Design',  description: 'Spatial, set and technical design developed together so the environment works on camera and in operation.' },
  { step: '03', title: 'Build',   description: 'Set construction, equipment integration and technical infrastructure installed and commissioned.' },
  { step: '04', title: 'Connect', description: 'Encoding, streaming infrastructure, monitoring and redundancy brought into the live signal path.' },
  { step: '05', title: 'Train',   description: 'Production and technical teams trained on the environment, its systems and its workflows.' },
  { step: '06', title: 'Operate', description: 'Live operation, with ongoing technical support and quality-control procedures in place.' },
] as const;

/** The five principles in OUR PROMISE. */
export const PROMISES = [
  { key: 'quality',         title: 'Quality',         description: 'Environments built to hold up on camera and under continuous live operation, not only at handover.' },
  { key: 'reliability',     title: 'Reliability',     description: 'Redundancy and monitoring designed into the signal path, because live output does not get a second take.' },
  { key: 'flexibility',     title: 'Flexibility',     description: 'Dedicated builds, custom design or shared capacity — the model follows the operation, not the other way round.' },
  { key: 'professionalism', title: 'Professionalism', description: 'Trained staff, defined procedures and consistent operational standards across every environment.' },
  { key: 'transparency',    title: 'Transparency',    description: 'Clear scope, clear technical decisions and clear reporting throughout delivery and operation.' },
] as const;

/** WHY LIVE MIRACLE — differentiators, stated without reference to competitors. */
export const WHY = [
  { key: 'custom',    title: 'Custom Approach',        description: 'Every environment is planned around the client’s output, brand and operating model rather than fitted to a standard template.' },
  { key: 'regional',  title: 'Regional Presence',      description: 'Operating across Georgia, Armenia, Bulgaria and Ukraine, with delivery and support in the region.' },
  { key: 'technical', title: 'Technical Knowledge',    description: 'Studio construction, lighting, camera, encoding and delivery treated as one connected technical problem.' },
  { key: 'models',    title: 'Flexible Studio Models', description: 'Dedicated provision, custom design and shared production environments as distinct, defined routes.' },
  { key: 'teams',     title: 'Trained Teams',          description: 'Production and technical personnel trained on the specific environment they operate.' },
  { key: 'endtoend',  title: 'End-to-End Delivery',    description: 'From first plan through build, connection and training to continuing live operation.' },
] as const;

/** Nodes on the animated technology diagram. */
export const TECH_NODES = [
  { key: 'cameras',      label: 'Cameras',      description: 'Camera positions, coverage and mounting across the environment.' },
  { key: 'lighting',     label: 'Lighting',     description: 'Lighting design, control and consistency on camera.' },
  { key: 'audio',        label: 'Audio',        description: 'Capture, mixing and monitoring of the live audio path.' },
  { key: 'control',      label: 'Control',      description: 'The control position from which the production is run.' },
  { key: 'encoding',     label: 'Encoding',     description: 'Encoding of the live output for delivery.' },
  { key: 'streaming',    label: 'Streaming',    description: 'The streaming infrastructure carrying the signal.' },
  { key: 'monitoring',   label: 'Monitoring',   description: 'Monitoring across signal, stream and systems.' },
  { key: 'distribution', label: 'Distribution', description: 'Delivery of the output to its destinations.' },
] as const;

export const GALLERY_CATEGORIES = [
  { slug: 'studios',       name: 'Studios' },
  { slug: 'control-rooms', name: 'Control Rooms' },
  { slug: 'cameras',       name: 'Cameras' },
  { slug: 'production',    name: 'Production' },
  { slug: 'technology',    name: 'Technology' },
  { slug: 'people',        name: 'People' },
  { slug: 'locations',     name: 'Locations' },
] as const;

/**
 * Timeline is seeded as empty placeholder rows. Company history is not
 * invented — the administrator supplies real milestones.
 */
export const TIMELINE_PLACEHOLDERS = [
  { year: PLACEHOLDER.year, event: PLACEHOLDER.milestone, description: '[ADD A SHORT DESCRIPTION OF THIS MILESTONE]' },
  { year: PLACEHOLDER.year, event: PLACEHOLDER.milestone, description: '[ADD A SHORT DESCRIPTION OF THIS MILESTONE]' },
  { year: PLACEHOLDER.year, event: PLACEHOLDER.milestone, description: '[ADD A SHORT DESCRIPTION OF THIS MILESTONE]' },
] as const;
