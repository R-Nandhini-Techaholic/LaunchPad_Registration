# Launch Pad 2026

A full-stack QR-based event registration and attendance app for student check-in, now structured to deploy directly from Git to Vercel.

## Stack

- React + Vite frontend
- Node.js + Express backend
- PostgreSQL on Vercel or SQLite locally
- `qrcode` for QR image generation
- `qr-scanner` for browser-based camera scanning

## Why This Version Is Vercel-Ready

- The Express app is exported from the repo root through `server.js`, which matches Vercel's zero-config Express entrypoint support.
- QR codes are generated on demand through `/api/qrcode`, so the app no longer depends on local file storage.
- The backend uses PostgreSQL automatically when `DATABASE_URL` is present, which is the recommended hosted SQL path for Vercel deployments.
- `vercel.json` tells Vercel to build the Vite frontend from this monorepo and serve `client/dist` as the static output.

## Features

- Student registration form with full name, email, phone number, and pass type
- Unique registration ID generation for every student
- QR code generation after registration with PNG download support
- Pass classification for `Startup Pass` and `Innovator Pass`
- Admin dashboard with search, pass filtering, attendance status, CSV export, edit, and delete actions
- Attendance scanner page that uses the device camera to scan QR codes
- Duplicate attendance prevention with saved scan timestamps
- Optional Google Sheets sync for organizer-friendly registration review

## Project Structure

```text
client/   React frontend
server/   Express API and database adapters
server.js Vercel Express entrypoint
vercel.json Deployment config
```

## Run Locally

1. Install dependencies from the project root:

   ```bash
   npm install
   ```

2. Start both frontend and backend:

   ```bash
   npm run dev
   ```

3. Open the app:

   - Frontend: `http://localhost:5173`
   - Backend API: `http://localhost:4000`

## Environment Variables

Copy `.env.example` if you want a starting point.

- `DATABASE_URL`
  When set, the backend uses PostgreSQL. This is what you should set in Vercel.
- `CLIENT_ORIGIN`
  Optional comma-separated list of allowed browser origins for local or cross-origin use.
- `PORT`
  Local server port. Vercel sets its own runtime port automatically.
- `GOOGLE_SHEETS_SPREADSHEET_ID`
  The destination spreadsheet ID for organizer access.
- `GOOGLE_SHEETS_TAB_NAME`
  Sheet tab to overwrite during sync. Defaults to `Registrations`.
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
  Service account email with access to the spreadsheet.
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`
  Service account private key. Keep escaped newlines in env vars.

If `DATABASE_URL` is not set, the app falls back to local SQLite in `server/data/launch-pad-2026.db`.

## Deploy To Vercel

1. Push this repository to GitHub.
2. Import the repo into Vercel.
3. Add a hosted PostgreSQL `DATABASE_URL` in the Vercel project settings.
4. Deploy.

The frontend will be built from `client/`, and the Express backend will be served from `server.js`.

## Google Sheets Setup

1. Create a Google Cloud project and enable the Google Sheets API.
2. Create a service account and generate a JSON key.
3. Share your Google Sheet with the service account email as an editor.
4. Add these env vars in Vercel:
   - `GOOGLE_SHEETS_SPREADSHEET_ID`
   - `GOOGLE_SHEETS_TAB_NAME`
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`
5. In the admin dashboard, use `Sync Google Sheet` to write the current registration table to the sheet.

The sheet sync writes a fresh snapshot of all registered students, including attendance status and scan time.

## Useful Scripts

- `npm run dev` starts client and server together
- `npm run dev:client` starts the React app only
- `npm run dev:server` starts the Express API only
- `npm run build` builds the frontend for production
- `npm run start` starts the backend in production mode

## API Endpoints

- `POST /api/register`
- `GET /api/students`
- `GET /api/students/:id`
- `POST /api/attendance/scan`
- `GET /api/attendance`
- `GET /api/qrcode?registrationId=<id>`
- `PUT /api/students/:id`
- `DELETE /api/students/:id`
- `POST /api/google-sheets/sync`

## Notes

- SQLite is fine for local development, but Vercel deployments should use PostgreSQL.
- The app keeps one attendance row per registration ID, which prevents duplicate check-ins for the event.
