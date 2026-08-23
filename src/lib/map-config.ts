// Map tile/style source. OpenFreeMap is free, keyless, and license-friendly
// with MapLibre (attribution is added automatically), so it's a safe default
// for local development. Point this at a paid provider (e.g. MapTiler) in
// production by setting NEXT_PUBLIC_MAP_STYLE_URL.
export const mapStyleUrl =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ??
  "https://tiles.openfreemap.org/styles/liberty";
