export function safeFileName(fileName: string): string {
  const cleaned = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return cleaned.length ? cleaned : "ebook";
}
