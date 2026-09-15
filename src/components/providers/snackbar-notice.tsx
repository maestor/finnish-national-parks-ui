"use client";

import { useEffect } from "react";
import { type SnackbarTone, useSnackbar } from "./snackbar-provider";

interface SnackbarNoticeProps {
  message: string;
  tone?: SnackbarTone;
}

export const SnackbarNotice = ({ message, tone = "success" }: SnackbarNoticeProps) => {
  const { showSnackbar } = useSnackbar();

  useEffect(() => {
    showSnackbar({ message, tone });
  }, [message, showSnackbar, tone]);

  return null;
};
