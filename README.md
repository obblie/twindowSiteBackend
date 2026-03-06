# Twindow License Backend

Backend-only Node service for desktop app license lifecycle with Lemon Squeezy.

## Endpoints

- `POST /api/license/activate`
- `POST /api/license/validate`
- `POST /api/license/deactivate` (optional in app flow)
- `POST /api/webhooks/lemon-squeezy` (optional)
- `GET /health`

## Request payloads

Activate:

```json
{
  "license_key": "XXXX-XXXX-XXXX-XXXX",
  "machine_fingerprint": "sha256-hash"
}
```

Validate:

```json
{
  "license_key": "XXXX-XXXX-XXXX-XXXX",
  "machine_fingerprint": "sha256-hash",
  "instance_id": "12345"
}
```

Deactivate:

```json
{
  "license_key": "XXXX-XXXX-XXXX-XXXX",
  "machine_fingerprint": "sha256-hash",
  "instance_id": "12345"
}
```

## Response contracts

Activate/Validate:

```json
{
  "active": true,
  "tier": "premium",
  "instanceID": "12345",
  "expiresAt": null,
  "message": null
}
```

Deactivate:

```json
{
  "deactivated": true,
  "message": null
}
```

Failure (`400`, `502`, `500`):

```json
{
  "message": "human readable safe error"
}
```

## Environment

Copy `.env.example` to `.env` and fill values.

Required:

- `LEMON_SQUEEZY_API_KEY`

Optional:

- `LEMON_API_BASE_URL` (default `https://api.lemonsqueezy.com/v1`)
- `LEMON_SQUEEZY_WEBHOOK_SIGNING_SECRET`
- `APP_ENV`
- `LOG_LEVEL`
- `CORS_ORIGIN`

## Scripts

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run typecheck`

## Render

Web Service settings:

- Build Command: `npm install --include=dev && npm run build`
- Start Command: `npm run start`
- Port: `10000` (or Render-injected `PORT`)

