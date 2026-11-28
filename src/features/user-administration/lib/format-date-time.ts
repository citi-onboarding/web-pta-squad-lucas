import { parseAbsolute } from "@/shared/lib/datetime";

const formatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

// dd/mm/aaaa hh:mm in the browser's time zone.
export function formatDateTime(iso: string) {
  return formatter.format(parseAbsolute(iso)).replace(", ", " ");
}
