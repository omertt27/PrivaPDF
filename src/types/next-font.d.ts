// Type declarations for next/font/* virtual modules (Next.js 16)
// These are bundler-resolved at compile time; TypeScript needs this stub.

declare module "next/font/google" {
  export interface FontOptions {
    variable?: string;
    subsets?: string[];
    weight?: string | string[];
    style?: string | string[];
    display?: "auto" | "block" | "swap" | "fallback" | "optional";
    preload?: boolean;
    fallback?: string[];
    adjustFontFallback?: boolean | string;
  }

  export interface FontResult {
    className: string;
    variable: string;
    style: { fontFamily: string; fontWeight?: number; fontStyle?: string };
  }

  type FontFunction = (options: FontOptions) => FontResult;

  export const Inter: FontFunction;
  export const Roboto: FontFunction;
  export const Open_Sans: FontFunction;
  export const Lato: FontFunction;
  export const Montserrat: FontFunction;
  export const Poppins: FontFunction;
  export const Source_Sans_3: FontFunction;
  export const Raleway: FontFunction;
  export const Nunito: FontFunction;
  export const DM_Sans: FontFunction;
  export const Geist: FontFunction;
  export const Geist_Mono: FontFunction;
  export const Instrument_Serif: FontFunction;
  export const Playfair_Display: FontFunction;
  export const Merriweather: FontFunction;
  export const Georgia: FontFunction;
  // Catch-all for any other Google Font
  const _default: FontFunction;
  export default _default;
}

declare module "next/font/local" {
  interface LocalFontOptions {
    src: string | Array<{ path: string; weight?: string; style?: string }>;
    variable?: string;
    weight?: string | string[];
    style?: string | string[];
    display?: "auto" | "block" | "swap" | "fallback" | "optional";
    preload?: boolean;
    fallback?: string[];
    adjustFontFallback?: boolean | string;
  }

  interface FontResult {
    className: string;
    variable: string;
    style: { fontFamily: string; fontWeight?: number; fontStyle?: string };
  }

  export default function localFont(options: LocalFontOptions): FontResult;
}
