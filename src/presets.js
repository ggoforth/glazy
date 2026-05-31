// src/presets.js
// A preset is just a bag of options merged UNDER explicit options.
// It can carry finish + texture, not only color.
export const presets = {
  strawberry: {
    frost: 0xed4359, frostFinish: 'glaze', dough: 0xdf9f48,
    topping: 'sprinkles', fillLight: 0xffe6ef,
  },
  blueberry: {
    frost: 0x3a73cf, frostFinish: 'glaze', dough: 0xdf9f48,
    topping: 'nuts', fillLight: 0xe6f0ff,
  },
  matcha: {
    frost: 0x8fbf6f, frostFinish: 'glaze', dough: 0xe7c98a,
    topping: 'nuts', fillLight: 0xeef6e6,
  },
  chocolate: {
    frost: 0x4a2c1a, frostFinish: 'frosting', dough: 0x8a5a32,
    topping: 'sprinkles', crust: true, fillLight: 0xfff0e6,
  },
};
