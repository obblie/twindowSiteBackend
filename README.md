# Twindow License Backend

Backend-only Node service for desktop app license lifecycle with Lemon Squeezy.

## Endpoints

- `POST /api/license/activate`
- `POST /api/license/validate`
- `POST /api/license/deactivate`
- `POST /api/webhooks/lemon-squeezy` (optional)
- `GET /health`

## Stable response contract

Success:

```json
{
  "ok": true,
  "license": {
    "status": "active",
    "instanceId": "12345",
    "entitlements": { "premium": true },
    "nextCheckAt": "2026-03-07T02:00:00.000Z"
  },
  "error": null
}
```

Failure:

```json
{
  "ok": false,
  "license": null,
  "error": {
    "code": "INVALID_LICENSE",
    "message": "License is invalid"
  }
}
```

## Request examples

Activate:

```json
{
  "licenseKey": "XXXX-XXXX-XXXX-XXXX",
  "instanceName": "MacBook-Pro-Home"
}
```

Validate:

```json
{
  "licenseKey": "XXXX-XXXX-XXXX-XXXX",
  "instanceId": "12345"
}
```

Deactivate:

```json
{
  "licenseKey": "XXXX-XXXX-XXXX-XXXX",
  "instanceId": "12345"
}
```

## Environment

Copy `.env.example` to `.env` and fill values.

Required:

- `LEMON_SQUEEZY_STORE_ID`
- `LEMON_SQUEEZY_PRODUCT_ID` or `LEMON_SQUEEZY_VARIANT_ID`

Optional:

- `LEMON_SQUEEZY_API_KEY`
- `LEMON_SQUEEZY_WEBHOOK_SIGNING_SECRET`
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
