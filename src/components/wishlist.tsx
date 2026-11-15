import type { ReactNode } from "react";
import type { WishlistItem } from "@/lib/types";

function linkLabel(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function Wishlist({
  items,
  empty,
  action,
}: {
  items: WishlistItem[];
  empty: string;
  /** Rendered next to each item, e.g. a delete button. */
  action?: (item: WishlistItem) => ReactNode;
}) {
  if (items.length === 0) return <p className="text-muted">{empty}</p>;
  return (
    <ul className="divide-y divide-line">
      {items.map((item) => (
        <li key={item.id} className="flex items-start gap-3 py-3">
          <div className="min-w-0 flex-1">
            <p className="font-medium break-words">{item.title}</p>
            {item.note && <p className="text-sm text-muted break-words">{item.note}</p>}
            {item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="link text-sm break-all"
              >
                {linkLabel(item.url)}
              </a>
            )}
          </div>
          {action?.(item)}
        </li>
      ))}
    </ul>
  );
}
