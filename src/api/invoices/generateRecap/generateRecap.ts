import { AxiosInstance } from "../../axios/axiosInstance";

export type GenerateRecapParams = {
    monthNumber: string;
    currentYear: string;
    generate: boolean
}

export const generateRecap = async ({monthNumber, currentYear}: GenerateRecapParams) => {
  const response = await AxiosInstance.get(`invoices/generate/monthly-recap?year=${currentYear}&month=${monthNumber}`);

  return response.data;
};
