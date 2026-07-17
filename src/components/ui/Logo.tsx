import LogoPrimary from '../../../assets/images/logo/logo-primary.svg';
import LogoPrimaryDark from '../../../assets/images/logo/logo-primary-dark.svg';

// Native aspect ratio of the source SVG (715x152) — callers only need to pick a width.
const ASPECT_RATIO = 152 / 715;

export interface LogoProps {
  width?: number;
  /** Use the dark-background wordmark variant (light strokes) instead of the default. */
  dark?: boolean;
}

export function Logo({ width = 160, dark = false }: LogoProps) {
  const Source = dark ? LogoPrimaryDark : LogoPrimary;
  return <Source width={width} height={width * ASPECT_RATIO} />;
}

export default Logo;
