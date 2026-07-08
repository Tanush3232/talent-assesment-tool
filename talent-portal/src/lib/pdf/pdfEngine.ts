// ─────────────────────────────────────────────────────────────────────────────
// PDF ENGINE — Wrapper around @react-pdf/renderer
// ─────────────────────────────────────────────────────────────────────────────
// NOTE: CLIENT-SIDE ONLY. @react-pdf/renderer uses browser APIs.
// Only import this in "use client" components.
// ─────────────────────────────────────────────────────────────────────────────

import { pdf } from "@react-pdf/renderer";
import React from "react";

/**
 * Generates a PDF Blob from a React element that uses @react-pdf/renderer components.
 *
 * @param element  A React element (Document > Page > ...) from @react-pdf/renderer
 * @returns        Promise resolving to a PDF Blob
 */
export async function generatePDFBlob(
  element: React.ReactElement<any>
): Promise<Blob> {
  const instance = pdf(element);
  const blob = await instance.toBlob();
  return blob;
}
