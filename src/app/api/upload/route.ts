import { NextRequest, NextResponse } from "next/server";
import { validOrigin } from "@/lib/validate";
import { rateLimitIP } from "@/lib/rate-limit";

export const runtime = "nodejs";

const MAX_FILES = 10;
const MAX_FILE_SIZE = 8 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(req: NextRequest) {
  if (!validOrigin(req.headers.get("origin"))) {
    return NextResponse.json({ error: "Ungültiger Origin" }, { status: 403 });
  }

  if (!(await rateLimitIP(req, 10, 60_000, "upload"))) {
    return NextResponse.json({ error: "Zu viele Uploads" }, { status: 429 });
  }

  try {
    const formData = await req.formData();
    const filesRaw = formData.getAll("file") as File[];
    if (filesRaw.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }
    if (filesRaw.length > MAX_FILES) {
      return NextResponse.json({ error: `Max ${MAX_FILES} Dateien` }, { status: 400 });
    }
    for (const f of filesRaw) {
      if (f.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: `${f.name} ist zu groß (max 8MB)` }, { status: 400 });
      }
      if (!ALLOWED_TYPES.includes(f.type)) {
        return NextResponse.json({ error: `${f.name}: ungültiger Dateityp ${f.type}` }, { status: 400 });
      }
    }

    // 1. Request presigned URLs from the uploadthing route handler
    const presignedRes = await fetch(
      `${req.nextUrl.origin}/api/uploadthing?actionType=upload&slug=damageImage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: null,
          files: filesRaw.map((f) => ({
            name: f.name,
            size: f.size,
            type: f.type,
            lastModified: f.lastModified,
          })),
        }),
      },
    );
    if (!presignedRes.ok) {
      const text = await presignedRes.text().catch(() => "");
      return NextResponse.json({ error: `Presign failed: ${text}` }, { status: 502 });
    }
    const presignedBody = await presignedRes.json();
    const presigneds: Array<{ key: string; url: string }> = Array.isArray(presignedBody) ? presignedBody : (presignedBody.data ?? []);
    if (presigneds.length !== filesRaw.length) {
      return NextResponse.json(
        { error: `Expected ${filesRaw.length} presigned URLs, got ${presigneds.length}` },
        { status: 502 },
      );
    }

    // 2. Upload each file to the presigned URL (server-side, no CORS issues)
    const uploadResults: Array<{ key: string; name: string; size: number; type: string }> = [];
    await Promise.all(
      presigneds.map(async (presigned, i) => {
        const file = filesRaw[i];
        const body = new FormData();
        body.set("file", file);
        const upRes = await fetch(presigned.url, {
          method: "PUT",
          headers: {
            "x-uploadthing-version": "7.7.4",
          },
          body,
        });
        if (!upRes.ok) {
          const text = await upRes.text().catch(() => "");
          throw new Error(`Upload to ingest failed (${upRes.status}): ${text}`);
        }
        uploadResults.push({ key: presigned.key, name: file.name, size: file.size, type: file.type });
      }),
    );

    // 3. Call callback to finalize (returns the real ufsUrl)
    let urls: string[] = [];
    try {
      const cbRes = await fetch(
        `${req.nextUrl.origin}/api/uploadthing?actionType=callback&slug=damageImage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ files: uploadResults }),
        },
      );
      if (cbRes.ok) {
        const cbBody = await cbRes.json();
        const cbData: Array<{ url?: string; ufsUrl?: string }> = cbBody.data ?? [];
        urls = cbData.map((d) => d.ufsUrl ?? d.url ?? "");
      }
    } catch {}

    // fallback if callback didn't return URLs
    if (urls.length === 0) {
      urls = uploadResults.map((r) => `https://utfs.io/f/${r.key}`);
    }

    return NextResponse.json({ urls });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
