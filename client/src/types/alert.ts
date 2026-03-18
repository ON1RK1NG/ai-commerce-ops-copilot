export type AlertListItem = {
  id: number;
  productId: number | null;
  sku: string;
  productName: string;
  alertType: string;
  severity: string;
  title: string;
  description: string;
  status: string;
  createdAtUtc: string;
  resolvedAtUtc: string | null;
};

export type AlertListResponse = {
  items: AlertListItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  openCount: number;
  acknowledgedCount: number;
  resolvedCount: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
};

export type AlertQueryParameters = {
  search?: string;
  status?: string;
  severity?: string;
  alertType?: string;
  page?: number;
  pageSize?: number;
};