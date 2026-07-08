// ─────────────────────────────────────────────────────────────────────────────
// ZIP ENGINE — Client-side ZIP generation using JSZip
// ─────────────────────────────────────────────────────────────────────────────
// NOTE: This module is CLIENT-SIDE ONLY. Do not import in server components or
// Next.js API routes.
// ─────────────────────────────────────────────────────────────────────────────

import JSZip from "jszip";

export interface ZipFile {
  /** Filename inside the zip archive */
  name: string;
  /** PDF blob to include */
  blob: Blob;
}

/**
 * Generates a Blob for a ZIP archive containing the given files.
 *
 * @param files     Array of { name, blob } objects to include
 * @param onProgress Optional callback called after each file is added (completed, total)
 * @returns         Promise resolving to a ZIP Blob
 */
export async function generateZipBlob(
  files: ZipFile[],
  onProgress?: (completed: number, total: number) => void
): Promise<Blob> {
  const zip = new JSZip();

  for (let i = 0; i < files.length; i++) {
    const { name, blob } = files[i];
    const arrayBuffer = await blob.arrayBuffer();
    zip.file(name, arrayBuffer);
    onProgress?.(i + 1, files.length);
  }

  return zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}

/**
 * Triggers a browser download for any Blob.
 * Uses the URL object API (no external library needed).
 */
export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke after a short delay to allow the download to start
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
