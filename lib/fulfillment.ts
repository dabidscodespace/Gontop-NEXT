import "server-only";

/**
 * Fulfillment is deliberately separate from order management. The initial
 * launch uses manual fulfillment: an admin tops up the player account and then
 * advances the order. A supplier API can later implement this interface
 * without changing order, payment or storefront code.
 */
export type FulfillmentOrder = {
  orderId: number;
  publicId: string;
  productName: string;
  variationNames: string[];
  playerFields: Record<string, string>;
};

export type FulfillmentResult =
  | { outcome: "manual_required"; message: string }
  | { outcome: "completed"; reference?: string; message?: string }
  | { outcome: "failed"; message: string; retryable?: boolean };

export interface FulfillmentProvider {
  key: string;
  label: string;
  automatic: boolean;
  fulfill(order: FulfillmentOrder): Promise<FulfillmentResult>;
}

const manualProvider: FulfillmentProvider = {
  key: "manual",
  label: "Manual fulfillment",
  automatic: false,
  async fulfill() {
    return {
      outcome: "manual_required",
      message:
        "Top up the player account in the game, then mark the order Completed only after delivery is confirmed.",
    };
  },
};

const providers = new Map<string, FulfillmentProvider>([[manualProvider.key, manualProvider]]);

export function registerFulfillmentProvider(provider: FulfillmentProvider) {
  providers.set(provider.key, provider);
}

export function getFulfillmentProvider() {
  const configured = process.env.FULFILLMENT_PROVIDER;
  return (configured && providers.get(configured)) || manualProvider;
}
