import { Box, SimpleGrid, Text, Title, Paper } from "@mantine/core";
import {
  IconBook,
  IconClock,
  IconChartBar,
  IconLanguage,
  IconDeviceMobile,
  IconRefresh,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import classes from "./Home.module.css";

interface Feature {
  icon: typeof IconBook;
  titleKey: string;
  descKey: string;
  color: string;
}

const featuresData: Feature[] = [
  {
    icon: IconBook,
    titleKey: "home.features.allTopics",
    descKey: "home.features.allTopicsDesc",
    color: "blue",
  },
  {
    icon: IconClock,
    titleKey: "home.features.timeControl",
    descKey: "home.features.timeControlDesc",
    color: "orange",
  },
  {
    icon: IconChartBar,
    titleKey: "home.features.analysis",
    descKey: "home.features.analysisDesc",
    color: "green",
  },
  {
    icon: IconLanguage,
    titleKey: "home.features.languages",
    descKey: "home.features.languagesDesc",
    color: "grape",
  },
  {
    icon: IconDeviceMobile,
    titleKey: "home.features.interface",
    descKey: "home.features.interfaceDesc",
    color: "cyan",
  },
  {
    icon: IconRefresh,
    titleKey: "home.features.updates",
    descKey: "home.features.updatesDesc",
    color: "pink",
  },
];

export function Features_Section() {
  const { t } = useTranslation();

  return (
    <section className={classes.featuresSection} aria-label="Features">
      <Box className={classes.sectionTitle}>
        <div className={classes.sectionBadge}>
          {t("home.features.badge", "Platforma Imkoniyatlari")}
        </div>
        <Title order={2}>{t("home.features.title")}</Title>
        <Text size="md" c="dimmed" mt="sm">
          {t("home.features.description")}
        </Text>
      </Box>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
        {featuresData.map((feature, index) => (
          <Paper
            key={feature.titleKey}
            className={classes.featureCard}
            withBorder
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <Box
              className={classes.featureIcon}
              style={{
                backgroundColor: `var(--mantine-color-${feature.color}-1)`,
              }}
            >
              <feature.icon
                size={28}
                color={`var(--mantine-color-${feature.color}-6)`}
                stroke={1.5}
              />
            </Box>

            <Title order={3} className={classes.featureTitle}>{t(feature.titleKey)}</Title>

            <Text className={classes.featureDescription}>
              {t(feature.descKey)}
            </Text>
          </Paper>
        ))}
      </SimpleGrid>
    </section>
  );
}
