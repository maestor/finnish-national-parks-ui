"use client";

const API_KEY_STORAGE_KEY = "fnp-api-key";

export const getStoredApiKey = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(API_KEY_STORAGE_KEY);
};

export const setStoredApiKey = (key: string): void => {
  if (typeof window === "undefined") return;
  localStorage.setItem(API_KEY_STORAGE_KEY, key);
};

export const clearStoredApiKey = (): void => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(API_KEY_STORAGE_KEY);
};
