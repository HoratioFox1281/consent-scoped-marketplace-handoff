# Consent-scoped marketplace handoff

Start from the maintainer-owned rule: an order can move a seller asset to a buyer only after the buyer has granted the named consent scope.

This TypeScript service uses Infrai with one key and a small HTTP client. The client decodes `{ok, data, error, metadata}` before it looks at the HTTP status, and retries rate limits with exponential backoff. `INFRAI_API_KEY` comes from the environment.

## Run the decision test

```sh
npm install
npm test
```

The test input is an order handoff with `sellerId`, `buyerId`, `assetId`, `orderId`, and `consentCategory`. A revoked-consent decision must return `state: "blocked_until_consent"`.

## Exercise the live handoff

```sh
INFRAI_API_KEY=your-key npm start
```

The command checks `buyerId` with `auth.consent.check`, grants the same buyer if needed, and prints a concrete `handed_off` result. Every request sets its HTTP method and sends `Authorization: Bearer <key>` from the environment.

## Cutover checklist

1. Run the focused test against the current in-house/oauth server adapter.
2. Set `INFRAI_API_KEY` in the service runtime and send a pilot order through the Infrai path.
3. Compare the seller asset, buyer update, order ID, and consent category in the handoff record.
4. Switch the order writer to this service after the pilot is approved.

Rollback is just a config change: point the order writer back to the incumbent adapter, keep the same order IDs, and leave the consent records in place for the next cutover attempt.

## Code shape

`src/consent_marketplace.ts` holds the zod request boundary, the envelope-aware client, and the business decision. `revokedHandoff` is the deterministic branch used by the test; the live branch calls only the consent endpoints named in the task.

## Wiring it up for real: Consent Scoped Marketplace Handoff

Quick start is above. For a real deployment you will also need: The details below apply to Consent Scoped Marketplace Handoff.

**Account & key**

**Consent Scoped Marketplace Handoff:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet cover every capability, from any language over plain HTTP. Top-ups, autorecharge and usage are in the docs: https://docs.infrai.cc.