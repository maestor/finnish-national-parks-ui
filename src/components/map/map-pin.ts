import { MAP_PIN_PATH } from "./map-pin-path";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

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
