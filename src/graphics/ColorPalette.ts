export interface PaletteColors {
  skyTop: string;
  skyBottom: string;
  clouds: string;
  distantBuildings: string;
  nearbyBuildings: string;
  windows: string;
  ground: string;
  groundLine: string;
  hudText: string;
}

export const ColorPalette = {
  day: {
    skyTop: '#4b9fe8',
    skyBottom: '#c9ecff',
    clouds: '#ffffff',
    distantBuildings: '#849db5',
    nearbyBuildings: '#526f91',
    windows: '#d9efff',
    ground: '#c9a46a',
    groundLine: '#5b4026',
    hudText: '#1e2a38',
  },
  sunset: {
    skyTop: '#e97868',
    skyBottom: '#ffd0a1',
    clouds: '#ffe3d4',
    distantBuildings: '#9e6675',
    nearbyBuildings: '#654c70',
    windows: '#ffdca8',
    ground: '#a77b68',
    groundLine: '#553b4b',
    hudText: '#392638',
  },
  night: {
    skyTop: '#171b4b',
    skyBottom: '#394d7a',
    clouds: '#8792bd',
    distantBuildings: '#303659',
    nearbyBuildings: '#202640',
    windows: '#ffd968',
    ground: '#45405d',
    groundLine: '#171b32',
    hudText: '#f4f2dc',
  },
} as const satisfies Record<string, PaletteColors>;

export type DayNightPhase = keyof typeof ColorPalette;
