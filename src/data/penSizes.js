// Tracing line thickness, chosen per child in the parent menu.
export const PEN_SIZES = [
  { id: 'thin', label: 'Thin', scale: 0.6 },
  { id: 'medium', label: 'Medium', scale: 1 },
  { id: 'thick', label: 'Thick', scale: 1.6 },
  { id: 'xthick', label: 'Extra thick', scale: 2.4 },
];
export const DEFAULT_PEN = 'medium';
export const penScale = (id) => (PEN_SIZES.find((p) => p.id === id) || PEN_SIZES[1]).scale;
