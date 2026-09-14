import React from "react";
import { getImageUrl } from "../../utils/imageUtils";

interface Props {
  path: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  onOpen?: (src: string) => void;
}

export default function SecureImage({ path, alt = "", className, style, onOpen }: Props) {
  if (!path) {
    return <div className="secure-img-placeholder" style={style} />;
  }

  const src = getImageUrl(path) || path;

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      draggable={false}
      onContextMenu={(e) => e.preventDefault()}
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
