# RecordRank backend

This is a single-file PHP API that stores albums and reviews as JSON files.

## Install

1. Upload `backend/api.php` and `backend/config.example.php` to your PHP server.
2. Rename `config.example.php` to `config.php`.
3. Set `RECORDRANK_API_KEY` to a long random value.
4. Optionally set `RECORDRANK_ALLOWED_ORIGIN` to your GitHub Pages URL.
5. Make sure PHP can write to `backend/data`.

`config.php` and `backend/data` are ignored by git.

If the browser reports multiple `Access-Control-Allow-Origin` values, your web
server is already adding that header. In that case, set this in `config.php`:

```php
const RECORDRANK_ALLOWED_ORIGIN = null;
```

The API will still send `Access-Control-Allow-Methods` and
`Access-Control-Allow-Headers`, including `X-RecordRank-Key`, for browser
preflight requests.

## Endpoints

- `GET /api.php?action=album&id=ALBUM_ID`
- `GET /api.php?action=stats&id=ALBUM_ID`
- `POST /api.php` with header `X-RecordRank-Key`

POST actions:

- `create_album`
- `submit_review`
