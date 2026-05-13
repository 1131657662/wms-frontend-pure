import axios from "axios";
import { applyWmsApiInterceptors } from "./wmsInterceptors";

const api = axios.create({
  baseURL: "/api",
  timeout: 30000
});

applyWmsApiInterceptors(api);

export default api;
