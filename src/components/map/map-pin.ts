const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

const MAP_PIN_PATH =
  "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z";

export const createMapPinSvg = (
  fill: string,
  className = "pointer-events-none h-7 w-7 drop-shadow-md transition-transform group-hover:scale-110",
) => {
  const svg = document.createElementNS(SVG_NAMESPACE, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", fill);
  svg.setAttribute("class", className);
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("xmlns", SVG_NAMESPACE);

  const path = document.createElementNS(SVG_NAMESPACE, "path");
  path.setAttribute("d", MAP_PIN_PATH);
  svg.appendChild(path);

  return svg;
};
