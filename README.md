# recordrank
A utility for ranking records

## Frontend

React, TypeScript, Vite, and Tailwind. The app uses hash routes so it can be
hosted on GitHub Pages:

- `#/admin`
- `#/album/:id`
- `#/stats/:id`

Create `.env.local` from `.env.example` and point it to your PHP API.

```bash
npm install
npm run dev
```

## Backend

The backend lives in `backend/`. It is a minimal PHP API that writes JSON files
under `backend/data`, which is ignored by git.

Copy `backend/config.example.php` to `backend/config.php` on your server and set
your API key there.

## Security note

Because the frontend is a static GitHub Pages app, `VITE_API_KEY` and
`VITE_ADMIN_PASSWORD` are visible in the built JavaScript. This is intentionally
simple and fine for a private/lightweight utility, but it is not strong
authentication.
