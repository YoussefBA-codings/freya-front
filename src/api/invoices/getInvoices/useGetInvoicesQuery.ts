import { useQuery } from "@tanstack/react-query";
import { getInvoices, getInvoicesByOrderId, GetInvoicesByOrderNumberParams, GetInvoicesParams } from "./getInvoices";

const useGetInvoicesQueryKey = "get-invoices-key";

export const useGetInvoicesQuery = (params: GetInvoicesParams) =>
  useQuery({
    queryFn: () => getInvoices(params),
    queryKey: [useGetInvoicesQueryKey, params],
    enabled: Boolean(
      params.monthNumber && params.year && params.limit && params.page
    ),
  });

  const useGetInvoicesByOrderNameQueryKey = "get-invoices-by-order-name-key";

export const useGetInvoicesByOrderNameQuery = (params: GetInvoicesByOrderNumberParams) =>
  useQuery({
    queryFn: () => getInvoicesByOrderId(params),
    queryKey: [useGetInvoicesByOrderNameQueryKey, params],
    enabled: Boolean(
      params.orderNumber
    ),
  });
