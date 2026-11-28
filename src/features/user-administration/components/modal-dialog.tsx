import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";

type ModalDialogProps = {
  title: string;
  dismissible?: boolean;
  onClose: () => void;
  children: ReactNode;
};

export function ModalDialog({
  title,
  dismissible = true,
  onClose,
  children,
}: ModalDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;

    if (!dialog || dialog.open) {
      return;
    }

    if (typeof dialog.showModal === "function") {
      dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }
  }, []);

  // Chromium honors a prevented `cancel` only twice, so the key is blocked too.
  // The listener sits on the document because a disabled button loses focus.
  useEffect(() => {
    if (dismissible) {
      return;
    }

    const blockEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
      }
    };

    document.addEventListener("keydown", blockEscape, true);

    return () => document.removeEventListener("keydown", blockEscape, true);
  }, [dismissible]);

  return (
    <dialog
      aria-labelledby={titleId}
      className="bg-background text-foreground m-auto w-[calc(100%-2rem)] max-w-md rounded-lg border border-zinc-500 p-5"
      onCancel={(event) => {
        event.preventDefault();

        if (dismissible) {
          onClose();
        }
      }}
      ref={ref}
    >
      <h2 className="text-lg font-semibold" id={titleId}>
        {title}
      </h2>
      {children}
    </dialog>
  );
}
