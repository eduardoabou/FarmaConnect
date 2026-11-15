# Segurança e privacidade

Este documento registra o modelo de segurança implementado e os cuidados necessários para publicar o repositório.

## Configuração do cliente

O APK utiliza apenas `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY`. Essas configurações identificam o projeto e o cliente público. A autorização dos dados depende da sessão, dos grants e das políticas RLS.

Nunca inclua no aplicativo ou no Git:

- `service_role`;
- senha do banco PostgreSQL;
- token pessoal do GitHub;
- chave privada de assinatura Android;
- credencial administrativa do Supabase.

O arquivo real `mobile/.env` é local e ignorado. O repositório mantém somente `mobile/.env.example`, com valores fictícios.

## Autenticação e sessão

- A autenticação é realizada pelo Supabase Auth.
- A senha não é armazenada pelo FarmaConnect.
- Sessão e perfil em cache são protegidos por `react-native-keychain`, usando o Android Keystore.
- O e-mail lembrado é uma preferência local não autenticadora.
- No logout, o aplicativo remove perfil cacheado, produtos e estado de sincronização da farmácia ativa e encerra a sessão Supabase.

## Isolamento por farmácia

A proteção é aplicada em mais de uma camada:

1. `profiles` liga o usuário autenticado a um `pharmacy_id`.
2. A RLS do Supabase libera somente a farmácia e os produtos associados à sessão.
3. O repositório SQLite exige o `pharmacy_id` e o inclui nas consultas locais.
4. A persistência rejeita produtos cujo identificador de farmácia não corresponda ao repositório ativo.
5. A troca de conta ocorre após a limpeza local realizada no logout.

## SQLite e dispositivo

O arquivo `farmaconnect.sqlite` fica no armazenamento interno privado do Android. O aplicativo não solicita acesso a armazenamento externo e define `android:allowBackup="false"`.

O banco não usa SQLCipher. Em um dispositivo íntegro, o sandbox do Android limita o acesso por outros aplicativos. Em um aparelho comprometido ou com acesso privilegiado, essa proteção pode ser contornada. Caso o escopo passe a incluir dados pessoais ou informações comerciais sensíveis, a criptografia integral do banco deve ser reavaliada.

## PDFs de bula

O bucket `bulas` é público para leitura porque o QR Code deve abrir o PDF em qualquer navegador, sem login e sem o FarmaConnect instalado. O cliente não possui permissão de upload. Publique somente documentos destinados ao acesso público e mantenha a administração do bucket fora do APK.

## Bluetooth

O Android recebe apenas as permissões necessárias para busca e conexão BLE. Em Android 12 ou superior são usadas `BLUETOOTH_SCAN` e `BLUETOOTH_CONNECT`; em versões anteriores, as permissões legadas são limitadas até a API 30. A aplicação não usa a busca Bluetooth para inferir localização.

## Assinatura Android

`mobile/android/app/debug.keystore` é a chave padrão de depuração e serve apenas para builds locais e preview. Ela não representa uma credencial de produção. Uma distribuição real precisa de uma chave própria, armazenada fora do repositório, com senhas fornecidas pelo ambiente de build.

## Vulnerabilidades conhecidas em dependências

Em 13 de novembro de 2026, `npm audit --omit=dev` reportou **10 ocorrências transitivas**: 5 baixas, 1 moderada, 3 altas e 1 crítica. O mesmo resultado foi confirmado novamente em 15 de novembro de 2026. Nenhuma dependência foi atualizada automaticamente durante as revisões.

| Pacote apontado | Severidade agregada | Uso identificado no projeto | Impacto avaliado |
| --- | --- | --- | --- |
| `@react-native-community/cli` | baixa | ferramenta de linha de comando do React Native | desenvolvimento e build |
| `@react-native-community/cli-config` | baixa | configuração da CLI | desenvolvimento e build |
| `@react-native-community/cli-doctor` | baixa | diagnóstico do ambiente | desenvolvimento |
| `body-parser` | alta | dependência transitiva do servidor da CLI/Metro | host de desenvolvimento; negação de serviço se receber entrada comprimida malformada |
| `deepmerge` | baixa | cadeia da CLI e ferramentas de teste | build/testes; risco de prototype poisoning com entrada não confiável |
| `fast-xml-parser` | baixa | dependência transitiva da CLI | build/diagnóstico; consumo excessivo de CPU com XML malformado |
| `joi` | alta | validação interna da CLI | desenvolvimento; negação de serviço com entrada especialmente construída |
| `launch-editor` | alta | abertura do editor pelo ambiente de desenvolvimento | host de desenvolvimento, especialmente no Windows; tratamento inseguro de argumentos/comandos |
| `qs` | moderada | dependência do servidor da CLI | host de desenvolvimento; negação de serviço com consulta malformada |
| `shell-quote` | crítica | cadeia da CLI e do React DevTools | desenvolvimento/depuração; injeção de comando se tokens não confiáveis forem processados |

Esses pacotes não são importados pelo código funcional em `mobile/src`, e a inspeção do bundle do APK preview não encontrou evidência de `body-parser`, `fast-xml-parser`, `launch-editor` ou `shell-quote`. A análise indica que as ocorrências estão concentradas na cadeia de **CLI, Metro, DevTools, testes e build**, não nos fluxos normais de autenticação, SQLite, Supabase, Bluetooth ou impressão do APK. Assim, não foi identificado um caminho conhecido de exploração pelo usuário final no aplicativo instalado.

Isso não elimina o risco para a cadeia de desenvolvimento. Para reduzi-lo:

- não exponha o Metro a redes públicas ou não confiáveis;
- não execute o projeto, scripts ou configurações recebidos de fontes não confiáveis;
- mantenha a máquina de desenvolvimento e as credenciais protegidas;
- acompanhe correções compatíveis do React Native e de sua CLI;
- atualize React Native/CLI em uma alteração separada, seguida de TypeScript, ESLint, Jest, build e homologação no Galaxy A70 e na NIIMBOT B1;
- não use `npm audit fix --force`, pois a correção sugerida pode introduzir versão incompatível ou regressão.

Com as evidências atuais, as vulnerabilidades exigem acompanhamento, mas **não impedem a publicação pública do código-fonte**. O risco residual está principalmente no ambiente de desenvolvimento e deve ser declarado; este parecer não equivale à aprovação de um APK de produção. Antes de distribuir uma versão de produção, a auditoria deve ser repetida e a cadeia de build deve ser atualizada de forma controlada.

## Verificação antes de publicar

- Confirme com `git check-ignore -v mobile/.env` que o `.env` está ignorado.
- Revise `git status` antes de cada commit.
- Não adicione APKs, bancos SQLite, logs, caches ou diretórios de build.
- Pesquise o histórico por segredos antes de tornar um repositório existente público.
- Se um segredo já tiver sido commitado, remova-o do histórico e revogue ou substitua a credencial; apagar apenas o arquivo no commit atual não é suficiente.
