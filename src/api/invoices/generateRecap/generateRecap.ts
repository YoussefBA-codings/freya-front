import { AxiosInstance } from "../../axios/axiosInstance";

export type GenerateRecapParams = {
    monthNumber: string | number;
    currentYear: string | number;
    generate: boolean
}

export const generateRecap = async ({monthNumber, currentYear}: GenerateRecapParams) => {
  const response = await AxiosInstance.get(`invoices/generate/monthly-recap?year=${currentYear}&month=${monthNumber}`);

  return response.data;
};
