const ICON_FOR: Record<string, string> = {
  "application/pdf": "picture_as_pdf",
  "image/jpeg": "image",
  "image/png": "image",
  "image/webp": "image",
};

export function fileIcon(contentType: string): string {
  return ICON_FOR[contentType] ?? "description";
}
