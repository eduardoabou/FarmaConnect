# Supabase

Estrutura reproduzível do backend do FarmaConnect. O diretório contém migrações SQL, catálogo demonstrativo e um roteiro de verificação manual.

## Estrutura

- `migrations/20260928000000_initial_schema.sql`: tabelas, índices, triggers, grants e políticas RLS.
- `migrations/20260929000000_product_identifiers.sql`: EAN e código interno dos produtos.
- `migrations/20261001000000_product_bulas.sql`: `bula_path` e bucket público de leitura `bulas`.
- `seed/catalogo_demonstracao_por_farmacia.sql`: catálogo fictício distribuído entre três farmácias.
- `verification/catalog_sync_manual_test.sql`: roteiro SQL para validar alterações e sincronização.

## Aplicação das migrações

Execute os arquivos de `migrations/` em ordem cronológica pelo SQL Editor ou pela Supabase CLI. Em seguida, crie os usuários no Supabase Auth, associe cada `auth.users.id` a uma farmácia em `public.profiles` e carregue o seed quando desejar usar o catálogo demonstrativo.

## Modelo de acesso

- Cada perfil aponta para uma única farmácia.
- Usuários autenticados leem somente o próprio perfil, a farmácia vinculada e seus produtos.
- O cliente não recebe política de escrita em `products`.
- O aplicativo usa apenas a URL e a chave publicável do projeto.
- `service_role`, senha do banco e credenciais administrativas não pertencem ao APK ou ao Git.

## Bulas

O bucket `bulas` permite leitura pública porque a URL é impressa no QR Code e precisa abrir sem autenticação. O cliente não possui permissão de upload. Envie apenas PDFs destinados ao acesso público, com até 10 MB, usando o mesmo caminho gravado em `products.bula_path`.

O SQLite armazena somente esse caminho; o PDF permanece no Storage.
