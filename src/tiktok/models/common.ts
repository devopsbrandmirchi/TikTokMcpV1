export interface PaginationResult {
  page: number;
  page_size: number;
  total_number?: number;
  total_page?: number;
  has_more: boolean;
}

export interface NormalizedListResponse<T> {
  advertiser_id: string;
  items: T[];
  pagination: PaginationResult;
}
