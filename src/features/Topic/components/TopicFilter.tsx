import { Select } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../hooks/useLanguage";
import { useTopics } from "../hooks/useTopics";

interface TopicFilterProps {
  value: string | null;
  onChange: (value: string | null) => void;
  valueKey?: "id" | "code";
}

export function TopicFilter({
  value,
  onChange,
  valueKey = "code",
}: TopicFilterProps) {
  const { t } = useTranslation();
  const { localize } = useLanguage();
  const { topics, loading } = useTopics();

  const options = topics.map((topic) => ({
    value: valueKey === "id" ? String(topic.id) : topic.code,
    label: localize(topic.name),
  }));

  return (
    <Select
      data={options}
      value={value}
      onChange={onChange}
      placeholder={t("marathon.allTopics")}
      clearable
      searchable
      radius="md"
      size="sm"
      w={220}
      disabled={loading}
    />
  );
}
