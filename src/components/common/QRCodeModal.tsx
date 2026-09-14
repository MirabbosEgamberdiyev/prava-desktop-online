import React from "react";
import { useTranslation } from "react-i18next";
import { QRCodeSVG } from "./QRCodeSVG";

export interface SocialLinkItem {
  label: string;
  handle: string;
  url: string;
  icon: React.ComponentType<{ size?: number; stroke?: number; color?: string; style?: React.CSSProperties }>;
  gradient: string;
  color: string;
}

interface Props {
  item: SocialLinkItem | null;
  onClose: () => void;
}

export default function QRCodeModal({ item, onClose }: Props) {
  const { t } = useTranslation();
  if (!item) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="qr-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="qr-modal-header" style={{ background: item.gradient }}>
          <item.icon size={24} stroke={1.8} color="#fff" />
          <span className="qr-modal-platform">{item.label}</span>
        </div>
        <div className="qr-modal-body">
          <QRCodeSVG
            value={item.url}
            size={180}
            bgColor="transparent"
            fgColor="currentColor"
            level="M"
            imageSettings={{
              src: "/logo.png",
              width: 36,
              height: 36,
              excavate: true,
            }}
          />
          <div className="qr-modal-url">{item.handle}</div>
          <p className="qr-modal-hint">{t("common.scanQrCode", "QR kodni skanerlang")}</p>
        </div>
        <button className="qr-modal-close" onClick={onClose} type="button" aria-label="Close">
          ✕
        </button>
      </div>
    </div>
  );
}
