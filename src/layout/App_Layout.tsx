import { Suspense } from "react";
import { AppShell } from "@mantine/core";
import { Outlet, useLocation } from "react-router-dom";
import Footer from "../components/nav/Footer";
import { useDisclosure } from "@mantine/hooks";
import Navbar from "@/components/nav/Navbar";
import Header from "@/components/nav/Header";
import { RouteContentFallback } from "../components/common/RouteContentFallback";

const App_Layout = () => {
  const [opened, { toggle, close }] = useDisclosure();
  const location = useLocation();
  const isAuthPage = location.pathname.startsWith("/auth");

  return (
    <AppShell
      header={{ height: 58 }}
      navbar={{
        width: 300,
        breakpoint: "md",
        collapsed: { desktop: true, mobile: !opened },
      }}
      padding={0}
    >
      <Header opened={opened} toggle={toggle} />
      <Navbar close={close} />
      <AppShell.Main
        px={0}
        style={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}
      >
        <div
          style={{ flex: 1 }}
          className="page-transition-wrapper"
          key={location.pathname}
        >
          <Suspense fallback={<RouteContentFallback />}>
            <Outlet />
          </Suspense>
        </div>
        {!isAuthPage && <Footer />}
      </AppShell.Main>
    </AppShell>
  );
};

export default App_Layout;
