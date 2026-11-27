import type { OrderFulfillmentStatus, OrderPaymentStatus, OrderStatus } from "@/db/schema";

/**
 * Lifecycle status shown to admins and customers. Payment and fulfillment
 * are also stored separately (`payment_status`, `fulfillment_status`); see
 * `fulfillmentStatusFor` for how the two are kept in step.
 */
export const TERMINAL_STATUSES: OrderStatus[] = ["completed", "cancelled", "refunded"];

export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ["cancelled", "failed"],
  paid: ["processing", "completed", "failed", "on_hold"],
  processing: ["completed", "failed", "on_hold"],
  on_hold: ["processing", "failed"],
  // Retry: a failed fulfillment of a paid order can be started again.
  failed: ["processing"],
  completed: [],
  cancelled: [],
  refunded: [],
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: "Pending Payment",
  paid: "Paid",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
  on_hold: "On Hold",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export const PAYMENT_STATUS_LABELS: Record<OrderPaymentStatus, string> = {
  pending: "Unpaid",
  paid: "Paid",
  failed: "Payment failed",
  partially_refunded: "Partially refunded",
  refunded: "Refunded",
};

export const FULFILLMENT_STATUS_LABELS: Record<OrderFulfillmentStatus, string> = {
  pending: "Not started",
  processing: "In progress",
  on_hold: "On hold",
  completed: "Delivered",
  failed: "Failed",
  cancelled: "Cancelled",
};

/**
 * Fulfillment status implied by a lifecycle status, or `null` when the
 * lifecycle status does not change fulfillment (payment-only states).
 */
export function fulfillmentStatusFor(status: OrderStatus): OrderFulfillmentStatus | null {
  switch (status) {
    case "processing":
      return "processing";
    case "completed":
      return "completed";
    case "failed":
      return "failed";
    case "on_hold":
      return "on_hold";
    case "cancelled":
      return "cancelled";
    default:
      return null;
  }
}
