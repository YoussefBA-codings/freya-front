import { useQuery } from "@tanstack/react-query";
import { generateRecap, GenerateRecapParams } from "./generateRecap";

const useGetInvoicesQueryKey = "sync-invoice-key";

export const useGenerateRecapQuery = (params: GenerateRecapParams) =>
  useQuery({
    queryFn: () => generateRecap(params),
    queryKey: [useGetInvoicesQueryKey, params],
    enabled: params.generate === true
  });
