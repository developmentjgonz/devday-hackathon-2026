# Google Maps local prototype

In local development, setting the demo key enables Google Maps for the team
colony and cat maps and the colony location picker. Google address search saves
the selected place ID, not the Google-provided address or coordinates. The app
loads fresh details when a member opens the map or colony profile. A pin placed
by a member, or coordinates entered by hand or provided by the device, is saved
as the member's own location. Moving a Google-selected pin clears the selected
place and address. For an independently chosen pin, the optional nearby address
lookup still uses Photon and OpenStreetMap. The public tracker continues to show
broad areas on its existing map; it never receives team colony coordinates.

Storybook also has fictional examples under **Experiments / Google Maps**. Their
selections stay in memory and are cleared when the story reloads.

## Run locally

1. Get a [Maps Demo Key](https://developers.google.com/maps/documentation/javascript/demo-key).
   Google requires a personal Google account and acceptance of its demo terms.
   The key is for prototypes, has daily limits, and does not require a credit card.
2. Put `VITE_GOOGLE_MAPS_API_KEY=YOUR_KEY` in `.env.local`. This file is ignored
   by Git. The key is sent to the browser, so it is not a server secret. Restrict
   it to the intended local origins and APIs when Google permits key restrictions.
3. Restart the local app with `npm run dev`. To inspect the separate visual
   examples, run `npm run storybook` and open **Experiments / Google Maps**.

If the demo key reaches a daily limit, Google pauses the affected service until
the quota resets. To use the standard map and search in the meantime, set
`VITE_GOOGLE_MAPS_ENABLED=false` in `.env.local` and restart the app. Remove
that line or set it to `true` to use Google again. Google-selected locations
need Google to load their details, even when the standard map is selected.

The demo loads Google's map and Places widget directly from Google. Address search
queries and map use are sent to Google. Only fictional colony locations belong in
the Storybook fixture.

## Before production

Google's [Maps JavaScript API policies](https://developers.google.com/maps/documentation/javascript/policies)
and [Places policies](https://developers.google.com/maps/documentation/places/web-service/policies)
restrict storing Google-provided place content. The app keeps only the place ID
for a Google-selected location and fetches its details when needed. Review the
terms, attribution, privacy requirements, and costs before enabling Google Maps
for a deployed app. A demo key is not for production. Production builds do not
include or use the demo key.
