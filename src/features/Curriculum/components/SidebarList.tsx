import { useRef, type KeyboardEvent, type ReactNode } from "react";

export interface SidebarItem {
  id: string;
  label: string;
  count?: number | string;
  icon?: ReactNode;
  hint?: string;
}

interface Props {
  items: SidebarItem[];
  value: string;
  onChange: (id: string) => void;
  ariaLabel: string;
  /** Called on Enter / double click (e.g. move focus into the content pane). */
  onActivate?: (id: string) => void;
}

/**
 * Keyboard-navigable master list (WAI-ARIA listbox, roving tabindex):
 * ↑/↓ move and select, Home/End jump, Enter activates.
 */
export default function SidebarList({ items, value, onChange, ariaLabel, onActivate }: Props) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const activeIndex = Math.max(0, items.findIndex((i) => i.id === value));

  const move = (idx: number) => {
    const next = Math.min(items.length - 1, Math.max(0, idx));
    const item = items[next];
    if (!item) return;
    onChange(item.id);
    refs.current[next]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, idx: number) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        move(idx + 1);
        break;
      case "ArrowUp":
        e.preventDefault();
        move(idx - 1);
        break;
      case "Home":
        e.preventDefault();
        move(0);
        break;
      case "End":
        e.preventDefault();
        move(items.length - 1);
        break;
      case "Enter":
        if (onActivate) {
          e.preventDefault();
          onActivate(items[idx].id);
        }
        break;
    }
  };

  return (
    <div role="listbox" aria-label={ariaLabel} aria-orientation="vertical" className="cur-sidebar-list">
      {items.map((item, idx) => {
        const selected = item.id === value;
        return (
          <button
            key={item.id}
            ref={(el) => {
              refs.current[idx] = el;
            }}
            type="button"
            role="option"
            aria-selected={selected}
            tabIndex={idx === activeIndex ? 0 : -1}
            className={`cur-sidebar-item${selected ? " active" : ""}`}
            onClick={() => onChange(item.id)}
            onDoubleClick={() => onActivate?.(item.id)}
            onKeyDown={(e) => onKeyDown(e, idx)}
            title={item.hint || item.label}
          >
            {item.icon && <span className="cur-sidebar-icon" aria-hidden="true">{item.icon}</span>}
            <span className="cur-sidebar-label">{item.label}</span>
            {item.count !== undefined && <span className="cur-sidebar-count">{item.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
