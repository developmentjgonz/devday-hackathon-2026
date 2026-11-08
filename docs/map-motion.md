# Map selection motion

Selecting an area or colony centers it on the map. A pointer selection uses the shared normal duration and ease-out curve when the map is visible. A keyboard selection, reduced-motion preference, or selection while the map is offscreen changes the center immediately. A new selection interrupts an earlier pan.

The map reads `--duration-normal` and `--ease-out` from the shared theme. If either token is invalid, the map uses an immediate change. `@mapbox/unitbezier` evaluates the same curve for MapLibre; it is already a MapLibre dependency.

Run `npm run test:map` for the selection policy and map-data checks. The **Display → Colony map** stories show the component with fictional locations. Check pointer selection, keyboard selection, and reduced motion in a browser. Phone emulation does not replace a check on a physical device.
