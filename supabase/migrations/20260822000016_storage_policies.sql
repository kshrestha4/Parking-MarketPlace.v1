-- Parking photo storage. The bucket is public so listing pages can serve
-- images without signed URLs; the objects table still has RLS so only the
-- owner can upload, replace, or delete their own files.
--
-- Object paths are prefixed with the owner's user id by the upload code
-- (e.g. <owner-id>/<uuid>-photo.jpg), which is what the policies key on.

insert into storage.buckets (id, name, public)
values ('parking-images', 'parking-images', true)
on conflict (id) do nothing;

create policy "anyone can view parking photos"
  on storage.objects for select
  using (bucket_id = 'parking-images');

create policy "owners can upload parking photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'parking-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "owners can update own parking photos"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'parking-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "owners can delete own parking photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'parking-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
