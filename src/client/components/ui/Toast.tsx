
interface ToastProps {
  open: boolean;
  message: string;
  description?: string;
}

export const Toast = ({ open, message, description }: ToastProps) => {
  return (
    <>
      {open ? (
        <div className="mimic-toast-card fixed bottom-6 left-1/2 z-40 w-[min(92vw,420px)] -translate-x-1/2 rounded-[1.5rem] border border-[#ecd3b9] bg-[#fff7ef] px-5 py-4 shadow-[0_18px_46px_rgba(108,72,41,0.18)]">
          <p className="text-sm font-semibold text-[#5f3e23]">{message}</p>
          {description ? <p className="mt-1 text-sm text-[#7d5d40]">{description}</p> : null}
        </div>
      ) : null}
    </>
  );
};
