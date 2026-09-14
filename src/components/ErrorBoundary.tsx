import { Component, type ReactNode } from "react";
import { Button, Center, Stack, Text, Title } from "@mantine/core";
import i18n from "../utils/i18n";

interface Props {
  children: ReactNode;
  resetKey?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorType: "chunk" | "network" | "render";
}

function classifyError(error: Error): "chunk" | "network" | "render" {
  const message = error.message || "";
  if (
    message.includes("Loading chunk") ||
    message.includes("Failed to fetch dynamically imported module") ||
    message.includes("Importing a module script failed")
  ) {
    return "chunk";
  }
  if (
    message.includes("NetworkError") ||
    message.includes("Failed to fetch") ||
    message.includes("Load failed")
  ) {
    return "network";
  }
  return "render";
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorType: "render" };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorType: classifyError(error),
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  componentDidUpdate(prevProps: Props) {
    if (this.state.hasError && this.props.resetKey !== prevProps.resetKey) {
      this.setState({ hasError: false, error: null, errorType: "render" });
    }
  }

  componentDidMount() {
    // Global unhandled promise rejection handler
    window.addEventListener("unhandledrejection", this.handleUnhandledRejection);
    window.addEventListener("error", this.handleGlobalError);
  }

  componentWillUnmount() {
    window.removeEventListener("unhandledrejection", this.handleUnhandledRejection);
    window.removeEventListener("error", this.handleGlobalError);
  }

  handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    const error =
      event.reason instanceof Error
        ? event.reason
        : new Error(String(event.reason));
    const errorType = classifyError(error);
    if (errorType === "chunk") {
      this.setState({ hasError: true, error, errorType });
    }
  };

  handleGlobalError = (event: ErrorEvent) => {
    const error = event.error instanceof Error ? event.error : new Error(event.message);
    const errorType = classifyError(error);
    if (errorType === "chunk") {
      this.setState({ hasError: true, error, errorType });
    }
  };

  render() {
    if (this.state.hasError) {
      const { errorType } = this.state;

      const t = i18n.t.bind(i18n);

      if (errorType === "chunk") {
        return (
          <Center h="100vh">
            <Stack align="center" gap="md">
              <Title order={3}>
                {t("errors.chunkTitle")}
              </Title>
              <Text c="dimmed" ta="center" maw={400}>
                {t("errors.chunkMessage")}
              </Text>
              <Button onClick={() => window.location.reload()}>
                {t("errors.chunkReload")}
              </Button>
            </Stack>
          </Center>
        );
      }

      if (errorType === "network") {
        return (
          <Center h="100vh">
            <Stack align="center" gap="md">
              <Title order={3}>
                {t("errors.noInternetTitle")}
              </Title>
              <Text c="dimmed" ta="center" maw={400}>
                {t("errors.noInternetMessage")}
              </Text>
              <Button
                onClick={() => {
                  this.setState({ hasError: false, error: null, errorType: "render" });
                }}
              >
                {t("errors.noInternetRetry")}
              </Button>
            </Stack>
          </Center>
        );
      }

      return (
        <Center h="100vh">
          <Stack align="center" gap="md">
            <Title order={3} c="red">
              {t("errors.renderTitle")}
            </Title>
            <Text c="dimmed" ta="center" maw={400}>
              {this.state.error?.message}
            </Text>
            <Button
              onClick={() => {
                this.setState({ hasError: false, error: null, errorType: "render" });
                window.location.reload();
              }}
            >
              {t("errors.renderReload")}
            </Button>
          </Stack>
        </Center>
      );
    }

    return this.props.children;
  }
}
