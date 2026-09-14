import React, { useState, useEffect } from "react";
import { getImageUrl } from "../../utils/imageUtils";
import { offlineMediaManager } from "../../services/offlineMediaManager";
import { networkModeManager } from "../../sync/networkModeManager";
import SteeringWheelPlaceholder from "./SteeringWheelPlaceholder";

interface Props {
  path: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  onOpen?: (src: string) => void;
}

export default function SecureImage({ path, alt = "", className, style, onOpen }: Props) {
  const [hasError, setHasError] = useState(false);
  const [localSrc, setLocalSrc] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setHasError(false);

    if (!path) {
      setLocalSrc(null);
      return;
    }

    offlineMediaManager.getLocalImageUrl(path).then((cached) => {
      if (!active) return;
      if (cached) {
        setLocalSrc(cached);
      } else {
        setLocalSrc(null);
        // If online, background-cache it for future offline sessions
        if (networkModeManager.isOnlineAllowed()) {
          offlineMediaManager.cacheImage(path).catch(() => {});
        }
      }
    });

    return () => {
      active = false;
    };
  }, [path]);

  if (!path || hasError) {
    return <SteeringWheelPlaceholder />;
  }

  // In OFFLINE mode: if no local cached image exists, render placeholder immediately with 0 network calls!
  if (networkModeManager.isOfflineOnly() && !localSrc) {
    return <SteeringWheelPlaceholder />;
  }

  const src = localSrc || getImageUrl(path) || path;

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      draggable={false}
      onContextMenu={(e) => e.preventDefault()}
      onError={() => setHasError(true)}
      onClick={onOpen ? () => onOpen(src) : undefined}
      style={{ ...style, ...(onOpen ? { cursor: "zoom-in" } : {}) }}
    />
  );
}

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
