/**
 * Hand-drawn floral line art that sits along the bottom of the hero panel:
 * a heart-budded gypsophila cluster on the left, a stray sprig at the centre,
 * lavender and a daisy on the right.
 *
 * Purely decorative, so the whole thing is hidden from assistive tech. The
 * shapes are inline paths rather than an asset so they inherit the ink colour
 * and stay crisp at any panel size.
 */

/** A single heart bud, drawn centred on the origin. */
const HEART =
  "M0 3.4C-3.7 0.6 -3.9 -3.5 -1.2 -3.5C-0.4 -3.5 0 -2.9 0 -2.2C0 -2.9 0.4 -3.5 1.2 -3.5C3.9 -3.5 3.7 0.6 0 3.4Z";

/** A lavender floret / small leaf, drawn from its stem joint upward. */
const FLORET = "M0 0C-3.1 -2 -3.1 -7 0 -9.4C3.1 -7 3.1 -2 0 0Z";

type Placed = { x: number; y: number; rotate?: number; scale?: number };

function place({ x, y, rotate = 0, scale = 1 }: Placed) {
  return `translate(${x} ${y}) rotate(${rotate}) scale(${scale})`;
}

/** One stem of the baby's-breath branch: a spine, four twigs, five hearts. */
function HeartBranch(props: Placed) {
  const buds: Placed[] = [
    { x: -22, y: -58, rotate: -22 },
    { x: 13, y: -72, rotate: 20 },
    { x: -19, y: -88, rotate: -16 },
    { x: 6, y: -98, rotate: 14 },
    { x: -6, y: -103, rotate: -4 },
  ];

  return (
    <g transform={place(props)}>
      <path d="M0 0C-3 -28 -8 -58 -6 -96" />
      <path d="M-3 -30C-14 -36 -20 -44 -22 -54" />
      <path d="M-4 -44C6 -50 12 -58 13 -68" />
      <path d="M-5 -60C-14 -66 -18 -74 -19 -84" />
      <path d="M-6 -74C1 -80 5 -86 6 -94" />
      <path d="M-6 -96L-6 -99" />
      {buds.map((bud) => (
        <path
          key={`${bud.x}:${bud.y}`}
          d={HEART}
          transform={place({ ...bud, scale: 1.45 })}
        />
      ))}
    </g>
  );
}

/** A lavender spike: bare stem below, paired florets up the top half. */
function Lavender(props: Placed) {
  // Each pair steps up the stem and leans a little further out.
  const pairs = [0, 1, 2, 3, 4, 5].map((i) => ({
    y: -34 - i * 8,
    lean: 42 - i * 4,
  }));

  return (
    <g transform={place(props)}>
      <path d="M0 0C-2 -24 -3 -46 -2 -74" />
      {pairs.map(({ y, lean }) => (
        <g key={y}>
          <path d={FLORET} transform={place({ x: -2, y, rotate: -lean })} />
          <path d={FLORET} transform={place({ x: -2, y, rotate: lean })} />
        </g>
      ))}
      <path d={FLORET} transform={place({ x: -2, y: -74, rotate: 0 })} />
    </g>
  );
}

/** The daisy: petals ringed around a hub, on a long stem with two leaves. */
function Daisy(props: Placed) {
  const petals = Array.from({ length: 12 }, (_, i) => i * 30);

  return (
    <g transform={place(props)}>
      <path d="M0 8C3 30 5 52 3 78" />
      <path d="M2 40C10 34 17 34 21 39C16 45 8 46 2 40Z" />
      <path d="M3 58C-4 53 -11 53 -15 58C-10 64 -3 64 3 58Z" />
      {petals.map((angle) => (
        <ellipse
          key={angle}
          cx="0"
          cy="-13"
          rx="3.6"
          ry="9.5"
          transform={`rotate(${angle})`}
        />
      ))}
      <circle cx="0" cy="0" r="4.6" />
    </g>
  );
}

export function FloralBackdrop() {
  return (
    <div className="floral" aria-hidden="true">
      <svg
        className="floral__art floral__art--left"
        viewBox="0 0 170 150"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <HeartBranch x={62} y={150} rotate={-16} scale={1.18} />
        <HeartBranch x={44} y={150} rotate={16} scale={0.86} />
        <HeartBranch x={122} y={150} rotate={4} scale={0.72} />
      </svg>

      <svg
        className="floral__art floral__art--centre"
        viewBox="0 0 60 60"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <g transform="translate(30 60)">
          <path d="M0 0C-1 -12 -2 -20 -1 -30" />
          <path d="M-1 -18C-7 -21 -10 -25 -11 -30" />
          <path d="M-1 -26C4 -29 7 -32 8 -37" />
          <path d={HEART} transform={place({ x: -11, y: -34, rotate: -18, scale: 1.5 })} />
          <path d={HEART} transform={place({ x: 8, y: -41, rotate: 16, scale: 1.5 })} />
          <path d={HEART} transform={place({ x: -1, y: -35, rotate: 0, scale: 1.5 })} />
        </g>
      </svg>

      <svg
        className="floral__art floral__art--right"
        viewBox="0 0 190 150"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <Lavender x={44} y={150} rotate={-9} scale={1.02} />
        <Lavender x={78} y={150} rotate={5} scale={0.92} />
        <Daisy x={140} y={64} scale={1.15} />
      </svg>
    </div>
  );
}