-- Storage bucket for card photos, plus the Realtime publication.

-- Public read: the binder is public, so the photos on the cards must be too.
-- The 5 MB cap is a guard rail — the client downscales to ~150 KB before upload,
-- so anything approaching this limit means the browser-side pipeline silently
-- fell through to uploading an original.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'card-photos', 'card-photos', true, 5242880,
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do nothing;

create policy photos_read on storage.objects for select
  using (bucket_id = 'card-photos');

-- Uploads are namespaced by user id: card-photos/{uid}/{uuid}/full.webp.
-- The first path segment must be the caller's own uid, so members cannot write
-- into each other's folders.
create policy photos_insert_own on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'card-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy photos_update_own on storage.objects for update
  to authenticated
  using (
    bucket_id = 'card-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy photos_delete_own on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'card-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );


-- Live binder updates. Only `cards` is published: new contributions are the one
-- event the binder animates in. Publishing `pulls` too would leak a stream of who
-- pulled whom, and isn't needed for the demo.
alter publication supabase_realtime add table cards;
