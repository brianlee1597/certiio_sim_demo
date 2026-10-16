"use client";
import { upload } from "@vercel/blob/client";
import { api } from "./shared";
export async function uploadArtifact(
  blob: Blob,
  name: string,
  kind: "board" | "project",
  onProgress?: (percentage: number) => void,
) {
  const init = await api("/api/artifacts/init", {
    name,
    size: blob.size,
    kind,
  });
  await upload(init.pathname, blob, {
    access: "private",
    handleUploadUrl: "/api/uploads",
    contentType: kind === "board" ? "image/png" : "application/zip",
    multipart: blob.size > 5 * 1024 * 1024,
    onUploadProgress: (e) => onProgress?.(Math.round(e.percentage)),
  });
  await api(`/api/artifacts/${init.id}/complete`, {});
  return { id: init.id, name, size: blob.size };
}
