import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/form";
import { Wishlist } from "@/components/wishlist";
import { getGroupContext, getMyRecipient } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import type { WishlistItem } from "@/lib/types";
import { addItem, deleteItem } from "./actions";

export default async function WishlistPage({ params }: PageProps<"/g/[groupId]/wishlist">) {
  const { groupId } = await params;
  const { me, group } = await getGroupContext(groupId);
  const supabase = await createClient();
  const [{ data }, recipient] = await Promise.all([
    supabase
      .from("wishlist_items")
      .select("id, member_id, title, url, note")
      .eq("member_id", me.id)
      .order("created_at"),
    getMyRecipient(groupId),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-4xl sm:text-5xl">Wishlist</h1>

      {recipient && (
        <Link
          href={`/g/${groupId}/wishlist/recipient`}
          className="card block transition hover:-translate-y-0.5"
        >
          <p className="font-semibold">🎁 See what {recipient.display_name} wished for</p>
          <p className="text-sm text-muted">Only you can see their wishlist.</p>
        </Link>
      )}

      <section className="card space-y-4">
        <div>
          <h2 className="text-lg font-semibold">My wishlist for {group.name}</h2>
          <p className="text-sm text-muted">Only your Secret Santa in this group will see this.</p>
        </div>
        <Wishlist
          items={(data ?? []) as WishlistItem[]}
          empty="Nothing yet. Add a few ideas to help your Santa!"
          action={(item) => (
            <form action={deleteItem.bind(null, groupId)}>
              <input type="hidden" name="id" value={item.id} />
              <button type="submit" className="text-sm text-muted hover:text-red-700">
                Remove
              </button>
            </form>
          )}
        />

        <ActionForm action={addItem.bind(null, groupId)} className="space-y-3 border-t border-line pt-4">
          <div>
            <label htmlFor="title" className="label">
              What would you like?
            </label>
            <input id="title" name="title" required maxLength={120} className="input" />
          </div>
          <div>
            <label htmlFor="url" className="label">
              Link <span className="font-normal text-muted">(optional)</span>
            </label>
            <input
              id="url"
              name="url"
              type="url"
              maxLength={500}
              placeholder="https://"
              className="input"
            />
          </div>
          <div>
            <label htmlFor="note" className="label">
              Note <span className="font-normal text-muted">(size, color…)</span>
            </label>
            <input id="note" name="note" maxLength={300} className="input" />
          </div>
          <SubmitButton>Add to wishlist</SubmitButton>
        </ActionForm>
      </section>
    </div>
  );
}
