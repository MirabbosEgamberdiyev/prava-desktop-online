import React, { useState, useEffect } from "react";
import { getImageUrl } from "../../utils/imageUtils";
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

  useEffect(() => {
    setHasError(false);
  }, [path]);

  if (!path || hasError) {
    return <SteeringWheelPlaceholder />;
  }

  const src = getImageUrl(path) || path;

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
