import { AxiosInstance } from "../../axios/axiosInstance";

export type GetInvoicesParams = {
  monthNumber: string | number;
  year: string | number;
  page: string;
  limit: string;
};
export type GetInvoicesByOrderNumberParams = {
    orderNumber: string;
  };
export type GetInvoiceDB = {
  id: number;
  orderNumber: string;
  orderShopifyID: string;
  isCancelled: boolean;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  customerName: string;
  addressLine1: string;
  city: string;
  zip: string;
  country: string;
  totalDiscount: number;
  shippingAmount: number;
  items: {
    sku: string;
    name: string;
    quantity: number;
    unit_cost: number;
  }[];
  countedProducts: {
    sku: string;
    name: string;
    quantity: number;
    unit_cost: number;
  }[];
  ignoredProducts: {
    name: string;
    quantity: number;
    unit_cost: number;
  }[];
  isInvoiceCreated: boolean;
  invoiceUrl: string;
  createdAt: string;
  updatedAt: string;
};
export const getInvoices = async ({
  monthNumber,
  year,
  page,
  limit,
}: GetInvoicesParams) => {
  const response = await AxiosInstance.get(
    `invoices?month=${monthNumber}&year=${year}&page=${page}&limit=${limit}`
  );

  return response.data;
};
export const getInvoicesByOrderId = async ({
  orderNumber,
}: GetInvoicesByOrderNumberParams) => {
  const response = await AxiosInstance.get(
    `invoices/order?orderNumber=${orderNumber}`
  );

  return response.data;
};
