import React, { createContext, useContext, useState, useEffect } from "react";
import { Modal } from "@mantine/core";
import {
  checkLicense,
  isTauriApp,
  type LicenseStatus,
} from "../../services/tauriLicense";
import { LicenseScreen } from "./LicenseScreen";

interface LicenseContextType {
  status: LicenseStatus | null;
  openRenewModal: () => void;
  refreshLicense: () => Promise<void>;
}

const LicenseContext = createContext<LicenseContextType>({
  status: null,
  openRenewModal: () => {},
  refreshLicense: async () => {},
});

export const useLicense = () => useContext(LicenseContext);

export const DesktopLicenseGuard: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [checking, setChecking] = useState<boolean>(true);
  const [status, setStatus] = useState<LicenseStatus | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const fetchStatus = async () => {
    try {
      const res = await checkLicense();
      setStatus(res);
    } catch (e) {
      console.warn("[DesktopLicenseGuard] checkLicense error:", e);
      // If error checking in Tauri, status is not valid
      if (isTauriApp()) {
        setStatus({
          is_valid: false,
          is_expired: true,
          days_remaining: 0,
          expires_at: "",
          machine_id: "",
        });
      } else {
        // Outside Tauri (e.g. browser preview), default to valid
        setStatus({
          is_valid: true,
          is_expired: false,
          days_remaining: 365,
          expires_at: "2027-12-31",
          machine_id: "DEV-BROWSER",
        });
      }
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleActivated = (newStatus: LicenseStatus) => {
    setStatus(newStatus);
    setIsModalOpen(false);
  };

  if (checking) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg)",
        }}
      >
        <div className="spinner" />
      </div>
    );
  }

  // If in Tauri and license is not valid or expired, block app and show LicenseScreen
  if (isTauriApp() && (!status?.is_valid || status?.is_expired)) {
    return (
      <LicenseScreen
        currentStatus={status}
        onActivated={handleActivated}
        isModal={false}
      />
    );
  }

  return (
    <LicenseContext.Provider
      value={{
        status,
        openRenewModal: () => setIsModalOpen(true),
        refreshLicense: fetchStatus,
      }}
    >
      {children}

      <Modal
        opened={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title=""
        centered
        size="lg"
        withCloseButton={false}
        padding={0}
      >
        <LicenseScreen
          currentStatus={status}
          onActivated={handleActivated}
          onClose={() => setIsModalOpen(false)}
          isModal={true}
        />
      </Modal>
    </LicenseContext.Provider>
  );
};
