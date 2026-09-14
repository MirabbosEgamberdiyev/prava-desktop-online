import { Box, Button, Card, Grid, Text } from "@mantine/core";
import {
  IconBoltFilled,
  IconBook2,
  IconPlayerPlayFilled,
  IconStarsFilled,
  IconTicket,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import classes from "./ExamCardList.module.css";

const PAGE_ITEMS = [
  {
    nameKey: "me.one",
    url: "/exam",
    icon: IconBoltFilled,
    gradient: "linear-gradient(135deg, var(--mantine-color-indigo-6) 0%, var(--mantine-color-grape-7) 100%)",
    color: "white",
  },
  {
    nameKey: "me.two",
    url: "/marafon",
    icon: IconStarsFilled,
    gradient: "linear-gradient(135deg, var(--mantine-color-pink-5) 0%, var(--mantine-color-red-6) 100%)",
    color: "white",
  },
  {
    nameKey: "me.three",
    url: "/packages",
    icon: IconBook2,
    gradient: "linear-gradient(135deg, var(--mantine-color-blue-5) 0%, var(--mantine-color-cyan-4) 100%)",
    color: "white",
  },
  {
    nameKey: "me.four",
    url: "/tickets",
    icon: IconTicket,
    gradient: "linear-gradient(135deg, var(--mantine-color-green-5) 0%, var(--mantine-color-teal-4) 100%)",
    color: "white",
  },
];

export const Exam_Card_List = () => {
  const { t } = useTranslation();

  return (
    <Grid>
      {PAGE_ITEMS.map((item, i) => {
        const Icon = item.icon;
        return (
          <Grid.Col key={i} span={{ base: 12, sm: 6 }}>
            <Card
              withBorder
              shadow="sm"
              radius="md"
              p="lg"
              className={classes.card}
            >
              <Box
                className={classes.iconWrapper}
                style={{ background: item.gradient }}
              >
                <Icon size={32} color={item.color} />
              </Box>
              <Text mt="md" size="lg" fw={700}>
                {t(item.nameKey)}
              </Text>
              <Text mt={4} size="sm" c="dimmed" lineClamp={2}>
                {t("me.cardDescription")}
              </Text>
              <Link to={item.url} style={{ textDecoration: "none" }}>
                <Button
                  mt="md"
                  variant="light"
                  radius="md"
                  rightSection={<IconPlayerPlayFilled size={16} />}
                >
                  {t("me.btn")}
                </Button>
              </Link>
            </Card>
          </Grid.Col>
        );
      })}
    </Grid>
  );
};
