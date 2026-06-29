"use client";

import { useCallback, useRef, useState } from "react";
import { xhrUpload } from "@/lib/xhr-upload";
import Image from "next/image";

interface ImageUploadProps {
  images: string[];
  onImagesChange: (urls: string[]) => void;
}

export default function ImageUpload({ images, onImagesChange }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const res = await xhrUpload("damageImage", Array.from(files));
      const urls = res.map((f) => f.ufsUrl ?? f.url).filter(Boolean);
      if (urls.length > 0) {
        onImagesChange([...images, ...urls]);
      }
    } catch (err) {
      console.error("Upload error:", err);
      const msg = err instanceof Error ? `${err.name}: ${err.message}` : JSON.stringify(err);
      alert(`Upload fehlgeschlagen: ${msg}`);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }, [images, onImagesChange]);

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        Schadensbilder
      </label>

      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-blue-500", "bg-blue-50"); }}
        onDragLeave={(e) => { e.currentTarget.classList.remove("border-blue-500", "bg-blue-50"); }}
        onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove("border-blue-500", "bg-blue-50"); handleUpload(e.dataTransfer.files); }}
        className={`border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors ${uploading ? "opacity-50 pointer-events-none" : ""}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleUpload(e.target.files)}
          className="hidden"
        />
        {uploading ? (
          <p className="text-blue-600 font-medium">Upload läuft...</p>
        ) : (
          <div>
            <p className="text-blue-600 font-medium">
              Klicken oder Bilder hier reinziehen
            </p>
            <p className="text-xs text-gray-500 mt-1">
              PNG, JPG, WebP bis 8MB (max. 10 Bilder)
            </p>
          </div>
        )}
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-3">
          {images.map((url, i) => (
            <div key={url} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200">
              <Image
                src={url}
                alt={`Schadensbild ${i + 1}`}
                fill
                className="object-cover"
                sizes="150px"
              />
              <button
                type="button"
                onClick={() => onImagesChange(images.filter((_, j) => j !== i))}
                className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
