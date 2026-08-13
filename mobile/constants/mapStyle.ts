/** Style carte sombre — inspiré Tesla / Mapbox dark */
export const DARK_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#0d1117" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#64748b" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0d1117" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1e293b" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#334155" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#2563eb" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1d4ed8" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0c1929" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#131f35" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#0f1a12" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#1a2844" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#334155" }] },
];
