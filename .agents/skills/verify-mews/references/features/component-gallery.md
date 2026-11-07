# Component gallery

Entry point: http://127.0.0.1:5197/ after `npm run dev`.

Source: `src/features/component-gallery/ComponentGallery.tsx`, using shared components under `src/components/ui/`.

## Working behavior

- Eight examples appear initially. Categories filter by Actions, Forms, Display, and Overlays.
- Search matches component names, descriptions, and categories, combined with the selected category.
- An unmatched search shows an empty state; Reset filters restores all examples.
- Button examples report clicks. Disabled controls remain unavailable.
- The name input previews its current value, the checkbox changes selection, and the sample card toggles its saved appearance.
- Open dialog moves focus into the overlay. Escape closes it and returns focus to the trigger.

## Verification

The initial build passed `npm run build`, which includes TypeScript checking. Browser checks exercised click feedback, text input, checkbox and card state, search matching, the empty state, category filtering, and dialog Escape dismissal with focus return.

Examples have no backend effects and do not persist across reloads. Their state may reset when filtering unmounts them. The theme remains the stock neutral default.
