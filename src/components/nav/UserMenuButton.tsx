import {
  IconChevronDown,
  IconLogout,
  IconSettings,
  IconUser,
  IconHistory,
  IconTrophy,
  IconKey,
} from "@tabler/icons-react";
import { Group, Avatar, Text, Menu, UnstyledButton, Box } from "@mantine/core";
import { useAuth } from "../../auth/AuthContext";
import { notifications } from "@mantine/notifications";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

function UserMenuButton() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    notifications.show({
      title: t("userMenu.logoutTitle", "Chiqish"),
      message: t("userMenu.logoutMessage", "Tizimdan muvaffaqiyatli chiqdingiz"),
      color: "yellow",
    });
  };

  const fullName = user?.fullName || `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || t("userMenu.user", "Foydalanuvchi");
  const contact = user?.phoneNumber || user?.email || "";
  const initials =
    `${user?.firstName?.charAt(0) || ""}${user?.lastName?.charAt(0) || ""}`.toUpperCase() ||
    fullName.charAt(0).toUpperCase() ||
    "U";

  return (
    <Menu shadow="md" width={220} position="bottom-end" radius="md" withinPortal>
      <Menu.Target>
        <UnstyledButton
          className="header-control-btn"
          aria-label={fullName}
          style={{ paddingLeft: 4, paddingRight: 8 }}
        >
          <Group gap={6} wrap="nowrap">
            <Avatar
              size={26}
              radius="xl"
              style={{
                background: "var(--primary)",
                color: "#ffffff",
                fontSize: "11px",
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {initials}
            </Avatar>

            <Text
              size="xs"
              fw={600}
              truncate="end"
              style={{ maxWidth: 240, color: "var(--text)" }}
              visibleFrom="xs"
            >
              {fullName}
            </Text>

            <IconChevronDown
              size={13}
              style={{ flexShrink: 0, opacity: 0.5, color: "var(--text-muted)" }}
            />
          </Group>
        </UnstyledButton>
      </Menu.Target>

      <Menu.Dropdown style={{ padding: 6 }}>
        <Box px="xs" py={6}>
          <Text size="sm" fw={700} truncate="end" c="var(--text)">
            {fullName}
          </Text>
          {contact && (
            <Text size="xs" c="dimmed" truncate="end">
              {contact}
            </Text>
          )}
        </Box>

        <Menu.Divider />

        <Menu.Item
          leftSection={<IconUser size={15} />}
          onClick={() => navigate("/me")}
        >
          {t("nav.dashboard", "Boshqaruv paneli")}
        </Menu.Item>
        <Menu.Item
          leftSection={<IconSettings size={15} />}
          onClick={() => navigate("/settings")}
        >
          {t("userMenu.settings", "Sozlamalar")}
        </Menu.Item>
        <Menu.Item
          leftSection={<IconHistory size={15} />}
          onClick={() => navigate("/history")}
        >
          {t("history.title", "Imtihon tarixi")}
        </Menu.Item>
        <Menu.Item
          leftSection={<IconTrophy size={15} />}
          onClick={() => navigate("/leaderboard")}
        >
          {t("leaderboard.title", "Reyting")}
        </Menu.Item>
        {(user?.role === "SUPER_ADMIN" || user?.role === "ADMIN") && (
          <Menu.Item
            leftSection={<IconKey size={15} />}
            onClick={() => navigate("/admin/activation-codes")}
          >
            {t("nav.activationCodes", "Aktivatsiya kodlari")}
          </Menu.Item>
        )}

        <Menu.Divider />

        <Menu.Item
          color="red"
          onClick={handleLogout}
          leftSection={<IconLogout size={15} />}
        >
          {t("userMenu.logout", "Chiqish")}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}

export default UserMenuButton;
