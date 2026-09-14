import { Badge } from "@mantine/core";
import { IconTag } from "@tabler/icons-react";

interface TopicBadgeProps {
  name: string;
}

export function TopicBadge({ name }: TopicBadgeProps) {
  if (!name) return null;

  return (
    <Badge
      variant="light"
      color="violet"
      size="sm"
      leftSection={<IconTag size={12} />}
    >
      {name}
    </Badge>
  );
}
