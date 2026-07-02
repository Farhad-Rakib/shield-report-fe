export interface CreateClientOrganizationRequestDto {
  name: string;
  primaryContactName?: string | null;
  primaryContactEmail?: string | null;
  allowSelfServiceScanning?: boolean;
}

export interface UpdateClientOrganizationRequestDto {
  name: string;
  primaryContactName?: string | null;
  primaryContactEmail?: string | null;
  allowSelfServiceScanning: boolean;
}
