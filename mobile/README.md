# Automotive Car Care — mobile app

React Native app (Expo SDK 58, Expo Router) for customers and staff. It uses the
website's APIs, so services, brands, model photos and bookings stay in sync with
https://www.automotivecarcare.in and the admin dashboard.

## Screens

| Tab | What it does |
|---|---|
| Home | Quick actions (book, call, WhatsApp, directions), services, brand logos |
| Services | All general and special services; tap for details and "Book this service" |
| Book | Car brand → model (with photos) → services → date & time → contact details |
| Contact | Call, WhatsApp, email, map, socials, and a contact form |
| Staff | Staff sign-in, then bookings: filter, call/WhatsApp the customer, confirm (emails the customer), delete |

Brand screen (`/brand/<slug>`) lists a brand's models; tapping one opens Book with the car filled in.

## Run it

```bash
cd mobile
npm install
npx expo start
```

Scan the QR code with **Expo Go** on your phone, or press `i` (iOS simulator) / `a` (Android emulator).

By default the app talks to the live website. To test against your local Next.js
server, copy `.env.example` to `.env` and set `EXPO_PUBLIC_API_URL`
(iOS simulator: `http://localhost:3001`, Android emulator: `http://10.0.2.2:3001`,
phone: `http://<your computer's LAN IP>:3001`).

## Staff sign-in

The Staff tab signs in through `POST /api/mobile/login` on the website. Set these
in the website's environment (`.env.local` locally, and Vercel → Settings →
Environment Variables in production):

- `STAFF_USERNAME`
- `STAFF_PASSWORD`
- `STAFF_TOKEN_SECRET` — any random string of 32+ characters

The app stores only a signed token (valid 30 days) in the device's secure storage,
never the password. Changing `STAFF_TOKEN_SECRET` signs everyone out.

## Publish to the stores

Builds run in the cloud with Expo's build service:

```bash
npx eas-cli@latest login
npx eas-cli@latest build:configure
npx eas-cli@latest build --platform android   # .aab for Google Play
npx eas-cli@latest build --platform ios       # needs an Apple Developer account
npx eas-cli@latest submit
```

App IDs are set in `app.json` (`in.automotivecarcare.app`). Replace the default
icons in `assets/` with the Automotive Car Care icon before publishing.
