/** Read a --soc-* CSS variable (stored as "R G B") and return "rgb(R, G, B)" */
export function socVar(name: string): string {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(`--soc-${name}`)
    .trim();
  return `rgb(${raw.replace(/ /g, ", ")})`;
}
