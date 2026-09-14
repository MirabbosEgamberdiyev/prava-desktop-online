import {
  AppShell,
  Burger,
  Button,
  Container,
  Group,
  Text,
} from "@mantine/core";
import { Link } from "react-router-dom";
import LanguagePicker from "../language/LanguagePicker";
import { useAuth } from "../../auth/AuthContext";
import UserMenuButton from "./UserMenuButton";
import { useTranslation } from "react-i18next";
import ColorMode from "../other/ColorMode";

const User_Header = ({
  opened,
  toggle,
}: {
  opened: boolean;
  toggle: () => void;
}) => {
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();

  return (
    <AppShell.Header>
      <Container
        h="100%"
        fluid
        px="md"
        style={{ overflow: "hidden" }}
      >
        <Group h="100%" justify="space-between" wrap="nowrap">
          {/* Left: Burger + Logo */}
          <Group gap="sm" wrap="nowrap" style={{ flexShrink: 0 }}>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Link to="/" style={{ textDecoration: "none" }}>
              <Text fw={800} fz={{ base: "md", sm: "xl" }} tt="uppercase" c="blue" truncate="end">
                PravaOnline
              </Text>
            </Link>
          </Group>

          {/* Right: Theme + Language + Profile */}
          <Group gap={8} wrap="nowrap" style={{ flexShrink: 1, minWidth: 0 }}>
            <ColorMode />
            <LanguagePicker />
            {isAuthenticated ? (
              <UserMenuButton />
            ) : (
              <Link to="/auth/login">
                <Button variant="light" radius="md" size="sm">
                  {t("nav.login_btn")}
                </Button>
              </Link>
            )}
          </Group>
        </Group>
      </Container>
    </AppShell.Header>
  );
};

export default User_Header;
