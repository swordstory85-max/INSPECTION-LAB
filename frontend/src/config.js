/// <reference types="vite/client" />

const RAW_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
export const API_BASE_URL = RAW_API_BASE_URL.replace(/\/$/, "");
