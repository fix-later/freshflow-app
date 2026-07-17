import LogoMarkLight from '../../../assets/images/logo/logo.svg';
import LogoMarkDark from '../../../assets/images/logo/logo-dark.svg';

// Native aspect ratio of the source SVG (101x101 — perfectly square).
export interface LogoMarkProps {
  size?: number;
  /** Use the dark-background variant (white ribbon) instead of the default (navy ribbon). */
  dark?: boolean;
}

export function LogoMark({ size = 64, dark = false }: LogoMarkProps) {
  const Source = dark ? LogoMarkDark : LogoMarkLight;
  return <Source width={size} height={size} />;
}

export default LogoMark;
