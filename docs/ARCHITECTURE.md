# Arquitetura do FarmaConnect

Este documento resume as decisões arquiteturais comprovadas pelo código. A aplicação é um cliente Android de consulta e impressão; o Supabase permanece como fonte oficial do catálogo.

## Visão de componentes

```mermaid
flowchart LR
  USER[Usuário autenticado] --> APP[React Native + TypeScript]
  APP --> AUTH[Supabase Auth]
  APP --> API[PostgREST protegido por RLS]
  API --> PG[(PostgreSQL)]
  APP <--> SQLITE[(SQLite local)]
  APP --> STORAGE[Supabase Storage]
  APP --> BLE[react-native-ble-plx]
  BLE --> B1[NIIMBOT B1]
  APP --> PROTOCOL[@slastra/nblib]
  PROTOCOL --> B1
```

## Camadas do aplicativo

| Diretório | Responsabilidade |
| --- | --- |
| `mobile/src/screens` | Login, catálogo, busca, filtros, informações e ações de impressão |
| `mobile/src/components` | Inicialização do banco, sessão autenticada e configuração da impressora |
| `mobile/src/database` | SQLite, migrações e repositórios limitados por `pharmacy_id` |
| `mobile/src/supabase` | Cliente público, armazenamento seguro da sessão e perfil em cache |
| `mobile/src/printer` | Descoberta BLE, sessão com a B1 e raster da etiqueta |
| `mobile/src/labels` | Modelo semântico da etiqueta normal |
| `mobile/src/bulas` | Validação do caminho e geração da URL pública da bula |
| `supabase/migrations` | PostgreSQL, índices, triggers, grants, RLS e bucket de bulas |

## Fluxo de autenticação e catálogo

1. O aplicativo abre o SQLite e aplica migrações locais versionadas.
2. O Supabase restaura uma sessão protegida pelo Android Keystore ou apresenta o login.
3. O perfil associa o usuário autenticado a uma única farmácia.
4. O catálogo local é carregado imediatamente quando já existe uma cópia autorizada.
5. Com internet, o aplicativo consulta `products`; a RLS retorna apenas a farmácia da sessão.
6. Os registros são validados e gravados no SQLite pelo repositório criado com o mesmo `pharmacy_id`.
7. Busca, filtros, INFO e impressão usam a cópia local.
8. No logout, produtos e estado de sincronização da farmácia ativa são removidos, junto do perfil cacheado e da sessão.

## Estratégia offline-first

A sincronização é unidirecional: **Supabase → SQLite**. O cliente não cadastra, altera ou exclui produtos no backend. O campo `deleted_at` representa a exclusão lógica e impede que produtos removidos continuem aparecendo após a sincronização.

O modo offline depende de uma primeira autenticação e sincronização bem-sucedidas. Quando a internet volta ou o aplicativo retorna ao primeiro plano, uma nova sincronização é tentada sem bloquear a consulta do catálogo já armazenado.

## Impressão

1. `react-native-ble-plx` solicita permissões, busca dispositivos BLE, conecta e escreve nas características da impressora.
2. A lista visível é filtrada para nomes que contenham `NIIMBOT` ou `B1`.
3. `@slastra/nblib` implementa o protocolo usado pela B1 e envia o trabalho de impressão.
4. O aplicativo gera um raster monocromático de 384 × 240 pontos, correspondente à etiqueta de 50 × 30 mm em 203 dpi.
5. A impressão pode ser individual ou sequencial para todo o catálogo ativo.

## Bulas digitais

O SQLite armazena somente `bula_path`. Se o caminho representar um PDF válido, a etiqueta recebe um QR Code contendo a URL pública do objeto no bucket `bulas`. O PDF não é embarcado no APK nem copiado para o SQLite; a abertura no navegador depende de internet.

## Modelo remoto

| Tabela | Papel |
| --- | --- |
| `pharmacies` | Identifica cada farmácia |
| `profiles` | Liga `auth.users.id` a uma farmácia |
| `products` | Mantém o catálogo oficial com `pharmacy_id` |

As políticas RLS permitem ao usuário autenticado ler somente o próprio perfil, a farmácia vinculada e seus produtos. O aplicativo não recebe política de escrita no catálogo.

## Decisões e limites

- Android é a plataforma homologada.
- NIIMBOT B1 é o modelo de impressora validado.
- SQLite fornece disponibilidade local, mas não utiliza criptografia SQLCipher.
- O bucket de bulas é público por requisito funcional do QR Code.
- Uma assinatura Android própria ainda deve ser configurada antes de distribuição de produção.
