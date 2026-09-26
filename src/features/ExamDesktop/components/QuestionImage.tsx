import { memo, useEffect, useState } from "react";
import { IconPhotoOff, IconZoomIn } from "@tabler/icons-react";
import { offlineMediaManager } from "../../../services/offlineMediaManager";
import { networkModeManager } from "../../../sync/networkModeManager";
import { getImageUrl } from "../../../utils/imageUtils";

interface QuestionImageProps {
  path: string;
  alt: string;
  onZoom: (src: string) => void;
  zoomHint: string;
  brokenLabel: string;
}

/** Render with key={path}: a new question remounts this component (fresh state, no stale flash). */
type Resolved = { path: string; src: string | null; done: boolean };

/**
 * Local-first question image: uses the offline media cache (synchronously when the object URL
 * is already warm), falls back to the remote URL only when online use is allowed and the image
 * is not cached (it is then cached in the background). Auto-fits the pane (object-fit: contain).
 */
export const QuestionImage = memo(function QuestionImage({ path, alt, onZoom, zoomHint, brokenLabel }: QuestionImageProps) {
  const [res, setRes] = useState<Resolved>(() => {
    const warm = offlineMediaManager.peekLocalImageUrl(path);
    return { path, src: warm, done: !!warm };
  });
  const [broken, setBroken] = useState(false);

  const current = res;

  useEffect(() => {
    if (current.done) return;
    let alive = true;
    offlineMediaManager
      .getLocalImageUrl(path)
      .then((local) => {
        if (!alive) return;
        if (local) {
          setRes({ path, src: local, done: true });
          return;
        }
        const remote = networkModeManager.isOnlineAllowed() ? getImageUrl(path) || null : null;
        setRes({ path, src: remote, done: true });
        if (remote) offlineMediaManager.cacheImage(path).catch(() => {});
      })
      .catch(() => {
        if (alive) setRes({ path, src: null, done: true });
      });
    return () => {
      alive = false;
    };
  }, [path, current.done]);

  if (!current.done) return <div className="xd-media xd-media--loading" aria-busy="true" />;

  if (!current.src || broken) {
    return (
      <div className="xd-media xd-media--broken" role="img" aria-label={brokenLabel}>
        <IconPhotoOff size={40} stroke={1.4} aria-hidden="true" />
        <span>{brokenLabel}</span>
      </div>
    );
  }

  const src = current.src;
  return (
    <div className="xd-media">
      <button
        type="button"
        className="xd-media__btn"
        onClick={() => onZoom(src)}
        onMouseDown={(e) => e.preventDefault()}
        title={zoomHint}
      >
        <img
          src={src}
          alt={alt}
          className="xd-media__img"
          draggable={false}
          decoding="async"
          onError={() => setBroken(true)}
          onContextMenu={(e) => e.preventDefault()}
        />
        <span className="xd-media__hint" aria-hidden="true">
          <IconZoomIn size={14} /> <kbd className="xd-kbd">Z</kbd>
        </span>
      </button>
    </div>
  );
});

export default QuestionImage;
