import { LoginRequestDto, LoginResponseDto, RefreshTokenResponseDto } from '../../domain/dto/auth.dto';

export interface IAuthService {
  login(dto: LoginRequestDto): Promise<LoginResponseDto>;
  logout(): Promise<void>;
  refreshToken(): Promise<RefreshTokenResponseDto>;
}
