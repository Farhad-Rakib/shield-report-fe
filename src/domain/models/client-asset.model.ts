// String values mirror ShieldReport.Domain.Enums exactly — backend DTOs serialize these via
// `.ToString()`, not as numeric enum values, so these are plain string unions, not numbers.
export type AssetType = 'WebUrl' | 'IpRange' | 'MobileApp' | 'Api' | 'CloudEnvironment' | 'Other';
export type AssetEnvironment = 'Unknown' | 'Development' | 'Staging' | 'Production';
export type Criticality = 'Low' | 'Medium' | 'High';

export interface ClientAsset {
  id: number;
  publicId: string;
  clientOrganizationId: number;
  clientOrganizationName: string;
  name: string;
  assetType: AssetType;
  identifier: string;
  environment: AssetEnvironment;
  criticality: Criticality;
  isAuthorizedForScanning: boolean;
  authorizedAt: string | null;
  authorizedByUserId: number | null;
  isActive: boolean;
}
