import { ImageResponse } from 'next/og';
import { site } from '@/content/site';

/**
 * Social card, generated at build time — no image asset to keep in sync with
 * the copy. Satori supports a subset of CSS: flexbox only, no CSS variables.
 */

export const alt = `${site.name} — ${site.role}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const BG = '#0B0B0C';
const FG = '#F2F2F0';
const MUTED = '#8A8A8F';
const ACCENT = '#E8B84B';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: BG,
          padding: '72px 80px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
            <path
              d="M14 10 H28 A22 22 0 0 1 28 54 H14 Z"
              stroke={FG}
              strokeWidth={7.5}
              strokeLinejoin="round"
            />
            <circle cx="52.7" cy="13.2" r="4.5" fill={ACCENT} />
          </svg>
          <div style={{ marginLeft: 20, fontSize: 30, color: MUTED, letterSpacing: '0.16em' }}>
            {site.location.toUpperCase()}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 150, fontWeight: 700, color: FG, letterSpacing: '-0.05em', lineHeight: 1 }}>
            {site.name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', marginTop: 28 }}>
            <div style={{ width: 12, height: 12, borderRadius: 12, backgroundColor: ACCENT }} />
            <div style={{ marginLeft: 18, fontSize: 40, color: FG }}>{site.hero.positioning}</div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
