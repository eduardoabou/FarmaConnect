-- Product identifiers for EAN-13 barcode labels.
-- The generated EANs are demonstration values only; replace them with official
-- manufacturer EANs before using the catalog in production.

alter table public.products add column if not exists ean text;
alter table public.products add column if not exists internal_code text;

create sequence if not exists public.products_internal_code_seq
  start with 1
  increment by 1
  minvalue 1
  maxvalue 999999;

with identifiers(id, ean, internal_code) as (
  values
    ('10000000-0000-4000-8000-000000000001'::uuid, '7890000000017', 'FC000001'),
    ('10000000-0000-4000-8000-000000000002'::uuid, '7890000000024', 'FC000002'),
    ('10000000-0000-4000-8000-000000000003'::uuid, '7890000000031', 'FC000003'),
    ('20000000-0000-4000-8000-000000000001'::uuid, '7890000000048', 'FC000004'),
    ('20000000-0000-4000-8000-000000000002'::uuid, '7890000000055', 'FC000005'),
    ('20000000-0000-4000-8000-000000000003'::uuid, '7890000000062', 'FC000006'),
    ('30000000-0000-4000-8000-000000000001'::uuid, '7890000000079', 'FC000007'),
    ('30000000-0000-4000-8000-000000000002'::uuid, '7890000000086', 'FC000008'),
    ('30000000-0000-4000-8000-000000000003'::uuid, '7890000000093', 'FC000009'),
    ('30000000-0000-4000-8000-000000000004'::uuid, '7890000000109', 'FC000010')
)
update public.products
set ean = identifiers.ean, internal_code = identifiers.internal_code
from identifiers
where products.id = identifiers.id;

select setval('public.products_internal_code_seq', 10, true);

alter table public.products
  alter column internal_code set default
    ('FC' || lpad(nextval('public.products_internal_code_seq')::text, 6, '0')),
  alter column internal_code set not null,
  add constraint products_ean_format check (ean is null or ean ~ '^[0-9]{13}$'),
  add constraint products_internal_code_format check (internal_code ~ '^FC[0-9]{6}$');

create unique index if not exists products_ean_unique
  on public.products (ean) where ean is not null;
create unique index if not exists products_internal_code_unique
  on public.products (internal_code);

alter sequence public.products_internal_code_seq
  owned by public.products.internal_code;

comment on column public.products.ean is
  'EAN-13 do fabricante; valores de demonstração devem ser substituídos por códigos oficiais.';
comment on column public.products.internal_code is
  'Código interno central do FarmaConnect, impresso como FC seguido de seis dígitos.';
