import {
  NavLink,
  Box,
  ActionIcon,
  AppShell,
  ScrollArea,
  Paper,
  Text,
  Flex,
  Button,
  useComputedColorScheme,
  Divider,
} from "@mantine/core";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  IconAlertTriangle,
  IconApps,
  IconArrowRight,
  IconBookmark,
  IconCarambola,
  IconChartBar,
  IconHistory,
  IconKey,
  IconLayoutGrid,
  IconListDetails,
  IconSettings,
  IconTrophy,
} from "@tabler/icons-react";
import { useAuth } from "../../auth/AuthContext";

interface AppShellNavbarProps {
  toggle: () => void;
}

const User_Nav = ({ toggle }: AppShellNavbarProps) => {
  const { t }    = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  const computedColorScheme = useComputedColorScheme("light", {
    getInitialValueInEffect: true,
  });

  const navData = [
    {
      name: t("nav.dashboard"),
      url: "/me",
      icon: <IconLayoutGrid size={18} />,
      // sub: [
      //   {
      //     name: t("nav.mainPage"),
      //     url: "/me",
      //   },
      // ],
    },
    {
      name: t("nav.examTypes"),
      url: "/topics",
      icon: <IconListDetails size={18} />,
      sub: [
        {
          name: t("nav.topics"),
          url: "/topics",
        },
        // {
        //   name: t("nav.packages"),
        //   url: "/packages",
        // },
        {
          name: t("nav.ticket"),
          url: "/tickets",
        },
        {
          name: t("nav.marathon"),
          url: "/marafon",
        },
      ],
    },
    {
      name: t("nav.statistics"),
      url: "/statistics",
      icon: <IconChartBar size={18} />,
    },
    {
      name: t("nav.wrongAnswers"),
      url: "/wrong-answers",
      icon: <IconAlertTriangle size={18} />,
    },
    {
      name: t("nav.savedQuestions"),
      url: "/saved-questions",
      icon: <IconBookmark size={18} />,
    },
    {
      name: t("nav.history"),
      url: "/history",
      icon: <IconHistory size={18} />,
    },
    {
      name: t("nav.leaderboard"),
      url: "/leaderboard",
      icon: <IconTrophy size={18} />,
    },
    {
      name: t("nav.settings"),
      url: "/settings",
      icon: <IconSettings size={18} />,
    },
    {
      name: t("nav.downloads"),
      url: "/downloads",
      icon: <IconApps size={18} />,
    },
  ];

  return (
    <AppShell.Navbar
      p="sm"
      pt="xs"
      style={{
        paddingBottom: "calc(var(--mantine-spacing-sm) + var(--sab, 0px))",
      }}
    >
      <Flex direction="column" justify="space-between" h="100%">
        <ScrollArea>
          <Box>
            {navData.map((item, i) => (
              <NavLink
                key={i}
                label={item.name}
                leftSection={
                  <ActionIcon variant="light" size="md" radius="sm">
                    {item.icon}
                  </ActionIcon>
                }
                childrenOffset={40}
                variant="light"
                onClick={() => {
                  if (!item.sub) {
                    toggle();
                    navigate(item.url);
                  }
                }}
                active={!item.sub && location.pathname === item.url}
                defaultOpened={true}
                style={{
                  borderRadius: "var(--mantine-radius-xs)",
                  fontWeight: 500,
                }}
                my={2}
              >
                {item.sub
                  ? item.sub.map((subItem, index) => (
                      <NavLink
                        key={index}
                        label={subItem.name}
                        variant="light"
                        active={location.pathname === subItem.url}
                        onClick={() => {
                          toggle();
                          navigate(subItem.url);
                        }}
                        style={{
                          borderRadius: "var(--mantine-radius-xs)",
                          fontWeight: 400,
                        }}
                      />
                    ))
                  : null}
              </NavLink>
            ))}
          </Box>

          {/* SUPER_ADMIN section */}
          {isSuperAdmin && (
            <Box mt="xs">
              <Divider
                label={<Text size="xs" c="dimmed" fw={600}>SUPER ADMIN</Text>}
                my="xs"
              />
              <NavLink
                label={t("nav.activationCodes")}
                leftSection={
                  <ActionIcon variant="light" size="md" radius="sm" color="blue">
                    <IconKey size={18} />
                  </ActionIcon>
                }
                variant="light"
                active={location.pathname === "/admin/activation-codes"}
                onClick={() => {
                  toggle();
                  navigate("/admin/activation-codes");
                }}
                style={{
                  borderRadius: "var(--mantine-radius-xs)",
                  fontWeight: 500,
                }}
                my={2}
              />
            </Box>
          )}
        </ScrollArea>

        <Paper
          bg={computedColorScheme === "light" ? "gray.0" : "dark.7"}
          p="md"
          withBorder
          radius="md"
        >
          <Flex direction="column" align="center" gap="xs">
            <ActionIcon variant="subtle" size="xl" radius="xl" color="yellow">
              <IconCarambola size={32} />
            </ActionIcon>
            <Text size="xs" ta="center" c="dimmed">
              {t("nav.support")}
            </Text>
            <Link to="https://tirikchilik.uz/pravaonline" target="_blank">
              <Button
                variant="light"
                radius="xl"
                size="xs"
                fullWidth
                rightSection={<IconArrowRight size={16} />}
              >
                {t("nav.donate")}
              </Button>
            </Link>
          </Flex>
        </Paper>
      </Flex>
    </AppShell.Navbar>
  );
};

export default User_Nav;
