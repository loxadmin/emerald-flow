
create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  message text not null,
  is_read boolean default false,
  admin_reply text,
  replied_at timestamptz,
  created_at timestamptz default now()
);

alter table public.contact_messages enable row level security;

create policy "Anyone can submit contact messages"
on public.contact_messages for insert
to anon, authenticated
with check (true);

create policy "Admins can read contact messages"
on public.contact_messages for select
to authenticated
using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can update contact messages"
on public.contact_messages for update
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));
