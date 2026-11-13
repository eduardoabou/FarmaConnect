export interface PharmacyTheme {
  primary: string;
  surface: string;
  text: string;
  accent: string;
}

const themes: Record<string, PharmacyTheme> = {
  'Farmácia Aurora': {
    primary: '#6d3ea2',
    surface: '#f7f2fc',
    text: '#2f1b48',
    accent: '#b286df',
  },
  'Farmácia Horizonte': {
    primary: '#087f5b',
    surface: '#effaf6',
    text: '#123f32',
    accent: '#58b994',
  },
  'Farmácia Vida': {
    primary: '#bd5a14',
    surface: '#fff6ed',
    text: '#51290e',
    accent: '#f0a365',
  },
};

const fallback: PharmacyTheme = {
  primary: '#2e7d9f',
  surface: '#f5f7fa',
  text: '#24313d',
  accent: '#78b4cc',
};

export function pharmacyTheme(name: string): PharmacyTheme {
  return themes[name] ?? fallback;
}
