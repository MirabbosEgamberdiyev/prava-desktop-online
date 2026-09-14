import { useEffect } from "react";
import { Container, Skeleton, Stack, SimpleGrid } from "@mantine/core";
import { nprogress } from "@mantine/nprogress";

/**
 * Clean, zero-layout-shift fallback shown inside App_Layout when a route chunk is being fetched.
 * The Header, Navbar, and Footer stay completely stable and mounted.
 */
export function RouteContentFallback() {
  useEffect(() => {
    nprogress.start();
    return () => {
      nprogress.complete();
    };
  }, []);

  return (
    <Container size="xl" py="xl" style={{ minHeight: "60vh" }}>
      <Stack gap="lg" style={{ opacity: 0.5, transition: "opacity 0.2s ease" }}>
        <Skeleton height={38} width="35%" radius="md" />
        <Skeleton height={18} width="60%" radius="sm" />
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg" mt="md">
          <Skeleton height={200} radius="md" />
          <Skeleton height={200} radius="md" />
          <Skeleton height={200} radius="md" />
        </SimpleGrid>
      </Stack>
    </Container>
  );
}

/**
 * Fallback for authenticated/dashboard routes inside User_Layout.
 */
export function UserRouteFallback() {
  useEffect(() => {
    nprogress.start();
    return () => {
      nprogress.complete();
    };
  }, []);

  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
      }}
    >
      <div className="spinner" />
    </div>
  );
}
