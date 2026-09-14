export interface ApiError {
  response?: {
    status?: number;
    data?: {
      message?: string;
    };
  };
}

export function getErrorMessage(error: unknown, defaultMessage: string): string {
  return (error as ApiError)?.response?.data?.message || defaultMessage;
}
