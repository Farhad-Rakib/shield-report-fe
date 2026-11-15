/** AI -> Provider List: a lookup entry (name + optional default model). */
export interface LlmProviderCatalogItem {
  id: number;
  name: string;
  model: string | null;
  createdAt: string;
}

export interface SaveLlmProviderCatalogItemDto {
  name: string;
  model: string | null;
}
