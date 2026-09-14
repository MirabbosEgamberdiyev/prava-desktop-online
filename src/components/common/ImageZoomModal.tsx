import { useEffect } from "react";
import { IconX } from "@tabler/icons-react";
import SecureImage from "./SecureImage";

interface Props {
  src: string;
  onClose: () => void;
}

export default function ImageZoomModal({ src, onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="img-zoom-overlay"
      onClick={onClose}
      onContextMenu={(e) => e.preventDefault()}
    >
      <button className="img-zoom-close" onClick={onClose} type="button" aria-label="Close">
        <IconX size={20} />
      </button>
      <div className="img-zoom-content" onClick={(e) => e.stopPropagation()}>
        {src.startsWith("data:") || src.startsWith("http") || src.startsWith("/") || src.startsWith("blob:") ? (
          <img
            src={src}
            alt=""
            className="img-zoom-img"
            onContextMenu={(e) => e.preventDefault()}
            draggable={false}
          />
        ) : (
          <SecureImage path={src} className="img-zoom-img" />
        )}
      </div>
    </div>
  );
}

/** ZoomableImage — image_path qabul qilib SecureImage ko'rsatadi */
interface ZoomableProps {
  path: string;
  className?: string;
  onOpen: (src: string) => void;
}

export function ZoomableImage({ path, className, onOpen }: ZoomableProps) {
  return (
    <SecureImage
      path={path}
      className={className}
      onOpen={onOpen}
    />
  );
}
