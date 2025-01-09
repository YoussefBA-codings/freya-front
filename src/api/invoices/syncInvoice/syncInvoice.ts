import { AxiosInstance } from "../../axios/axiosInstance";

export type SyncInvoiceParams = {
    invoiceId: string;
    launchSync: boolean;
}

export const syncInvoice = async ({invoiceId}: SyncInvoiceParams) => {
  const response = await AxiosInstance.get(`invoices/sync/${invoiceId}`);

  return response.data;
};
