import { Button, Container, Group, Text, Title } from "@mantine/core";
import classes from "../../features/NotFound/css/NothingFoundBackground.module.css";
import { Illustration } from "../../features/NotFound";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import SEO from "../../components/common/SEO";

const NotFound_Page = () => {
  const { t } = useTranslation();

  return (
    <div>
      <SEO
        title="404 - Sahifa topilmadi"
        description="Siz qidirayotgan sahifa topilmadi. Bosh sahifaga qaytib, haydovchilik guvohnomasi imtihoniga tayyorlanishni davom eting."
        noIndex={true}
      />
      <Container className={classes.root}>
        <div className={classes.inner}>
          <Illustration className={classes.image} />
          <div className={classes.content}>
            <Title className={classes.title}>{t("notFound.title")}</Title>
            <Text
              c="dimmed"
              size="lg"
              ta="center"
              className={classes.description}
            >
              {t("notFound.description")}
            </Text>
            <Group justify="center">
              <Button component={Link} to="/" size="md" radius="md">
                {t("notFound.backHome", "Bosh sahifaga qaytish")}
              </Button>
            </Group>
          </div>
        </div>
      </Container>
    </div>
  );
};

export default NotFound_Page;
