"use client";

export interface UploadResult {
  ufsUrl: string;
  url: string;
  name: string;
  size: number;
  key: string;
}

export async function xhrUpload(
  _slug: string,
  files: File[],
): Promise<UploadResult[]> {
  const fd = new FormData();
  for (const f of files) {
    fd.append("file", f);
  }

  const res = await fetch("/api/upload", {
    method: "POST",
    body: fd,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `Upload failed (${res.status})`);
  }

  const data = await res.json();
  const urls: string[] = data.urls ?? [];

  return urls.map((url, i) => ({
    ufsUrl: url,
    url,
    name: files[i]?.name ?? "",
    size: files[i]?.size ?? 0,
    key: "",
  }));
}
