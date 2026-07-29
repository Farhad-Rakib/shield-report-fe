export interface ClientOrganization {
  id: number;
  publicId: string;
  name: string;
  primaryContactName: string | null;
  primaryContactEmail: string | null;
  isActive: boolean;
  allowSelfServiceScanning: boolean;
  allowScanConsoleAccess: boolean;
}
