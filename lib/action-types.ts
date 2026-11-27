export type ImportPreviewView = {
  totalRows: number;
  products: number;
  validProducts: number;
  skippedProducts: number;
  errors: Array<{ row: number; message: string }>;
  warnings: string[];
  items: Array<{
    productSlug: string;
    productName: string;
    gameSlug: string;
    exists: boolean;
    variationCount: number;
    minPrice: number;
    image: string;
    rows: number[];
  }>;
  gamesToCreate: string[];
};

export type MigrationPreviewView = {
  kind: "customers" | "orders";
  totalRows: number;
  groups: number;
  newGroups: number;
  existingGroups: number;
  errors: Array<{ row: number; message: string }>;
  warnings: string[];
  items: Array<{
    key: string;
    label: string;
    email: string;
    total: number | null;
    status: string | null;
    exists: boolean;
    rows: number[];
  }>;
};

export type FormState = {
  ok: boolean;
  error?: string;
  message?: string;
  preview?: ImportPreviewView;
  migration?: MigrationPreviewView;
  warnings?: string[];
  imported?: number;
  importedVariations?: number;
  importedCustomers?: number;
  importedOrders?: number;
  skipped?: number;
};


export const EMPTY_FORM_STATE: FormState = { ok: false };
