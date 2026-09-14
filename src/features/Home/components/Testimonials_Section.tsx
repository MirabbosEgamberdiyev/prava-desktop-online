import {
  Box,
  Text,
  Title,
  Avatar,
  Group,
  SimpleGrid,
  Rating,
  Paper,
} from "@mantine/core";
import { IconQuote } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import classes from "./Home.module.css";

const testimonials = [
  {
    nameKey: "home.testimonials.name1",
    locationKey: "home.testimonials.location1",
    avatar: null,
    rating: 5,
    textKey: "home.testimonials.review1",
    color: "blue",
  },
  {
    nameKey: "home.testimonials.name2",
    locationKey: "home.testimonials.location2",
    avatar: null,
    rating: 5,
    textKey: "home.testimonials.review2",
    color: "green",
  },
  {
    nameKey: "home.testimonials.name3",
    locationKey: "home.testimonials.location3",
    avatar: null,
    rating: 5,
    textKey: "home.testimonials.review3",
    color: "orange",
  },
  {
    nameKey: "home.testimonials.name4",
    locationKey: "home.testimonials.location4",
    avatar: null,
    rating: 4,
    textKey: "home.testimonials.review4",
    color: "grape",
  },
];

export function Testimonials_Section() {
  const { t } = useTranslation();

  return (
    <section className={classes.testimonialsSection} aria-label="Testimonials">
      <Box className={classes.sectionTitle}>
        <div className={classes.sectionBadge}>
          {t("home.testimonials.badge", "Haqiqiy Fikrlar")}
        </div>
        <Title order={2}>{t("home.testimonials.title")}</Title>
        <Text size="md" c="dimmed" mt="sm">
          {t("home.testimonials.description")}
        </Text>
      </Box>

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
        {testimonials.map((testimonial, index) => (
          <Paper
            key={index}
            className={classes.testimonialCard}
            withBorder
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <IconQuote size={28} className={classes.quoteIcon} />

            <Text className={classes.testimonialText}>
              "{t(testimonial.textKey)}"
            </Text>

            <Group justify="space-between" align="center">
              <Box className={classes.testimonialAuthor}>
                <Avatar
                  src={testimonial.avatar}
                  radius="xl"
                  size={44}
                  color={testimonial.color}
                >
                  {t(testimonial.nameKey).charAt(0)}
                </Avatar>
                <Box className={classes.authorInfo}>
                  <Text fw={600} size="sm">
                    {t(testimonial.nameKey)}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {t(testimonial.locationKey)}
                  </Text>
                </Box>
              </Box>
              <Rating value={testimonial.rating} readOnly size="sm" />
            </Group>
          </Paper>
        ))}
      </SimpleGrid>
    </section>
  );
}
