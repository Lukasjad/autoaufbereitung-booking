-- Messages table for in-app chat
create table if not exists messages (
  id bigint generated always as identity primary key,
  booking_uid text not null,
  sender text not null check (sender in ('customer', 'admin')),
  text text,
  image_urls text[],
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Index for fast lookup by booking
create index if not exists idx_messages_booking_uid on messages (booking_uid, created_at);
