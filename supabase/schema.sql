-- Secret Santa database schema.
-- Run once in Supabase: SQL Editor -> New query -> paste this whole file -> Run.
--
-- Secrecy model:
--   * Everyone can only read their OWN row in `assignments` (who they are Santa for).
--   * Nobody can write `assignments` from the browser; the draw runs on the server
--     with the secret key and calls `save_draw`.
--   * Messages never store the Santa's id; a thread is identified by its recipient.

-- ============================================================================
-- Tables
-- ============================================================================

create table public.settings (
  id int primary key default 1 check (id = 1),
  group_name text not null default 'Secret Santa' check (char_length(group_name) between 1 and 60),
  budget text check (char_length(budget) <= 40),
  exchange_date date,
  max_questions int not null default 10 check (max_questions between 1 and 50),
  invite_code text not null default substr(md5(random()::text || clock_timestamp()::text), 1, 12),
  drawn_at timestamptz
);
insert into public.settings default values;

create table public.members (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  is_admin boolean not null default false,
  joined_at timestamptz not null default now()
);

create table public.wishlist_items (
  id bigint generated always as identity primary key,
  member_id uuid not null default auth.uid() references public.members (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  url text check (url ~* '^https?://' and char_length(url) <= 500),
  note text check (char_length(note) <= 300),
  created_at timestamptz not null default now()
);
create index on public.wishlist_items (member_id);

-- Stored once per pair with member_a < member_b; applies in both directions.
create table public.exclusions (
  member_a uuid not null references public.members (id) on delete cascade,
  member_b uuid not null references public.members (id) on delete cascade,
  primary key (member_a, member_b),
  check (member_a < member_b)
);

create table public.assignments (
  santa_id uuid primary key references public.members (id) on delete cascade,
  recipient_id uuid not null unique references public.members (id) on delete cascade,
  check (santa_id <> recipient_id)
);

-- A question has question_number set; an answer has question_id set.
create table public.messages (
  id bigint generated always as identity primary key,
  recipient_id uuid not null references public.members (id) on delete cascade,
  question_number int,
  question_id bigint references public.messages (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now(),
  check ((question_id is null) = (question_number is not null))
);
create index on public.messages (recipient_id);

-- ============================================================================
-- Helpers (security definer so policies can use them without recursion)
-- ============================================================================

create function public.is_member() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.members where id = (select auth.uid()));
$$;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.members where id = (select auth.uid()) and is_admin);
$$;

create function public.draw_done() returns boolean
language sql stable security definer set search_path = '' as $$
  select drawn_at is not null from public.settings where id = 1;
$$;

-- ============================================================================
-- Row level security
-- ============================================================================

alter table public.settings enable row level security;
alter table public.members enable row level security;
alter table public.wishlist_items enable row level security;
alter table public.exclusions enable row level security;
alter table public.assignments enable row level security;
alter table public.messages enable row level security;

create policy "members read settings" on public.settings
  for select to authenticated using (public.is_member());
create policy "admin updates settings" on public.settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "members read members" on public.members
  for select to authenticated using (public.is_member());

-- A wishlist is visible only to its owner and their Santa.
create policy "owner and santa read wishlists" on public.wishlist_items
  for select to authenticated using (
    member_id = (select auth.uid())
    or exists (
      select 1 from public.assignments a
      where a.santa_id = (select auth.uid()) and a.recipient_id = wishlist_items.member_id
    )
  );
create policy "members add own items" on public.wishlist_items
  for insert to authenticated with check (member_id = (select auth.uid()) and public.is_member());
create policy "members update own items" on public.wishlist_items
  for update to authenticated using (member_id = (select auth.uid())) with check (member_id = (select auth.uid()));
create policy "members delete own items" on public.wishlist_items
  for delete to authenticated using (member_id = (select auth.uid()));

create policy "members read exclusions" on public.exclusions
  for select to authenticated using (public.is_member());
create policy "admin adds exclusions before draw" on public.exclusions
  for insert to authenticated with check (public.is_admin() and not public.draw_done());
create policy "admin removes exclusions before draw" on public.exclusions
  for delete to authenticated using (public.is_admin() and not public.draw_done());

create policy "santas read own assignment" on public.assignments
  for select to authenticated using (santa_id = (select auth.uid()));

create policy "thread participants read messages" on public.messages
  for select to authenticated using (
    recipient_id = (select auth.uid())
    or exists (
      select 1 from public.assignments a
      where a.santa_id = (select auth.uid()) and a.recipient_id = messages.recipient_id
    )
  );

-- ============================================================================
-- Table privileges (RLS above decides which rows)
-- ============================================================================

revoke all on public.settings, public.members, public.wishlist_items,
  public.exclusions, public.assignments, public.messages from anon, authenticated;

grant select on public.settings, public.members, public.wishlist_items,
  public.exclusions, public.assignments, public.messages to authenticated;
grant update (group_name, budget, exchange_date, max_questions) on public.settings to authenticated;
grant insert, update, delete on public.wishlist_items to authenticated;
grant insert, delete on public.exclusions to authenticated;

