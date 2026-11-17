-- Turns the single Secret Santa group into many independent groups.
-- Run once in Supabase: SQL Editor -> New query -> paste this whole file -> Run.
-- Requires 002_private_wishlists.sql to have been run first.
--
-- Existing data is kept: the current group (name, settings, invite code, draw)
-- becomes the first row in `groups`, and its organizer becomes the app owner.
--
-- Model after this migration:
--   * `members` rows are memberships: one per (group, user), with their own id.
--     Wishlists, exclusions, assignments and messages point at memberships,
--     so they are automatically scoped to a group.
--   * `app_owners` may create groups. Groups are run by their organizers
--     (members.is_admin); the first person to join a group becomes organizer.

begin;

-- ============================================================================
-- Remove the single-group policies and functions
-- ============================================================================

drop policy if exists "members read settings" on public.settings;
drop policy if exists "admin updates settings" on public.settings;
drop policy if exists "members read members" on public.members;
drop policy if exists "members read wishlists" on public.wishlist_items;
drop policy if exists "owner and santa read wishlists" on public.wishlist_items;
drop policy if exists "members add own items" on public.wishlist_items;
drop policy if exists "members update own items" on public.wishlist_items;
drop policy if exists "members delete own items" on public.wishlist_items;
drop policy if exists "members read exclusions" on public.exclusions;
drop policy if exists "admin adds exclusions before draw" on public.exclusions;
drop policy if exists "admin removes exclusions before draw" on public.exclusions;
drop policy if exists "santas read own assignment" on public.assignments;
drop policy if exists "thread participants read messages" on public.messages;

drop function public.join_group(text, text);
drop function public.ask_question(text);
drop function public.answer_question(bigint, text);
drop function public.save_draw(jsonb);
drop function public.reset_draw();
drop function public.is_member();
drop function public.is_admin();
drop function public.draw_done();

-- ============================================================================
-- New tables
-- ============================================================================

create table public.app_owners (
  user_id uuid primary key references auth.users (id) on delete cascade
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  budget text check (char_length(budget) <= 40),
  exchange_date date,
  max_questions int not null default 10 check (max_questions between 1 and 50),
  invite_code text not null unique default substr(md5(random()::text || clock_timestamp()::text), 1, 12),
  drawn_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- Move existing data
-- ============================================================================

-- The current group, with its invite code so existing links keep working.
insert into public.groups (name, budget, exchange_date, max_questions, invite_code, drawn_at)
select group_name, budget, exchange_date, max_questions, invite_code, drawn_at
from public.settings where id = 1;

-- The current (first) organizer may create new groups.
insert into public.app_owners (user_id)
select id from public.members where is_admin order by joined_at limit 1;

-- Members become memberships. Their existing ids are kept as membership ids,
-- so wishlists, exclusions, assignments and messages stay attached.
alter table public.members add column user_id uuid, add column group_id uuid;
update public.members set user_id = id, group_id = (select id from public.groups);

alter table public.members
  drop constraint members_id_fkey,
  alter column id set default gen_random_uuid(),
  alter column user_id set not null,
  alter column group_id set not null,
  add constraint members_user_id_fkey
    foreign key (user_id) references auth.users (id) on delete cascade,
  add constraint members_group_id_fkey
    foreign key (group_id) references public.groups (id) on delete cascade,
  add constraint members_group_user_key unique (group_id, user_id);
create index on public.members (user_id);

-- Wishlist items now belong to a membership, which the app always passes.
alter table public.wishlist_items alter column member_id drop default;

drop table public.settings;

-- ============================================================================
-- Helpers (security definer so policies can use them without recursion)
-- ============================================================================

create function public.is_owner() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.app_owners where user_id = (select auth.uid()));
$$;

-- The signed-in user's membership ids, across all their groups.
create function public.my_member_ids() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select id from public.members where user_id = (select auth.uid());
$$;

create function public.is_group_member(p_group_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.members where group_id = p_group_id and user_id = (select auth.uid())
  );
$$;

create function public.is_group_admin(p_group_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.members
    where group_id = p_group_id and user_id = (select auth.uid()) and is_admin
  );
$$;

