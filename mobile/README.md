# Aplicativo Android

Cliente React Native do FarmaConnect. Ele autentica usuários pelo Supabase, mantém uma réplica do catálogo em SQLite e imprime etiquetas na NIIMBOT B1 por Bluetooth Low Energy.

## Principais diretórios

- `src/screens/`: login, catálogo, busca, filtros e ações do usuário.
- `src/components/`: inicialização do banco, sessão e configuração da impressora.
- `src/database/`: SQLite, migrações e repositórios locais.
- `src/supabase/`: cliente, sessão segura e perfil em cache.
- `src/printer/`: conexão BLE, protocolo B1 e raster da etiqueta.
- `src/labels/`: modelo de dados da etiqueta.
- `src/bulas/`: geração da URL pública da bula.
- `__tests__/`: testes Jest.
- `scripts/android.ps1`: build, instalação e integração com ADB.

## Preparação

Requisitos: Node.js 22.11+, JDK 17, Android SDK e um aparelho Android físico autorizado no ADB.

```powershell
npm.cmd ci
Copy-Item .env.example .env
```

Preencha `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY` no `.env`. Não inclua `service_role` ou credenciais administrativas.

## Verificações

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test -- --runInBand
```

## Executar e compilar

```powershell
npm.cmd run android:devices
npm.cmd start          # terminal 1
npm.cmd run android    # terminal 2
npm.cmd run apk:build  # APK preview independente do Metro
npm.cmd run apk:install
```

O APK preview é criado em `android/app/build/outputs/apk/preview/app-preview.apk`. A impressão física foi homologada no Galaxy A70 com Android 11 e na NIIMBOT B1.