grant all on public.settings, public.members, public.wishlist_items,
  public.exclusions, public.assignments, public.messages to service_role;

-- ============================================================================
-- Functions called by the app
-- ============================================================================

-- Join with the invite code. The first person to join becomes the organizer.
create function public.join_group(p_code text, p_name text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_name text := btrim(coalesce(p_name, ''));
begin
  if auth.uid() is null then
    raise exception 'Please sign in first';
  end if;
  if v_name = '' or char_length(v_name) > 40 then
    raise exception 'Your name must be 1-40 characters';
  end if;

  -- Serializes joins (and the draw) so only the first member becomes admin.
  perform 1 from public.settings where id = 1 for update;

  if not exists (select 1 from public.settings where invite_code = btrim(coalesce(p_code, ''))) then
    raise exception 'That invite link is not valid';
  end if;
  if public.draw_done() then
    raise exception 'The draw has already happened, so no one new can join';
  end if;

  insert into public.members (id, display_name, is_admin)
  values (auth.uid(), v_name, not exists (select 1 from public.members))
  on conflict (id) do update set display_name = excluded.display_name;
end;
$$;

-- Santa asks their recipient a question; limited to settings.max_questions.
create function public.ask_question(p_body text) returns public.messages
language plpgsql security definer set search_path = '' as $$
declare
  v_body text := btrim(coalesce(p_body, ''));
  v_recipient uuid;
  v_max int;
  v_count int;
  v_row public.messages;
begin
  if v_body = '' then
    raise exception 'Your question cannot be empty';
  end if;
  if char_length(v_body) > 1000 then
    raise exception 'Your question is too long (1000 characters max)';
  end if;

  select recipient_id into v_recipient from public.assignments where santa_id = auth.uid();
  if v_recipient is null then
    raise exception 'You do not have a recipient yet';
  end if;

  -- Prevents two quick submits from both getting the same question number.
  perform pg_advisory_xact_lock(hashtext(v_recipient::text));

  select max_questions into v_max from public.settings where id = 1;
  select count(*) into v_count from public.messages
    where recipient_id = v_recipient and question_id is null;
  if v_count >= v_max then
    raise exception 'You have used all % of your questions', v_max;
  end if;

  insert into public.messages (recipient_id, question_number, body)
  values (v_recipient, v_count + 1, v_body)
  returning * into v_row;
  return v_row;
end;
$$;

-- Recipient answers one of their Santa's questions; unlimited answers.
create function public.answer_question(p_question_id bigint, p_body text) returns public.messages
language plpgsql security definer set search_path = '' as $$
declare
  v_body text := btrim(coalesce(p_body, ''));
  v_row public.messages;
begin
  if v_body = '' then
    raise exception 'Your answer cannot be empty';
  end if;
  if char_length(v_body) > 1000 then
    raise exception 'Your answer is too long (1000 characters max)';
  end if;
  if not exists (
    select 1 from public.messages
    where id = p_question_id and question_id is null and recipient_id = auth.uid()
  ) then
    raise exception 'Question not found';
  end if;

  insert into public.messages (recipient_id, question_id, body)
  values (auth.uid(), p_question_id, v_body)
  returning * into v_row;
  return v_row;
end;
$$;

-- Stores the draw computed by the server. Only callable with the secret key.
create function public.save_draw(p_pairs jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.settings where id = 1 for update;
  if public.draw_done() then
    raise exception 'The draw has already happened';
  end if;

  insert into public.assignments (santa_id, recipient_id)
  select (p ->> 'santa_id')::uuid, (p ->> 'recipient_id')::uuid
  from jsonb_array_elements(p_pairs) p;

  if exists (
    select 1 from public.members m
    where not exists (select 1 from public.assignments a where a.santa_id = m.id)
  ) or (select count(*) from public.assignments) <> (select count(*) from public.members) then
    raise exception 'The draw does not match the current members, please try again';
  end if;

  update public.settings set drawn_at = now() where id = 1;
end;
$$;

-- Organizer undoes the draw. Deletes all assignments and chats.
create function public.reset_draw() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'Only the organizer can reset the draw';
  end if;
  perform 1 from public.settings where id = 1 for update;
  delete from public.messages where true;
  delete from public.assignments where true;
  update public.settings set drawn_at = null where id = 1;
end;
$$;

revoke execute on function
  public.is_member(), public.is_admin(), public.draw_done(),
  public.join_group(text, text), public.ask_question(text),
  public.answer_question(bigint, text), public.save_draw(jsonb), public.reset_draw()
from public, anon, authenticated;

grant execute on function
  public.is_member(), public.is_admin(), public.draw_done(),
  public.join_group(text, text), public.ask_question(text),
  public.answer_question(bigint, text), public.reset_draw()
to authenticated;

grant execute on function public.save_draw(jsonb) to service_role;

-- ============================================================================
-- Realtime: live chat updates (still filtered by the RLS policy above)
-- ============================================================================

alter publication supabase_realtime add table public.messages;
