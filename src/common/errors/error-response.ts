export interface ErrorResponse {
  message: string;
  code: string;
  details: Record<string, unknown>;
}
