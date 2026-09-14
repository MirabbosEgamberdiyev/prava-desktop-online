import { Box } from "@mantine/core";
import {
  Hero_Banner,
  Trust_Indicators,
  Key_Benefits,
  Features_Section,
  Product_Preview,
  Learning_Flow,
  Stats_Section,
  Pricing_Preview,
  Testimonials_Section,
  FAQ_Section,
  Download_Section,
  CTA_Section,
} from "../../features/Home";
import SEO from "../../components/common/SEO";

const homeJsonLd = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  name: "Prava Online",
  url: "https://pravaonline.uz",
  logo: "https://pravaonline.uz/logo.svg",
  description:
    "O'zbekistonda haydovchilik guvohnomasi imtihoniga online tayyorlanish platformasi. 1200+ savollar bazasi, real imtihon formati.",
  areaServed: {
    "@type": "Country",
    name: "Uzbekistan",
  },
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Haydovchilik guvohnomasi imtihon testlari",
    itemListElement: [
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Course",
          name: "YHXBB imtihon testlari",
          description: "1200+ savollar bazasi bilan real imtihonga tayyorlaning",
          provider: { "@type": "Organization", name: "Prava Online" },
          inLanguage: ["uz", "ru", "en"],
          isAccessibleForFree: true,
        },
      },
    ],
  },
};

const Home_Page = () => {
  return (
    <Box className="page-transition-wrapper">
      <SEO
        title="Prava Online - Haydovchilik guvohnomasi imtihoniga tayyorlaning | YHXX test"
        description="O'zbekistonda haydovchilik guvohnomasi imtihoniga online tayyorlanish platformasi. 1200+ savollar bazasi, real imtihon formati, biletlar va mavzular bo'yicha testlar. Bepul ro'yxatdan o'ting!"
        keywords="prava online, haydovchilik guvohnomasi, imtihon, prava test, YHXX, avtomaktab, prava uz, prava test online, haydovchilik guvohnomasi imtihoni, avtomaktab savollari, pdd test, yo'l harakati qoidalari, водительские права, экзамен ПДД, тест ПДД онлайн, правила дорожного движения, driving license test uzbekistan, prava online uz"
        canonical="/"
        jsonLd={homeJsonLd}
      />
      <div className="saas-page-container" style={{ paddingTop: 16 }}>
        {/* 1. Hero Section */}
        <Hero_Banner />

        {/* 2. Trust Indicators */}
        <Trust_Indicators />

        {/* 3. Key Benefits */}
        <Key_Benefits />

        {/* 4. Product Features */}
        <Features_Section />

        {/* 5. Product Screenshots & Interactive Preview */}
        <Product_Preview />

        {/* 6. Learning Flow */}
        <Learning_Flow />

        {/* 7. Success Metrics & Live Statistics */}
        <Stats_Section />

        {/* 8. Pricing Preview */}
        <Pricing_Preview />

        {/* 9. User Testimonials */}
        <Testimonials_Section />

        {/* 10. FAQ Preview */}
        <FAQ_Section />

        {/* 11. Multi-Platform Download Section with QR Code */}
        <Download_Section />

        {/* 12. Final CTA Banner */}
        <CTA_Section />
      </div>
    </Box>
  );
};

export default Home_Page;
