import BrandLogoSource from '../../../assets/images/logo/logo-primary.svg';

export interface BrandLogoProps {
  width?: number;
}

// The source is byte-for-byte identical to the primary FreshFlow logo used by
// freshflow-web. Its native aspect ratio is 715:152.
export function BrandLogo({ width = 132 }: BrandLogoProps) {
  return <BrandLogoSource width={width} height={(width * 152) / 715} />;
}

export default BrandLogo;
