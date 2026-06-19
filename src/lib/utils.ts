export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

export function truncate(str: string | null | undefined, len: number): string {
  if (!str) return "";
  return str.length > len ? `${str.slice(0, len)}...` : str;
}
