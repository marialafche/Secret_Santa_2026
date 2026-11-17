import Link from "next/link";
import { notFound } from "next/navigation";
import { Wishlist } from "@/components/wishlist";
import { getMyRecipient } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import type { WishlistItem } from "@/lib/types";

// Only your own recipient's wishlist can be viewed (the database enforces this too).
export default async function RecipientWishlistPage({
  params,
}: PageProps<"/g/[groupId]/wishlist/recipient">) {
  const { groupId } = await params;
  const recipient = await getMyRecipient(groupId);
  if (!recipient) notFound();

  const supabase = await createClient();
  const { data } = await supabase
    .from("wishlist_items")
    .select("id, member_id, title, url, note")
    .eq("member_id", recipient.id)
    .order("created_at");

  return (
    <div className="space-y-6">
      <Link href={`/g/${groupId}/wishlist`} className="link text-sm">
        ← My wishlist
      </Link>
      <section className="card space-y-3">
        <h1 className="text-2xl font-semibold">{recipient.display_name}&apos;s wishlist</h1>
        <Wishlist
          items={(data ?? []) as WishlistItem[]}
          empty={`${recipient.display_name} hasn't added anything yet. Ask them a question in the chat!`}
        />
      </section>
    </div>
  );
}
