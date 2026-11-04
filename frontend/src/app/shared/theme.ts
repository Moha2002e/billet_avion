import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

/**
 * Thème PrimeNG de l'application : le préréglage « Aura » dont la couleur principale est
 * remplacée par un orange doux (terracotta), sur fond blanc. Aucun mode sombre.
 */
export const ThemeOrange = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#fdf5ee', 100: '#fbe8d8', 200: '#f6d3b8', 300: '#f0b88f', 400: '#e99a63',
      500: '#e07f3c', 600: '#c4662a', 700: '#9f5222', 800: '#7d411d', 900: '#5c3016', 950: '#3b1e0d',
    },
    colorScheme: {
      light: {
        primary: { color: '{primary.500}', contrastColor: '#ffffff', hoverColor: '{primary.600}', activeColor: '{primary.700}' },
        highlight: { background: '{primary.50}', focusBackground: '{primary.100}', color: '{primary.700}', focusColor: '{primary.800}' },
      },
    },
  },
});
