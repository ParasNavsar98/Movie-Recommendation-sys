import { FC, ReactNode, CSSProperties } from "react";

export interface AuroraProps {
  colorStops?: string[];
  amplitude?: number;
  blend?: number;
  time?: number;
  speed?: number;
  lightMode?: boolean;
  width?: string | number;
  height?: string | number;
  layers?: any;
  noiseScale?: number;
  movementX?: number;
  movementY?: number;
  verticalFade?: number;
  bloomIntensity?: number;
  skyLayers?: any;
  brightness?: number;
  saturation?: number;
  opacity?: number;
  className?: string;
  children?: ReactNode;
  style?: CSSProperties;
}

declare const Aurora: FC<AuroraProps>;
export const AuroraBlur: FC<AuroraProps>;
export default Aurora;
