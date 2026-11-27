export const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export const toNumber = (value: string | number | null | undefined) => {
  const n = typeof value === "number" ? value : Number.parseFloat(String(value ?? "0"));
  return Number.isFinite(n) ? n : 0;
};

export const money = (value: string | number | null | undefined) => round2(toNumber(value));

export const formatBDT = (value: string | number | null | undefined) =>
  `৳${money(value).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

/** Compare two monetary values without floating-point drift. */
export const sameAmount = (a: string | number, b: string | number) =>
  Math.round(toNumber(a) * 100) === Math.round(toNumber(b) * 100);

export class AppError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status = 400, code?: string) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
  }
}
