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

---

## Revisão final antes da abertura pública

Data da revisão: **15 de novembro de 2026**.

Esta seção complementa e preserva a revisão de 13 de novembro. As pendências históricas de screenshots e vídeo foram atendidas pelo commit `4fc1a17` (`docs: adicionar demonstração visual do FarmaConnect`). A decisão de alterar a visibilidade do repositório continua reservada ao proprietário.

### Escopo revisado

- 91 arquivos rastreados na branch `main`;
- histórico completo de `main`, composto pelos commits `1195655` e `4fc1a17`;
- README principal e todos os arquivos Markdown;
- código React Native/TypeScript, projeto Android, testes e scripts;
- migrações, seed e verificações do Supabase;
- quatro imagens do portfólio e o vídeo demonstrativo;
- árvore e auditoria atual das dependências npm.

### Histórico, credenciais e dados pessoais

A busca foi executada no estado atual e separadamente em cada commit. Não foram encontrados:

- chaves privadas, tokens GitHub/OpenAI/AWS ou JWTs longos;
- URL PostgreSQL com senha, `service_role` configurada ou chave secreta do Supabase;
- URL real do projeto Supabase em texto ou configuração versionada;
- `.env` real, `local.properties`, banco SQLite, APK, AAB ou chave de produção;
- telefone, documento pessoal, endereço de cliente ou dados comerciais reais.

`mobile/.env` permanece ignorado. `mobile/.env.example` contém somente valores fictícios. Os autores dos commits usam o endereço protegido `eduardoabou@users.noreply.github.com`. Os e-mails `teste01@farmaconnect.dev`, `teste02@farmaconnect.dev` e `teste03@farmaconnect.dev` são identificadores demonstrativos; o contato `i@izs.me` aparece apenas como metadado público de uma dependência no lockfile.

O arquivo `mobile/android/app/debug.keystore` é a chave de depuração padrão, com alias e senhas públicas do template Android. Ele não é uma credencial de produção e não deve assinar uma distribuição real.

### Imagens e vídeo

O commit `4fc1a17` adicionou:

- `docs/images/catalogo.jpg`;
- `docs/images/catalogo-qr.jpg`;
- `docs/images/fluxo-farmaconnect.png`;
- `docs/images/preview-video.jpg`;
- `docs/videos/demonstracao-farmaconnect.mp4`.

As imagens não possuem metadados GPS. A gravação tem 1 min 31,52 s e 27,4 MB; foi amostrada em toda a duração, em intervalos de 5 segundos. Ela mostra somente conta e catálogo demonstrativos, senha mascarada, mãos do apresentador e o nome Bluetooth anunciado pela NIIMBOT B1. Não há rosto, notificação pessoal, credencial, chave, URL administrativa ou dado de cliente. A faixa de áudio é tecnicamente silenciosa.

O QR Code de uma bula pode revelar a URL pública do respectivo PDF. Isso é intencional: o bucket `bulas` foi projetado para leitura pública sem autenticação. Nenhuma permissão administrativa acompanha essa URL.

Todos os 20 caminhos relativos encontrados nos arquivos Markdown foram verificados e existem. O vídeo de 27,4 MB é o maior objeto e permanece abaixo do limite individual de 100 MB do GitHub.

### Revalidação das dependências

Em 15 de novembro de 2026, `npm audit --omit=dev` continuou reportando **10 ocorrências**: 5 baixas, 1 moderada, 3 altas e 1 crítica. Nenhuma dependência foi atualizada.

Embora o npm inclua essas ocorrências na árvore sem dependências de desenvolvimento, os caminhos chegam por React Native, React DevTools e React Native CLI. Os pacotes afetados são módulos Node voltados a CLI, Metro, diagnóstico, abertura de editor, testes ou build. Não existe import de `body-parser`, `deepmerge`, `fast-xml-parser`, `joi`, `launch-editor`, `qs` ou `shell-quote` em `mobile/src`, `App.tsx` ou `index.js`.

Os avisos relevantes são:

- `body-parser`: [GHSA-27r3-jxmh-p828](https://github.com/advisories/GHSA-27r3-jxmh-p828);
- `deepmerge`: [GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4);
- `fast-xml-parser`: [GHSA-474x-hrwr-fgx4](https://github.com/advisories/GHSA-474x-hrwr-fgx4);
- `joi`: [GHSA-4528-x5fx-h6hg](https://github.com/advisories/GHSA-4528-x5fx-h6hg);
- `launch-editor`: [GHSA-698v-4r3x-3vcv](https://github.com/advisories/GHSA-698v-4r3x-3vcv), [GHSA-r825-w8mm-5pxw](https://github.com/advisories/GHSA-r825-w8mm-5pxw) e [GHSA-587h-7wmj-h5pm](https://github.com/advisories/GHSA-587h-7wmj-h5pm);
- `qs`: [GHSA-6pq8-jhm2-2vcw](https://github.com/advisories/GHSA-6pq8-jhm2-2vcw);
- `shell-quote`: [GHSA-pqg4-j6r4-53mv](https://github.com/advisories/GHSA-pqg4-j6r4-53mv).

Não foi identificado um caminho conhecido para explorar essas ocorrências por meio dos fluxos normais do APK instalado. O risco relevante está no host de desenvolvimento: executar entrada, arquivos, configurações ou projetos não confiáveis; expor o Metro a redes não confiáveis; ou acionar integrações de editor com argumentos controlados por terceiros. A severidade crítica de `shell-quote` justifica prioridade na futura atualização, mas não representa, pelas evidências atuais, execução remota no aplicativo Android.

Recomendações mantidas:

1. não expor o Metro em redes públicas;
2. não executar scripts, projetos ou configurações de terceiros sem revisão;
3. ativar alertas do Dependabot ao tornar o repositório público;
4. atualizar React Native/CLI em alteração separada e controlada, sem `npm audit fix --force`;
5. repetir TypeScript, ESLint, Jest, build e homologação física após a atualização.

### Verificações finais

| Verificação | Resultado em 15/11/2026 |
| --- | --- |
| Histórico completo de `main` | 2 commits revisados |
| Arquivos rastreados | 91 revisados |
| Busca de segredos no histórico | Nenhum segredo material encontrado |
| Metadados GPS nas imagens | Ausentes |
| Revisão visual do vídeo | Aprovada |
| Links relativos do Markdown | 20 verificados; 0 ausentes |
| TypeScript | Aprovado |
| ESLint | Aprovado |
| Jest | 10 suítes e 17 testes aprovados; 0 falhas |
| Atualização automática de dependências | Não realizada |

### Parecer

**O repositório está apto para publicação pública do código-fonte e uso como portfólio, com ressalvas controladas e já documentadas.** Não foi encontrada exposição de credencial, dado pessoal real ou informação confidencial que exija reescrita do histórico.

Esse parecer não autoriza usar o `debug.keystore` em produção, não transforma o APK preview em build de produção e não elimina a necessidade de atualizar a cadeia React Native/CLI. O SQLite continua sem SQLCipher e o bucket de bulas continua público por requisito funcional; ambos estão declarados na documentação. A alteração da visibilidade do GitHub não foi realizada nesta revisão.
