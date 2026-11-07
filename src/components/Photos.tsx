import { useEffect, useMemo, useRef, useState } from 'react';
import { MAX_PHOTOS } from '../db';
import { compressImage } from '../lib/images';

export interface PhotoItem {
  key: string; // stable key: "db-<id>" for saved photos, "new-<n>" for unsaved
  blob: Blob;
}

/** Object URLs for blobs, revoked automatically. */
function useObjectUrls(blobs: Blob[]) {
  const urls = useMemo(() => blobs.map((b) => URL.createObjectURL(b)), [blobs]);
  useEffect(() => {
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [urls]);
  return urls;
}

/* ---------- Form: pick up to 4 photos ---------- */
export function PhotoPicker({
  items,
  onChange,
}: {
  items: PhotoItem[];
  onChange: (items: PhotoItem[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const counter = useRef(0);
  const [busy, setBusy] = useState(false);
  const blobs = useMemo(() => items.map((i) => i.blob), [items]);
  const urls = useObjectUrls(blobs);
  const remaining = MAX_PHOTOS - items.length;

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (!files.length) return;
    if (files.length > remaining) {
      alert(`Only ${MAX_PHOTOS} photos allowed. Adding the first ${remaining}.`);
    }
    setBusy(true);
    try {
      const added = await Promise.all(
        files.slice(0, remaining).map(async (f) => ({
          key: `new-${counter.current++}`,
          blob: await compressImage(f),
        })),
      );
      onChange([...items, ...added]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="photo-grid">
      {items.map((item, i) => (
        <div className="photo" key={item.key}>
          <img src={urls[i]} alt={`Photo ${i + 1}`} />
          <button
            type="button"
            className="photo-remove"
            aria-label="Remove photo"
            onClick={() => onChange(items.filter((x) => x.key !== item.key))}
          >
            ×
          </button>
        </div>
      ))}
      {remaining > 0 && (
        <button
          type="button"
          className="photo add"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          <span className="plus">{busy ? '…' : '+'}</span>
          <span>{busy ? 'Adding' : 'Add photo'}</span>
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={onFiles} />
    </div>
  );
}

/* ---------- Details: show photos, tap to view full screen ---------- */
export function PhotoGallery({ blobs }: { blobs: Blob[] }) {
  const urls = useObjectUrls(blobs);
  const [open, setOpen] = useState<number | null>(null);

  if (!blobs.length) return null;

  return (
    <>
      <div className="photo-grid">
        {urls.map((u, i) => (
          <button type="button" className="photo" key={u} onClick={() => setOpen(i)}>
            <img src={u} alt={`Photo ${i + 1}`} />
          </button>
        ))}
      </div>
      {open !== null && (
        <div className="lightbox" onClick={() => setOpen(null)}>
          <img src={urls[open]} alt={`Photo ${open + 1}`} />
          <button type="button" className="lightbox-close" aria-label="Close">
            ×
          </button>
          {urls.length > 1 && (
            <div className="lightbox-nav" onClick={(e) => e.stopPropagation()}>
              <button type="button" onClick={() => setOpen((open + urls.length - 1) % urls.length)}>
                ‹
              </button>
              <span>
                {open + 1} / {urls.length}
              </span>
              <button type="button" onClick={() => setOpen((open + 1) % urls.length)}>
                ›
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
