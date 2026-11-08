# Google Maps local prototype

The Google Maps prototype is in Storybook under **Experiments / Google Maps**.
It shows fictional colonies and a location picker with Google's address search.
Selections stay in memory and are cleared when the story reloads. The prototype
does not read or write the workspace database. The application continues to use
its existing map and location picker.

## Run locally

1. Get a [Maps Demo Key](https://developers.google.com/maps/documentation/javascript/demo-key).
   Google requires a personal Google account and acceptance of its demo terms.
   The key is for prototypes, has daily limits, and does not require a credit card.
2. Put `VITE_GOOGLE_MAPS_API_KEY=YOUR_KEY` in `.env.local`. This file is ignored
   by Git. The key is sent to the browser, so it is not a server secret. Restrict
   it to the intended local origins and APIs when Google permits key restrictions.
3. Restart Storybook with `npm run storybook`, then open **Experiments / Google Maps**.

The demo loads Google's map and Places widget directly from Google. Address search
queries and map use are sent to Google. Only fictional colony locations belong in
the Storybook fixture.

## Before connecting it to saved colonies

Google's [Maps JavaScript API policies](https://developers.google.com/maps/documentation/javascript/policies)
and [Places policies](https://developers.google.com/maps/documentation/places/web-service/policies)
restrict storing Google-provided place content. The existing colony record stores
an address and coordinates without an expiry, so Google search results must not
be saved into those fields unchanged. Google permits storing place IDs; a saved
location design must also handle fresh details, attribution, exact pin placement,
unavailable results, and applicable retention rules. Review the terms and privacy
requirements before replacing the app's existing location flow. A demo key is not
for production.