create function public.group_of(p_member_id uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select group_id from public.members where id = p_member_id;
$$;

create function public.group_drawn(p_group_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select drawn_at is not null from public.groups where id = p_group_id;
$$;

-- ============================================================================
-- Row level security
-- ============================================================================

alter table public.app_owners enable row level security;
alter table public.groups enable row level security;

create policy "users see whether they are an owner" on public.app_owners
  for select to authenticated using (user_id = (select auth.uid()));

create policy "members and owners read groups" on public.groups
  for select to authenticated using (public.is_group_member(id) or public.is_owner());
create policy "organizers update their group" on public.groups
  for update to authenticated
  using (public.is_group_admin(id)) with check (public.is_group_admin(id));

create policy "group members read members" on public.members
  for select to authenticated using (public.is_group_member(group_id) or public.is_owner());

-- A wishlist is visible only to its owner and their Santa in that group.
create policy "owner and santa read wishlists" on public.wishlist_items
  for select to authenticated using (
    member_id in (select public.my_member_ids())
    or exists (
      select 1 from public.assignments a
      where a.santa_id in (select public.my_member_ids()) and a.recipient_id = wishlist_items.member_id
    )
  );
create policy "members add own items" on public.wishlist_items
  for insert to authenticated with check (member_id in (select public.my_member_ids()));
create policy "members update own items" on public.wishlist_items
  for update to authenticated
  using (member_id in (select public.my_member_ids()))
  with check (member_id in (select public.my_member_ids()));
create policy "members delete own items" on public.wishlist_items
  for delete to authenticated using (member_id in (select public.my_member_ids()));

create policy "group members read exclusions" on public.exclusions
  for select to authenticated using (public.is_group_member(public.group_of(member_a)));
create policy "organizers add exclusions before draw" on public.exclusions
  for insert to authenticated with check (
    public.is_group_admin(public.group_of(member_a))
    and public.group_of(member_a) = public.group_of(member_b)
    and not public.group_drawn(public.group_of(member_a))
  );
create policy "organizers remove exclusions before draw" on public.exclusions
  for delete to authenticated using (
    public.is_group_admin(public.group_of(member_a))
    and not public.group_drawn(public.group_of(member_a))
  );

create policy "santas read own assignments" on public.assignments
  for select to authenticated using (santa_id in (select public.my_member_ids()));

create policy "thread participants read messages" on public.messages
  for select to authenticated using (
    recipient_id in (select public.my_member_ids())
    or exists (
      select 1 from public.assignments a
      where a.santa_id in (select public.my_member_ids()) and a.recipient_id = messages.recipient_id
    )
  );

-- ============================================================================
-- Table privileges (RLS above decides which rows)
-- ============================================================================

revoke all on public.app_owners, public.groups from anon, authenticated;
grant select on public.app_owners, public.groups to authenticated;
grant update (name, budget, exchange_date, max_questions) on public.groups to authenticated;
grant all on public.app_owners, public.groups to service_role;

-- ============================================================================
-- Functions called by the app
-- ============================================================================

-- Owners create groups. Returns the new group's id.
create function public.create_group(p_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_name text := btrim(coalesce(p_name, ''));
  v_id uuid;
begin
  if not public.is_owner() then
    raise exception 'Only the app owner can create groups';
  end if;
  if v_name = '' or char_length(v_name) > 60 then
    raise exception 'The group name must be 1-60 characters';
  end if;
  insert into public.groups (name) values (v_name) returning id into v_id;
  return v_id;
end;
$$;

-- Join a group with its invite code. The first person to join becomes its organizer.
-- Returns the group's id.
create function public.join_group(p_code text, p_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_name text := btrim(coalesce(p_name, ''));
  v_group public.groups;
begin
  if auth.uid() is null then
    raise exception 'Please sign in first';
  end if;
  if v_name = '' or char_length(v_name) > 40 then
    raise exception 'Your name must be 1-40 characters';
  end if;

  -- Locking the group serializes joins (and the draw) so only the first member becomes organizer.
  select * into v_group from public.groups
  where invite_code = btrim(coalesce(p_code, ''))
  for update;
  if not found then
    raise exception 'That invite link is not valid';
  end if;

  if exists (select 1 from public.members where group_id = v_group.id and user_id = auth.uid()) then
    update public.members set display_name = v_name
    where group_id = v_group.id and user_id = auth.uid();
    return v_group.id;
  end if;
  if v_group.drawn_at is not null then
    raise exception 'The draw has already happened, so no one new can join';
  end if;

  insert into public.members (user_id, group_id, display_name, is_admin)
  values (
    auth.uid(), v_group.id, v_name,
    not exists (select 1 from public.members where group_id = v_group.id)
  );
  return v_group.id;
end;
$$;

-- Santa asks their recipient in a group a question; limited to the group's max_questions.
create function public.ask_question(p_group_id uuid, p_body text) returns public.messages
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

  select a.recipient_id into v_recipient
  from public.assignments a
  join public.members m on m.id = a.santa_id
  where m.user_id = auth.uid() and m.group_id = p_group_id;
  if v_recipient is null then
    raise exception 'You do not have a recipient yet';
  end if;

  -- Prevents two quick submits from both getting the same question number.
  perform pg_advisory_xact_lock(hashtext(v_recipient::text));

  select max_questions into v_max from public.groups where id = p_group_id;
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
  v_recipient uuid;
  v_row public.messages;
begin
  if v_body = '' then
    raise exception 'Your answer cannot be empty';
  end if;
  if char_length(v_body) > 1000 then
    raise exception 'Your answer is too long (1000 characters max)';
  end if;

  select recipient_id into v_recipient from public.messages
  where id = p_question_id
    and question_id is null
    and recipient_id in (select id from public.members where user_id = auth.uid());
  if v_recipient is null then
    raise exception 'Question not found';
  end if;

  insert into public.messages (recipient_id, question_id, body)
  values (v_recipient, p_question_id, v_body)
  returning * into v_row;
  return v_row;
end;
$$;

-- Stores a group's draw computed by the server. Only callable with the secret key.
create function public.save_draw(p_group_id uuid, p_pairs jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.groups where id = p_group_id for update;
  if not found then
    raise exception 'Group not found';
  end if;
  if public.group_drawn(p_group_id) then
    raise exception 'The draw has already happened';
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_pairs) p
    where public.group_of((p ->> 'santa_id')::uuid) is distinct from p_group_id
       or public.group_of((p ->> 'recipient_id')::uuid) is distinct from p_group_id
  ) then
    raise exception 'The draw contains people from another group';
  end if;

  insert into public.assignments (santa_id, recipient_id)
  select (p ->> 'santa_id')::uuid, (p ->> 'recipient_id')::uuid
  from jsonb_array_elements(p_pairs) p;

  if exists (
    select 1 from public.members m
    where m.group_id = p_group_id
      and not exists (select 1 from public.assignments a where a.santa_id = m.id)
  ) then
    raise exception 'The draw does not match the current members, please try again';
  end if;

  update public.groups set drawn_at = now() where id = p_group_id;
end;
$$;

-- An organizer undoes their group's draw. Deletes the group's assignments and chats.
create function public.reset_draw(p_group_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_group_admin(p_group_id) then
    raise exception 'Only an organizer can reset the draw';
  end if;
  perform 1 from public.groups where id = p_group_id for update;
  delete from public.messages
    where recipient_id in (select id from public.members where group_id = p_group_id);
  delete from public.assignments
    where santa_id in (select id from public.members where group_id = p_group_id);
  update public.groups set drawn_at = null where id = p_group_id;
end;
$$;

revoke execute on function
  public.is_owner(), public.my_member_ids(), public.is_group_member(uuid),
  public.is_group_admin(uuid), public.group_of(uuid), public.group_drawn(uuid),
  public.create_group(text), public.join_group(text, text), public.ask_question(uuid, text),
  public.answer_question(bigint, text), public.save_draw(uuid, jsonb), public.reset_draw(uuid)
from public, anon, authenticated;

grant execute on function
  public.is_owner(), public.my_member_ids(), public.is_group_member(uuid),
  public.is_group_admin(uuid), public.group_of(uuid), public.group_drawn(uuid),
  public.create_group(text), public.join_group(text, text), public.ask_question(uuid, text),
  public.answer_question(bigint, text), public.reset_draw(uuid)
to authenticated;

grant execute on function public.save_draw(uuid, jsonb) to service_role;

commit;
