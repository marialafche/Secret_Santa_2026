-- Makes each wishlist visible only to its owner and their Santa.
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run.
-- (Already included in schema.sql for fresh setups.)

drop policy "members read wishlists" on public.wishlist_items;

create policy "owner and santa read wishlists" on public.wishlist_items
  for select to authenticated using (
    member_id = (select auth.uid())
    or exists (
      select 1 from public.assignments a
      where a.santa_id = (select auth.uid()) and a.recipient_id = wishlist_items.member_id
    )
  );
