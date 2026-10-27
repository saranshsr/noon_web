# noon × YouTube Premium — benefits bento

Static benefits bento (from Figma "Container 1") with a live **YouTube Premium** card using the *Magnetic* hover.

- `index.html` — the deployable page (self-contained; static cards are inline SVG from Figma, the YouTube card plays the Lottie pair via lottie-web 5.12.2).
- `lottie/` — source `.lottie` files for all five cards (YouTube, Delivery, 10% off, HBO, Yango), hover in + out each.
- Delivery's Lottie is a wide banner: its own small headline layer is hidden and the card keeps the Figma headline; the bags are scaled to match Figma. Other Lotties are fitted to their cards by matching against the Figma frames.
- `src/lottieHoverCard.js` — the hover state machine: rest → in → hold → out → rest; leaving mid-in lets the wave finish, re-entering mid-out reverses back to hover.
- `src/YouTubePremiumCard.tsx` — the React Native component (`Animated` springs + `react-native-svg`), works on iOS, Android and web.
- `src/geometry.ts` — tile, icon and logo geometry exported 1:1 from Figma.
- `src/bento.tsx` — entry that mounts the Spotlight card into the page.

## Deploy on Vercel
Import this repo at vercel.com/new → Framework preset **Other**, no build command, output directory = root. Or run `npx vercel --prod` in this folder.

## Rebuilding the bundle
Bundle `src/bento.tsx` with `react-native` aliased to `react-native-web` and `@react-native/assets-registry/registry` stubbed, then inline it into `index.html`.


