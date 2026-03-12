import axios from "axios";

export const http = axios.create({
  baseURL: "https://localhost:7017/api",
});