# Storybook component workspace

Entry point: http://127.0.0.1:6006/ after `npm run storybook`.

Sources: `.storybook/` and `src/components/ui/*.stories.tsx`.

## Working behavior

- The sidebar groups nine components into Actions, Forms, Display, and Overlays.
- Each component has a generated Docs page and focused stories for its supported states.
- Button controls can change children, size, variant, and disabled state. The boolean control has explicit False and True choices.
- The dialog example opens, accepts keyboard dismissal with Escape, and returns focus to its trigger.
- Input, textarea, and checkbox examples use labels. Disabled states and a card with temporary saved state are available.

## Verification

Both `npm run build` and `npm run build-storybook` passed. Browser checks verified the generated Button Docs page, the disabled control updating its preview, and dialog opening, Escape dismissal, and focus return.

The main app was separately checked to display only Hello. Storybook has no backend effects and is not included in the app's deployed build. The theme remains the stock neutral default.
