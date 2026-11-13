-- Validação manual da sincronização Supabase -> SQLite.
-- Execute SOMENTE um bloco por vez no SQL Editor, com o aplicativo conectado
-- à conta da Farmácia Aurora e internet ligada. Depois de cada bloco, toque
-- em "Sincronizar agora" no catálogo e confira o resultado no celular.
--
-- Não altera usuários, senhas, políticas ou permissões.

-- 1. Inclusão: deve aparecer "Soro Fisiológico 0,9% 500ml".
insert into public.products (
  id, pharmacy_id, name, category, price_cents, description, manufacturer, dosage
)
select
  '90000000-0000-4000-8000-000000000001'::uuid,
  id,
  'Soro Fisiológico 0,9% 500ml',
  'Primeiros Socorros',
  1190,
  'Solução estéril de cloreto de sódio.',
  'FarmaLab',
  '500ml'
from public.pharmacies
where name = 'Farmácia Aurora'
on conflict (id) do update set
  pharmacy_id = excluded.pharmacy_id,
  name = excluded.name,
  category = excluded.category,
  price_cents = excluded.price_cents,
  description = excluded.description,
  manufacturer = excluded.manufacturer,
  dosage = excluded.dosage,
  deleted_at = null;

-- 2. Alteração: o Paracetamol da Aurora deve passar a custar R$ 13,90.
update public.products
set price_cents = 1390
where id = '10000000-0000-4000-8000-000000000001'::uuid;

-- 3. Exclusão lógica: Vitamina C 1000mg deve desaparecer da Aurora.
update public.products
set deleted_at = now()
where id = '10000000-0000-4000-8000-000000000003'::uuid;

-- 4. Restauração após validar: devolve os dados demonstrativos originais.
update public.products
set price_cents = 1290
where id = '10000000-0000-4000-8000-000000000001'::uuid;

update public.products
set deleted_at = null
where id = '10000000-0000-4000-8000-000000000003'::uuid;

delete from public.products
where id = '90000000-0000-4000-8000-000000000001'::uuid;
