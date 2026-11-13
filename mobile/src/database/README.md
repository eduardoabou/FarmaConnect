# Persistência local

O FarmaConnect usa `@op-engineering/op-sqlite` para manter o catálogo disponível sem internet. O banco fica no armazenamento interno privado do Android e não exige permissão de armazenamento externo.

- `sqlite.ts`: conexão nativa compartilhada.
- `migrations.ts`: migrações transacionais versionadas.
- `repositories/products.ts`: consultas e persistência de produtos por farmácia.
- `demoCatalog.ts`: catálogo de demonstração usado pelos testes locais.

Os valores monetários são armazenados em centavos (`price_cents`): R$ 12,90 corresponde a `1290`. As consultas sempre recebem o UUID da farmácia e ocultam produtos com `deleted_at` preenchido.

As migrações já aplicadas não devem ser alteradas. Para mudar a estrutura, crie uma nova migração sequencial. Execute `npm.cmd test -- --runInBand`, `npm.cmd run typecheck` e `npm.cmd run lint` na pasta `mobile` para validar a camada local.
