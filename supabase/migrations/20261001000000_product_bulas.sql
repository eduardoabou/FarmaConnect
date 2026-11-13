-- Public PDF leaflets for QR Code labels.
-- The APK only reads public URLs. PDF uploads remain an administrative task
-- performed in the Supabase dashboard; no service_role is ever bundled.

alter table public.products
  add column if not exists bula_path text;

alter table public.products
  add constraint products_bula_path_format check (
    bula_path is null
    or (
      bula_path ~ '^[A-Za-z0-9][A-Za-z0-9._/-]*\.pdf$'
      and position('..' in bula_path) = 0
    )
  );

comment on column public.products.bula_path is
  'Caminho do PDF no bucket público storage.bulas; o APK não armazena o arquivo.';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'bulas',
  'bulas',
  true,
  10485760,
  array['application/pdf']
)
on conflict (id) do nothing;

-- Anyone may retrieve a leaflet through a QR Code. No insert, update or delete
-- policy is added for application users: uploads are managed outside the APK.
create policy "public can read PDF leaflets"
on storage.objects for select
to public
using (bucket_id = 'bulas');
