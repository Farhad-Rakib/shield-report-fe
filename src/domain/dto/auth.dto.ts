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

export interface RegisterRequestDto {
  fullName: string;
  email: string;
  password: string;
  roles: string[];
}

export interface RegisterResponseDto {
  user: {
    id: number;
    fullName: string;
    email: string;
    isActive: boolean;
    roles: string[];
  };
}
