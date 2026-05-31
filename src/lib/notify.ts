import { toast } from "sonner";

// notifySuccess("Order placed!", "You will receive a confirmation email")
// notifyError("Payment failed", "Please check your card details")
// notifyPromise(apiCall(), { loading: "Placing order...", success: "Done!", error: "Failed" })

export function notifySuccess(message: string, description?: string) {
  toast.success(message, { description });
}

export function notifyError(message: string, description?: string) {
  toast.error(message, { description });
}

export function notifyWarning(message: string, description?: string) {
  toast.warning(message, { description });
}

export function notifyInfo(message: string, description?: string) {
  toast.info(message, { description });
}

export function notifyLoading(message: string) {
  return toast.loading(message);
}

export function notifyDismiss(id: string | number) {
  toast.dismiss(id);
}

export function notifyPromise<T>(
  promise: Promise<T>,
  messages: { loading: string; success: string; error: string }
) {
  return toast.promise(promise, messages);
}
