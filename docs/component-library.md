# Component library

The component library is the collection of reusable interface components. Together with agreed theme tokens and design rules, it will form the project's design system. The custom visual identity has not been decided.

## Locations

- `src/components/ui/`: shadcn component source, currently using Base UI primitives.
- `src/features/component-gallery/ComponentGallery.tsx`: the gallery, its examples, and search/category metadata.
- `src/styles/tokens.css`: stock shadcn neutral token values for light and dark appearances. The gallery currently displays the light appearance.
- `src/styles/globals.css`: Tailwind imports, token-to-utility mappings, and global styles.
- `components.json`: shadcn paths and preset configuration.

The CLI's default Nova preset provides initial component styling, Geist provides the bundled font, and Lucide provides icons. These are replaceable starting choices. None establishes a final product brand.

## Run and inspect

Run `npm run dev` and visit http://127.0.0.1:5197/. The gallery includes Button, Input with Label, Textarea, Checkbox, Badge, Card, Dialog, and Separator examples.

Search and category filters narrow the list. Examples use temporary local state; switching filters can unmount and reset a specimen. The gallery does not call a backend or persist data.

## Extend deliberately

To add a shadcn component, use `npx shadcn@latest add <component>` from the project root. It uses the repository's existing `components.json` and writes component source under `src/components/ui/`.

Add its example and metadata to the gallery when there is a useful state or interaction to inspect. Keep product-specific behavior in feature folders. Use semantic tokens such as `primary`, `background`, and `border` when styling shared components.

Our component source is editable, and custom SVG icons and components can be added when required. Review upstream changes explicitly when updating generated components.
