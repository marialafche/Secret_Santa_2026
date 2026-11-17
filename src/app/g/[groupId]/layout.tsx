import { NavLink } from "@/components/nav-link";
import { getGroupContext } from "@/lib/data";

/** Everything inside a group: checks membership and shows the group's menu. */
export default async function GroupLayout({ children, params }: LayoutProps<"/g/[groupId]">) {
  const { groupId } = await params;
  const { me } = await getGroupContext(groupId);
  const base = `/g/${groupId}`;

  return (
    <>
      <nav aria-label="Group" className="mb-6 flex w-full gap-1 text-sm font-medium text-muted md:w-auto">
        <NavLink href={base} exact icon="🏠" label="Home" />
        <NavLink href={`${base}/wishlist`} icon="🎁" label="Wishlist" />
        <NavLink href={`${base}/chat`} icon="💬" label="Chat" />
        {me.is_admin && <NavLink href={`${base}/admin`} icon="⭐" label="Organizer" />}
      </nav>
      {children}
    </>
  );
}
