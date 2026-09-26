import { Fragment } from "react";
import { Kbd, Paper, Stack, Table, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { SHORTCUT_GROUPS } from "../../shell/shortcuts";

/** Settings → Klaviatura: every global and exam shortcut in one dense table per group. */
export default function KeyboardShortcutsPanel() {
  const { t } = useTranslation();

  return (
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        {t("desktopShell.settings.keyboardDesc", "Ilovani sichqonchasiz, to'liq klaviatura bilan boshqarish mumkin.")}
      </Text>
      {SHORTCUT_GROUPS.map((group) => (
        <Paper key={group.id} withBorder radius="md" p={0} style={{ overflow: "hidden" }}>
          <Text fw={600} size="sm" px="md" py="xs" style={{ borderBottom: "1px solid var(--border)", background: "var(--surface-muted)" }}>
            {t(group.titleKey, group.fallback)}
          </Text>
          <Table verticalSpacing={6} horizontalSpacing="md" fz="sm" highlightOnHover>
            <Table.Tbody>
              {group.items.map((item) => (
                <Table.Tr key={item.id}>
                  <Table.Td>{t(item.labelKey, item.fallback)}</Table.Td>
                  <Table.Td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    {item.keys.map((combo, ci) => (
                      <Fragment key={ci}>
                        {ci > 0 && (
                          <Text span c="dimmed" mx={6} size="xs">
                            /
                          </Text>
                        )}
                        {combo.map((k, ki) =>
                          k === "–" ? (
                            <Text span key={ki} c="dimmed" mx={4} size="xs">
                              –
                            </Text>
                          ) : (
                            <Fragment key={ki}>
                              {ki > 0 && combo[ki - 1] !== "–" && (
                                <Text span c="dimmed" mx={3} size="xs">
                                  +
                                </Text>
                              )}
                              <Kbd size="xs">{k}</Kbd>
                            </Fragment>
                          ),
                        )}
                      </Fragment>
                    ))}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Paper>
      ))}
    </Stack>
  );
}
