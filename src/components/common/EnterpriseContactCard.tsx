import React from "react";
import { Badge, Box, Group, Text, ThemeIcon } from "@mantine/core";

export interface EnterpriseContactCardProps {
  icon: React.ComponentType<{ size: number }>;
  label: string;
  value: React.ReactNode;
  sub?: string;
  href?: string;
  badge?: string;
  color?: string;
  external?: boolean;
  ariaLabel: string;
}

export default function EnterpriseContactCard({
  icon: IconComp,
  label,
  value,
  sub,
  href,
  badge,
  color = "blue",
  external = false,
  ariaLabel,
}: EnterpriseContactCardProps) {
  const content = (
    <>
      <ThemeIcon
        size={44}
        radius="md"
        color={color}
        variant="light"
        style={{ flexShrink: 0 }}
      >
        <IconComp size={22} />
      </ThemeIcon>

      <Box style={{ flex: 1, minWidth: 0 }}>
        <Group justify="space-between" align="center" gap={8} wrap="nowrap">
          <Text size="xs" c="dimmed" fw={500} style={{ lineHeight: 1.2 }}>
            {label}
          </Text>
          {badge && (
            <Badge color="green" variant="dot" size="sm">
              {badge}
            </Badge>
          )}
        </Group>

        <Box mt={2}>
          {typeof value === "string" ? (
            <Text
              size="sm"
              fw={700}
              c="var(--text)"
              style={{ lineHeight: 1.3, wordBreak: "break-word" }}
            >
              {value}
            </Text>
          ) : (
            value
          )}
        </Box>

        {sub && (
          <Text size="xs" c="dimmed" mt={2} style={{ lineHeight: 1.3 }}>
            {sub}
          </Text>
        )}
      </Box>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        className="enterprise-contact-card"
        aria-label={ariaLabel}
      >
        {content}
      </a>
    );
  }

  return (
    <div
      className="enterprise-contact-card"
      style={{ cursor: "default" }}
      aria-label={ariaLabel}
    >
      {content}
    </div>
  );
}
