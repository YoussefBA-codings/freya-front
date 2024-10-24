import { useQuery } from "@tanstack/react-query";
import { syncInvoice, SyncInvoiceParams } from "./syncInvoice";

const useGetInvoicesQueryKey = "sync-invoice-key";

export const useSyncsInvoicesQuery = (params: SyncInvoiceParams) =>
  useQuery({
    queryFn: () => syncInvoice(params),
    queryKey: [useGetInvoicesQueryKey, params],
    enabled: Boolean(
      params.invoiceId
    ),
  });
