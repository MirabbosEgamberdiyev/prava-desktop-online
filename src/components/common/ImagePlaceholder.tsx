import { useState, useEffect } from "react";
import { Box, Image, Skeleton, Text, useComputedColorScheme } from "@mantine/core";

interface ImagePlaceholderProps {
  src?: string | null;
  onClick?: () => void;
  radius?: string;
  style?: React.CSSProperties;
}

/**
 * Savol rasmi yoki placeholder ko'rsatadi.
 * Rasm yuklanayotganda — skeleton
 * Rasm mavjud bo'lsa — lazy loaded rasm (klik = zoom)
 * Rasm yo'q yoki yuklanmasa — logo + "pravaonline.uz"
 * Dark/Light mode ni qo'llab-quvvatlaydi
 */
export function ImagePlaceholder({
  src,
  onClick,
  radius = "xs",
  style,
}: ImagePlaceholderProps) {
  const colorScheme = useComputedColorScheme("light", {
    getInitialValueInEffect: true,
  });
  const isDark = colorScheme === "dark";

  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Savol o'zgarganda holatlarni tozalash
  useEffect(() => {
    setImageError(false);
    setImageLoaded(false);
  }, [src]);

  const hasImage = !!src && !imageError;

  const containerStyle: React.CSSProperties = {
    cursor: hasImage && onClick ? "pointer" : undefined,
    borderRadius: `var(--mantine-radius-${radius})`,
    overflow: "hidden",
    aspectRatio: "3 / 2",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    background: isDark
      ? "linear-gradient(135deg, var(--mantine-color-dark-6) 0%, var(--mantine-color-dark-7) 100%)"
      : "linear-gradient(135deg, var(--mantine-color-gray-1) 0%, var(--mantine-color-gray-2) 100%)",
    border: `1px solid ${isDark ? "var(--mantine-color-dark-4)" : "var(--mantine-color-gray-3)"}`,
    position: "relative",
    ...style,
  };

  return (
    <Box onClick={hasImage ? onClick : undefined} style={containerStyle}>
      {hasImage ? (
        <>
          {/* Skeleton — rasm yuklanguncha */}
          {!imageLoaded && (
            <Skeleton
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                borderRadius: 0,
              }}
            />
          )}
          <Image
            src={src}
            alt=""
            fit="contain"
            h="100%"
            w="100%"
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
            style={{
              opacity: imageLoaded ? 1 : 0,
              transition: "opacity 0.25s ease",
            }}
          />
        </>
      ) : (
        <>
          <Image
            src="/logo.svg"
            alt="Prava Online"
            w={64}
            h={64}
            fit="contain"
            loading="lazy"
            style={{ opacity: isDark ? 0.7 : 0.5 }}
          />
          <Text
            size="lg"
            fw={700}
            c={isDark ? "dark.1" : "gray.5"}
            style={{ letterSpacing: 1, userSelect: "none" }}
          >
            pravaonline.uz
          </Text>
        </>
      )}
    </Box>
  );
}
