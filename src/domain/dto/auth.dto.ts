export interface LoginRequestDto {
  email: string;
  password: string;
}

export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  errors: string | null;
  timestamp: string;
}

export interface LoginResponseDto {
  accessToken: string;
  accessTokenExpiresAtUtc: string;
}

export interface RefreshTokenResponseDto {
  accessToken: string;
  accessTokenExpiresAtUtc: string;
}

