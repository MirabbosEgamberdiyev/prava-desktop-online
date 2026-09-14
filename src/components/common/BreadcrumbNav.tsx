import { Breadcrumbs, Anchor } from "@mantine/core";
import { Link } from "react-router-dom";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbNavProps {
  items: BreadcrumbItem[];
}

export function BreadcrumbNav({ items }: BreadcrumbNavProps) {
  return (
    <Breadcrumbs mb="md">
      {items.map((item, index) =>
        item.href ? (
          <Anchor component={Link} to={item.href} key={index} size="sm">
            {item.label}
          </Anchor>
        ) : (
          <span key={index} style={{ fontSize: "var(--mantine-font-size-sm)" }}>
            {item.label}
          </span>
        )
      )}
    </Breadcrumbs>
  );
}
