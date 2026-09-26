import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

interface Props<T> {
  items: T[];
  getKey: (item: T) => string | number;
  renderItem: (item: T, index: number, selected: boolean) => ReactNode;
  getItemLabel: (item: T) => string;
  selectedIndex: number;
  onSelect: (index: number) => void;
  onActivate?: (index: number) => void;
  ariaLabel: string;
  minColumnWidth?: number;
  rowHeight?: number;
  gap?: number;
  overscanRows?: number;
  idPrefix: string;
}

/**
 * Windowed (virtualised) card grid with keyboard navigation.
 * Only the rows inside the viewport (+ overscan) are mounted, so 300 road signs with
 * images cost the same as 20. ←/→/↑/↓ move, Home/End/PageUp/PageDown jump, Enter activates.
 */
export default function VirtualGrid<T>({
  items,
  getKey,
  renderItem,
  getItemLabel,
  selectedIndex,
  onSelect,
  onActivate,
  ariaLabel,
  minColumnWidth = 180,
  rowHeight = 196,
  gap = 12,
  overscanRows = 2,
  idPrefix,
}: Props<T>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [scrollTop, setScrollTop] = useState(0);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const measure = () => setSize({ width: el.clientWidth, height: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const innerWidth = Math.max(0, size.width - gap * 2);
  const columns = Math.max(1, Math.floor((innerWidth + gap) / (minColumnWidth + gap)));
  const colWidth = columns > 0 ? (innerWidth - gap * (columns - 1)) / columns : innerWidth;
  const rowStride = rowHeight + gap;
  const rowCount = Math.ceil(items.length / columns);
  const totalHeight = rowCount * rowStride + gap;
  const visibleRows = Math.max(1, Math.ceil(size.height / rowStride));
  const firstRow = Math.max(0, Math.floor(scrollTop / rowStride) - overscanRows);
  const lastRow = Math.min(rowCount - 1, Math.floor((scrollTop + size.height) / rowStride) + overscanRows);

  // Reset scroll when the list itself changes (filter / category switch).
  const firstKey = items.length ? getKey(items[0]) : null;
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    setScrollTop(0);
  }, [items.length, firstKey]);

  // Keep the selected card in view (keyboard navigation / external selection).
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || selectedIndex < 0 || selectedIndex >= items.length || size.height === 0) return;
    const row = Math.floor(selectedIndex / columns);
    const top = gap + row * rowStride;
    const bottom = top + rowHeight;
    if (top < el.scrollTop) el.scrollTop = top - gap;
    else if (bottom > el.scrollTop + el.clientHeight) el.scrollTop = bottom - el.clientHeight + gap;
  }, [selectedIndex, columns, rowStride, rowHeight, gap, items.length, size.height]);

  const go = (idx: number) => {
    if (items.length === 0) return;
    onSelect(Math.min(items.length - 1, Math.max(0, idx)));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const cur = selectedIndex < 0 ? -1 : selectedIndex;
    switch (e.key) {
      case "ArrowRight":
        go(cur + 1);
        break;
      case "ArrowLeft":
        go(cur - 1);
        break;
      case "ArrowDown":
        go(cur < 0 ? 0 : cur + columns);
        break;
      case "ArrowUp":
        go(cur - columns);
        break;
      case "Home":
        go(0);
        break;
      case "End":
        go(items.length - 1);
        break;
      case "PageDown":
        go(cur + columns * visibleRows);
        break;
      case "PageUp":
        go(cur - columns * visibleRows);
        break;
      case "Enter":
        if (cur >= 0 && onActivate) onActivate(cur);
        break;
      default:
        return;
    }
    e.preventDefault();
  };

  const cells: ReactNode[] = [];
  if (rowCount > 0 && size.width > 0) {
    for (let row = firstRow; row <= lastRow; row++) {
      for (let col = 0; col < columns; col++) {
        const index = row * columns + col;
        if (index >= items.length) break;
        const item = items[index];
        const selected = index === selectedIndex;
        cells.push(
          <div
            key={getKey(item)}
            id={`${idPrefix}-${index}`}
            role="option"
            aria-selected={selected}
            aria-label={getItemLabel(item)}
            className={`cur-grid-cell${selected ? " selected" : ""}`}
            style={{
              position: "absolute",
              top: gap + row * rowStride,
              left: gap + col * (colWidth + gap),
              width: colWidth,
              height: rowHeight,
            }}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onSelect(index);
              scrollRef.current?.focus();
            }}
            onDoubleClick={() => onActivate?.(index)}
          >
            {renderItem(item, index, selected)}
          </div>
        );
      }
    }
  }

  return (
    <div
      ref={scrollRef}
      className="cur-grid-scroll"
      tabIndex={0}
      role="listbox"
      aria-label={ariaLabel}
      aria-activedescendant={selectedIndex >= 0 ? `${idPrefix}-${selectedIndex}` : undefined}
      onKeyDown={onKeyDown}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      <div style={{ position: "relative", height: totalHeight, width: "100%" }}>{cells}</div>
    </div>
  );
}
