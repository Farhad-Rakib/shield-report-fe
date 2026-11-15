import { ListFilterQuery } from './list-filter.dto';
import { AssetType, AssetEnvironment, Criticality } from '../models/client-asset.model';

export interface CreateClientAssetRequestDto {
  clientOrganizationId: number;
  name: string;
  assetType: AssetType;
  identifier: string;
  environment: AssetEnvironment;
  criticality: Criticality;
}

export interface ClientAssetListQuery extends ListFilterQuery {
  page?: number;
  pageSize?: number;
  search?: string;
}

export interface UpdateClientAssetRequestDto {
  name: string;
  identifier: string;
  environment: AssetEnvironment;
  criticality: Criticality;
}
