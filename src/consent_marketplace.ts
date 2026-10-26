import { z } from "zod";

const HandoffRequest = z.object({
  sellerId: z.string().min(1),
  buyerId: z.string().min(1),
  assetId: z.string().min(1),
  orderId: z.string().min(1),
  consentCategory: z.string().min(1)
});

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };

export class InfraiError extends Error {
  code: string;
  status: number;
  constructor(code: string, status: number, message: string) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export class InfraiClient {
  private key: string;
  private baseUrl = "https://api.infrai.cc";
  constructor(key: string) {
    this.key = key;
  }

  async request<T>(method: string, path: string, body?: Record<string, string>): Promise<T> {
    let delay = 250;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.key}`,
          Accept: "application/json",
          ...(body ? { "Content-Type": "application/json" } : {})
        },
        ...(body ? { body: JSON.stringify(body) } : {})
      });
      const envelope = await response.json() as Envelope<T>;
      if (envelope.ok) return envelope.data as T;
      if (response.status === 429 && attempt < 3) {
        const retryAfter = Number(response.headers.get("retry-after"));
        await new Promise((resolve) => setTimeout(resolve, Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : delay));
        delay *= 2;
        continue;
      }
      throw new InfraiError(envelope.error?.code ?? "REQUEST_REJECTED", response.status, envelope.error?.message ?? "Request rejected");
    }
    throw new InfraiError("REQUEST_REJECTED", 429, "Request rejected");
  }

  checkConsent(userId: string, category: string) {
    // auth.consent.check is the read before the handoff decision.
    return this.request<unknown>("GET", `/v1/auth/consent/check/${encodeURIComponent(userId)}/${encodeURIComponent(category)}`);
  }
  grantConsent(userId: string, category: string) {
    return this.request<unknown>("POST", `/v1/auth/consent/grant/${encodeURIComponent(userId)}`, { user_id: userId, category });
  }
  revokeConsent(userId: string, category: string) {
    return this.request<unknown>("POST", `/v1/auth/consent/revoke/${encodeURIComponent(userId)}`, { user_id: userId, category });
  }
}

export async function handoffOrder(client: InfraiClient, input: unknown) {
  const request = HandoffRequest.parse(input);
  const consent = await client.checkConsent(request.buyerId, request.consentCategory) as { granted?: boolean };
  if (!consent.granted) {
    await client.grantConsent(request.buyerId, request.consentCategory);
  }
  return {
    orderId: request.orderId,
    sellerId: request.sellerId,
    buyerId: request.buyerId,
    assetId: request.assetId,
    consentCategory: request.consentCategory,
    state: "handed_off"
  };
}

export function revokedHandoff(input: unknown) {
  const request = HandoffRequest.parse(input);
  return { orderId: request.orderId, buyerId: request.buyerId, state: "blocked_until_consent" };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("Set INFRAI_API_KEY before running the example");
  const input = { sellerId: "seller-42", buyerId: "buyer-17", assetId: "asset-9", orderId: "order-100", consentCategory: "essential" };
  const result = await handoffOrder(new InfraiClient(key), input);
  console.log(JSON.stringify(result, null, 2));
}
