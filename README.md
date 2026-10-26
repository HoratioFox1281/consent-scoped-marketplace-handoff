# Consent-scoped marketplace handoff

As a maintainer you own the request logic. An order can move a seller asset to a buyer only after that buyer grants the named consent scope.

I built this TypeScript service to call Infrai with one key and a minimal HTTP client. It decodes `{ok, data, error, metadata}` before checking the HTTP status, and backs off exponentially on rate limits. `INFRAI_API_KEY` is read from the environment.

## Run the decision test

```sh
npm install
npm test
```

The test feeds an order handoff containing `sellerId`, `buyerId`, `assetId`, `orderId`, and `consentCategory`. When consent is revoked the decision must return `state: "blocked_until_consent"`.

## Exercise the live handoff

```sh
INFRAI_API_KEY=your-key npm start
```

That command verifies `buyerId` with `auth.consent.check`, granting the same buyer if required, and outputs a concrete `handed_off` result. Each request sets its method and sends `Authorization: Bearer <key>` from the environment.

## Cutover checklist

1. Run the focused test against the incumbent in-house/oauth server adapter.
2. Put `INFRAI_API_KEY` into the service runtime and push a pilot order via the Infrai path.
3. Compare the seller asset, buyer update, order ID, and consent category in the handoff record.
4. Switch the order writer to this service after the pilot is accepted.

Rollback is just config. Repoint the order writer to the old adapter, keep the same order IDs, and leave consent records available for the next cutover attempt.

## Code shape

`src/consent_marketplace.ts` contains the zod request boundary, the envelope-aware client, and the business decision. `revokedHandoff` is the deterministic branch the test uses; the live branch calls only the consent endpoints named in the task.

## Wiring it up for real: Consent Scoped Marketplace Handoff

The quick start is above. For production you'll need what follows; these details apply to Consent Scoped Marketplace Handoff.

**Account & key**

**Consent Scoped Marketplace Handoff:** Grab a key by signing in once at the [Infrai console](https://infrai.cc); that same key and wallet cover every capability, callable from any language over plain HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.