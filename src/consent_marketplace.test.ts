import assert from "node:assert/strict";
import { revokedHandoff } from "./consent_marketplace.ts";

const result = revokedHandoff({ sellerId: "seller-42", buyerId: "buyer-17", assetId: "asset-9", orderId: "order-100", consentCategory: "order_handoff" });
assert.deepEqual(result, { orderId: "order-100", buyerId: "buyer-17", state: "blocked_until_consent" });
assert.throws(() => revokedHandoff({ buyerId: "buyer-17" }), /Required/);
console.log("consent decision test passed");
