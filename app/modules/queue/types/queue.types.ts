export type JobType =
  | 'SYNC_PRODUCT'
  | 'DELETE_PRODUCT'
  | 'SYNC_CUSTOMER'
  | 'DELETE_CUSTOMER'
  | 'SYNC_ORDER'
  | 'SYNC_CHECKOUT'
  | 'SYNC_TEMPLATES'
  | 'PROCESS_AUTOMATION';

export interface SyncProductPayload {
  shop: string;
  payload: any;
}

export interface DeleteProductPayload {
  shop: string;
  id: string | number;
}

export interface SyncCustomerPayload {
  shop: string;
  payload: any;
}

export interface DeleteCustomerPayload {
  shop: string;
  id: string | number;
}

export interface SyncOrderPayload {
  shop: string;
  payload: any;
}

export interface SyncCheckoutPayload {
  shop: string;
  payload: any;
}

export interface SyncTemplatesPayload {
  shop: string;
}

export interface ProcessAutomationPayload {
  shop: string;
  checkoutId: string;
  triggerType: string;
  checkoutUpdatedAt: string; // ISO string representation
}

export type JobPayloads = {
  SYNC_PRODUCT: SyncProductPayload;
  DELETE_PRODUCT: DeleteProductPayload;
  SYNC_CUSTOMER: SyncCustomerPayload;
  DELETE_CUSTOMER: DeleteCustomerPayload;
  SYNC_ORDER: SyncOrderPayload;
  SYNC_CHECKOUT: SyncCheckoutPayload;
  SYNC_TEMPLATES: SyncTemplatesPayload;
  PROCESS_AUTOMATION: ProcessAutomationPayload;
};
