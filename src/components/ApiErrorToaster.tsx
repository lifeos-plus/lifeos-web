import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/contexts/ToastContext";
import { subscribeApiError } from "@/services/api/errorBus";

export default function ApiErrorToaster() {
  const toast = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    const unsubscribe = subscribeApiError((detail) => {
      const title = detail?.title || t("apiErrors.networkServiceError");
      const message = detail?.message || t("common.requestFailed");
      toast.showError(title, message);
    });
    return unsubscribe;
  }, [t, toast]);

  return null;
}
