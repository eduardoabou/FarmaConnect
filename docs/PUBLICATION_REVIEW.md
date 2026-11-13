# Revisão para publicação

Data da revisão: **13 de novembro de 2026**.

Este relatório registra a revisão realizada antes da primeira publicação autorizada do repositório.

## Funcionalidades confirmadas no código

- autenticação com Supabase Auth;
- perfil vinculado a uma farmácia;
- isolamento remoto por RLS e isolamento local por `pharmacy_id`;
- catálogo Supabase sincronizado de forma unidirecional para SQLite;
- consulta offline, pesquisa e categorias;
- conexão Bluetooth Low Energy com a NIIMBOT B1;
- impressão individual e em massa;
- etiqueta raster 50 × 30 mm;
- QR Code opcional para bula em PDF no Supabase Storage;
- limpeza do catálogo local da farmácia ativa no logout.

## Tecnologias identificadas

- React Native 0.87.1, React 19.2.3 e TypeScript 6;
- Supabase Auth, PostgreSQL, PostgREST, RLS e Storage;
- SQLite por `@op-engineering/op-sqlite`;
- `react-native-ble-plx` e `@slastra/nblib` para a NIIMBOT B1;
- `qrcode-generator`, `react-native-keychain`, AsyncStorage e NetInfo;
- Jest, React Test Renderer, ESLint, Babel, Metro, Gradle, Android SDK e JDK 17.

## Documentação preparada

- `README.md`: apresentação profissional, problema, escopo, funcionalidades, tecnologias, instalação, execução, testes, segurança, limitações, autoria e espaços para mídia.
- `docs/ARCHITECTURE.md`: componentes, fluxo de autenticação, sincronização, impressão e bulas.
- `docs/SECURITY.md`: credenciais, RLS, sessão, SQLite, Storage, Bluetooth e assinatura Android.
- `docs/images/README.md`: orientação para capturas seguras.
- `mobile/README.md`: comandos e estrutura do cliente Android.
- `supabase/README.md`: migrações, modelo de acesso e operação do Storage.

## Estrutura candidata ao primeiro commit

- raiz: `.gitignore`, `README.md` e `DOCUMENTACAO_END_TO_END.md`;
- `docs/`: arquitetura, segurança, revisão de publicação e orientação de imagens;
- `mobile/`: código React Native, projeto Android, testes, mocks, scripts, configurações e lockfile;
- `supabase/`: README, três migrações, seed demonstrativo e roteiro de verificação.

Use o comando abaixo para ver a relação exata antes do commit:

```powershell
git ls-files --others --exclude-standard
```

## Arquivos e categorias ignorados

- `mobile/.env` e demais variáveis locais;
- `node_modules`, caches do npm, Metro e Gradle;
- builds, `.cxx`, `.kotlin`, APKs e AABs;
- bancos SQLite/DB e arquivos WAL;
- logs, cobertura, temporários e configurações locais de IDE;
- chaves privadas e keystores que não sejam o `debug.keystore` padrão;
- memória interna do projeto, instruções do agente e revisões auxiliares do TCC;
- PDF gerado da documentação técnica.

## Segurança

- `mobile/.env` possui configuração local real e está confirmado como ignorado.
- Nenhuma `service_role`, URL com senha de banco, chave privada, token GitHub, token OpenAI ou JWT longo foi encontrado nos arquivos candidatos.
- As ocorrências textuais de `service_role` são avisos documentais e comentários de segurança, sem valor de credencial.
- `mobile/android/app/debug.keystore` é a chave padrão de desenvolvimento, necessária aos builds locais; ela não pode ser usada para assinatura de produção.
- Não havia repositório Git local antes desta preparação, portanto não existe histórico local anterior para auditar.
- A inspeção final do histórico remoto deve ocorrer com a autenticação usada no push. O envio normal deve ser interrompido se a branch remota possuir histórico incompatível.

## Verificações técnicas

| Verificação | Resultado |
| --- | --- |
| `npm.cmd run typecheck` | Aprovado |
| `npm.cmd run lint` | Aprovado |
| `npm.cmd test -- --runInBand` | 10 suítes e 17 testes aprovados; 0 falhas |
| Busca de segredos nos candidatos | Nenhum segredo material encontrado |
| `.gitignore` para `.env`, builds e dependências | Confirmado |

## Auditoria de dependências

`npm audit --omit=dev` reportou **10 vulnerabilidades transitivas**: 5 baixas, 1 moderada, 3 altas e 1 crítica. A análise da árvore de dependências e dos imports classificou todas as ocorrências na cadeia de desenvolvimento, CLI, Metro, DevTools, testes ou build. Não há import desses pacotes no código funcional do aplicativo, e não foi identificado caminho conhecido de exploração nos fluxos normais do APK instalado.

| Classificação | Pacotes | Risco principal |
| --- | --- | --- |
| CLI, diagnóstico e configuração | `@react-native-community/cli`, `cli-config`, `cli-doctor`, `fast-xml-parser`, `joi` | entradas malformadas e consumo de recursos no host de desenvolvimento |
| Servidor Metro/CLI | `body-parser`, `qs` | negação de serviço se o servidor de desenvolvimento for exposto a entrada não confiável |
| Integração com editor e shell | `launch-editor`, `shell-quote` | manipulação de argumentos ou comando no host de desenvolvimento |
| Ferramentas compartilhadas de build/teste | `deepmerge` | prototype poisoning em processamento de configuração não confiável |

Nenhuma correção automática foi aplicada. O próprio npm propõe alterações potencialmente incompatíveis na CLI. A recomendação é manter Metro restrito à rede confiável, não executar projetos/configurações não confiáveis e atualizar React Native/CLI em uma etapa separada, com nova auditoria, testes, build e homologação física. A análise completa está em `docs/SECURITY.md`.

## Decisões confirmadas para a publicação

- autoria coletiva do TCC: Eduardo Abou Antoun e Murilo Blumer Rios;
- nenhuma contribuição individual foi inventada ou atribuída;
- espaços para screenshots e vídeo demonstrativo foram preservados;
- repositório mantido sem licença por decisão dos integrantes nesta etapa;
- nenhuma dependência foi atualizada automaticamente;
- publicação autorizada somente por push normal na branch `main`, sem force push e sem alteração de visibilidade.

## Pendências posteriores

1. Adicionar screenshots sanitizadas em `docs/images/`.
2. Informar o link do vídeo demonstrativo quando estiver disponível.
3. Planejar a atualização segura das dependências apontadas pelo `npm audit`.
4. Configurar uma chave de assinatura própria antes de qualquer distribuição de produção.
