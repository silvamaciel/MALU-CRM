# Registros de Decisões Arquiteturais (ADRs)

Este documento lista as principais decisões arquiteturais tomadas durante o desenvolvimento do CRM Imobiliário, juntamente com suas justificativas e consequências.

## ADR-001: Escolha do Banco de Dados NoSQL (MongoDB)

*   **Decisão:** Utilizar MongoDB como o principal banco de dados da aplicação.
*   **Status:** Decidido
*   **Contexto:** A natureza dos dados de um CRM imobiliário envolve diversas entidades com relacionamentos variados e, por vezes, estruturas que podem evoluir (ex: campos customizados para leads, diferentes atributos para tipos de imóveis). Leads, propostas, e interações podem ter estruturas flexíveis.
*   **Justificativa:**
    *   **Flexibilidade de Schema:** MongoDB (um banco NoSQL orientado a documentos) permite um schema flexível, facilitando a evolução da estrutura de dados sem migrações complexas, o que é vantajoso para um produto em desenvolvimento e com potencial para customizações.
    *   **Escalabilidade Horizontal:** MongoDB é projetado para escalar horizontalmente, o que pode ser benéfico com o crescimento do volume de dados e usuários.
    *   **Desenvolvimento Ágil:** A ausência de um schema rígido e a representação de dados em formato JSON-like (BSON) alinham-se bem com o desenvolvimento em JavaScript (Node.js e React), reduzindo o "impedance mismatch" entre o objeto no código e sua representação no banco.
    *   **Mongoose ODM:** A biblioteca Mongoose para Node.js oferece uma camada de modelagem de objetos robusta sobre o MongoDB, permitindo definir schemas, validações e lógicas de negócio em nível de modelo, trazendo alguma estruturação ao mundo NoSQL.
*   **Consequências:**
    *   Menos adequado para queries relacionais complexas que exigiriam múltiplos `JOIN`s em SQL. Transações ACID são mais complexas ou limitadas em comparação com bancos SQL tradicionais (embora o MongoDB tenha evoluído nesse aspecto).
    *   A consistência eventual pode ser um fator em certos cenários, embora para muitas operações de CRM, isso seja aceitável.
    *   Requer um bom design de dados e indexação para garantir performance em consultas.

## ADR-002: Separação de Camadas no Backend (Controllers/Services)

*   **Decisão:** Adotar uma arquitetura em camadas no backend, com separação clara entre `Controllers` e `Services`.
*   **Status:** Decidido
*   **Contexto:** O backend precisa lidar com requisições HTTP, aplicar lógica de negócios, interagir com o banco de dados e gerenciar a autenticação/autorização.
*   **Justificativa:**
    *   **Organização e Manutenibilidade:**
        *   **Controllers:** Responsáveis por lidar com as requisições HTTP (parsing de entrada, validação básica, formatação da resposta HTTP). Eles orquestram as chamadas para os services. Não contêm lógica de negócios complexa.
        *   **Services:** Contêm a lógica de negócios principal da aplicação. São agnósticos em relação ao HTTP e podem ser reutilizados por diferentes controllers ou outros services. Interagem com os Models (Mongoose) para acesso a dados.
    *   **Testabilidade:** Services podem ser testados unitariamente de forma isolada, sem a necessidade de simular o ambiente HTTP.
    *   **Reusabilidade:** A lógica de negócios encapsulada nos services pode ser facilmente invocada de diferentes partes da aplicação (ex: diferentes endpoints, scripts de background, etc.).
*   **Consequências:**
    *   Pode introduzir um pouco mais de boilerplate para operações simples.
    *   Requer disciplina da equipe para manter a separação de responsabilidades.

## ADR-003: Escolha do Padrão REST para a API

*   **Decisão:** Implementar a comunicação entre frontend e backend utilizando uma API baseada no padrão REST (Representational State Transfer).
*   **Status:** Decidido
*   **Contexto:** O frontend (React SPA) precisa de uma forma padronizada e eficiente para buscar e manipular dados no servidor.
*   **Justificativa:**
    *   **Padrão Amplamente Adotado:** REST é um padrão bem conhecido e compreendido, com vasto suporte de ferramentas e bibliotecas (ex: Axios no frontend, Express.js no backend).
    *   **Statelessness:** Requisições REST são tipicamente stateless, o que simplifica o design do servidor e melhora a escalabilidade.
    *   **Uso de Métodos HTTP:** Utiliza os verbos HTTP padrão (GET, POST, PUT, DELETE, PATCH) para representar operações sobre os recursos, o que é intuitivo.
    *   **Flexibilidade de Formato de Dados:** Embora comumente usado com JSON (que é o caso desta aplicação), REST não impõe um formato específico.
*   **Consequências:**
    *   Pode levar a *over-fetching* ou *under-fetching* de dados em alguns cenários, se não for bem desenhado. Alternativas como GraphQL poderiam endereçar isso, mas com maior complexidade inicial.
    *   Múltiplas requisições podem ser necessárias para construir uma visão complexa no frontend, embora isso possa ser mitigado com endpoints bem desenhados.

## ADR-004: Autenticação via JSON Web Tokens (JWT)

*   **Decisão:** Utilizar JSON Web Tokens (JWT) para autenticação de usuários.
*   **Status:** Decidido
*   **Contexto:** A aplicação precisa de um mecanismo seguro e stateless para verificar a identidade dos usuários em requisições subsequentes após o login.
*   **Justificativa:**
    *   **Stateless:** JWTs são auto-contidos. O servidor não precisa armazenar o estado da sessão do usuário (além do segredo para assinar/verificar o token), o que é bom para escalabilidade.
    *   **Portabilidade:** Tokens podem ser facilmente passados em headers HTTP (`Authorization: Bearer <token>`) e são compreendidos por diversas plataformas e tecnologias.
    *   **Segurança (quando bem implementado):** Assinaturas digitais garantem a integridade do token. O uso de HTTPS é mandatório para proteger o token em trânsito.
    *   **Padrão:** JWT é um padrão aberto (RFC 7519).
*   **Consequências:**
    *   **Invalidação de Token:** A invalidação de tokens antes do tempo de expiração pode ser mais complexa (exige blacklisting ou mecanismos adicionais), já que são stateless. A estratégia comum é usar tempos de expiração curtos e implementar um mecanismo de refresh token. (A presença de refresh tokens não foi explicitamente verificada ainda no código, mas é uma consideração comum).
    *   **Tamanho do Token:** Se muitos dados forem incluídos no payload do JWT, o token pode ficar grande, aumentando o overhead das requisições.
    *   **Segurança do Segredo:** O segredo usado para assinar os tokens (`JWT_SECRET`) deve ser mantido seguro e ser forte.

## ADR-005: Deploy Separado para Frontend e Backend

*   **Decisão:** Realizar o deploy do frontend (React SPA) e do backend (Node.js API) em plataformas/serviços distintos. (Inferido da descrição da tarefa: Railway para backend, Vercel para frontend).
*   **Status:** Decidido (conforme prompt)
*   **Contexto:** Frontend e backend são aplicações com naturezas e requisitos de deploy diferentes.
*   **Justificativa:**
    *   **Otimização por Plataforma:**
        *   **Vercel:** Otimizado para hospedar aplicações frontend estáticas e Jamstack, com features como Global CDN, deploy previews, e fácil integração com frameworks como React/Next.js.
        *   **Railway (ou similares como Heroku, Render):** Plataformas como Serviço (PaaS) que simplificam o deploy de aplicações backend, gerenciando infraestrutura, scaling (em certa medida), e conexões com bancos de dados.
    *   **Escalabilidade Independente:** Permite escalar o frontend e o backend de forma independente, conforme a demanda de cada um.
    *   **Ciclos de Vida Separados:** Frontend e backend podem ser desenvolvidos, testados e deployados independentemente, permitindo maior agilidade.
    *   **Segurança:** Separação pode adicionar uma camada de isolamento.
*   **Consequências:**
    *   **Configuração de CORS:** Requer configuração cuidadosa de Cross-Origin Resource Sharing (CORS) no backend para permitir requisições do domínio do frontend. (Já observado o uso de `cors()` no `server.js`).
    *   **Gerenciamento de Múltiplos Serviços:** Exige o gerenciamento de deploy e monitoramento em duas plataformas distintas.
    *   **Variáveis de Ambiente:** Necessidade de configurar variáveis de ambiente em ambas as plataformas (ex: URL da API backend no frontend, segredos no backend).

---

## ADR-006: Escolha de Biblioteca para Validação de Entrada no Backend (`express-validator`)

*   **Decisão:** Adotar `express-validator` para validação centralizada de dados de entrada (request body, query params, path params) nas rotas do backend.
*   **Status:** Decidido e parcialmente implementado (ex: rotas de Lead).
*   **Contexto:** A aplicação precisa de uma forma robusta e declarativa para validar os dados recebidos pela API, além das validações de schema do Mongoose, para garantir a integridade dos dados antes de atingir a lógica de serviço.
*   **Justificativa:**
    *   **Middleware Express:** `express-validator` integra-se diretamente como middleware nas rotas Express, tornando a validação parte do fluxo de manipulação da requisição.
    *   **Declarativo:** As regras de validação são definidas de forma encadeada e legível (e.g., `body('email').isEmail().normalizeEmail()`).
    *   **Abrangente:** Oferece uma vasta gama de validadores e sanitizadores padrão.
    *   **Customizável:** Permite validadores customizados.
    *   **Coleta de Erros:** Facilita a coleta e formatação de erros de validação.
*   **Consequências:**
    *   Adiciona uma nova dependência ao backend.
    *   Requer a definição de cadeias de validação para cada rota que manipula dados de entrada.
    *   A lógica de validação fica no nível da rota/controller, o que é apropriado para dados de HTTP request.

## ADR-007: Escolha de Biblioteca para Parsing de CSV no Backend (`papaparse`)

*   **Decisão:** Utilizar `papaparse` para o parsing de arquivos CSV na funcionalidade de importação de leads no backend.
*   **Status:** Decidido e implementado.
*   **Contexto:** A importação de leads via CSV necessita de um parser robusto que lide bem com diferentes formatos de CSV, delimitadores, e possíveis erros de formatação no arquivo.
*   **Justificativa:**
    *   **Robustez:** `papaparse` é uma biblioteca popular e bem testada para parsing de CSV, capaz de lidar com arquivos grandes, diferentes delimitadores, e encoding.
    *   **Facilidade de Uso:** Oferece uma API simples para converter strings CSV em arrays de objetos JavaScript.
    *   **Streaming (Potencial):** Embora a implementação atual leia o buffer, `papaparse` tem suporte a streaming, o que seria benéfico para arquivos muito grandes no futuro.
    *   **Error Handling:** Fornece informações sobre erros de parsing.
*   **Consequências:**
    *   Adiciona a dependência `papaparse` ao backend.
    *   Substitui a lógica manual de splitting de CSV, o que é uma melhoria em termos de confiabilidade.

## ADR-008: Estratégia de Sanitização de HTML (`DOMPurify` e Escaping)

*   **Decisão:**
    1.  Utilizar `DOMPurify` no backend para sanitizar o HTML de `ModeloContrato.conteudoHTMLTemplate` no momento do salvamento, permitindo um conjunto seguro de tags e atributos para formatação.
    2.  Utilizar uma função `escapeHtml` no backend (`PropostaContratoService`) para escapar dados dinâmicos (ex: nome do lead, endereço) antes de serem injetados nos placeholders dos templates HTML.
    3.  Utilizar `DOMPurify` no frontend para sanitizar o `corpoContratoHTMLGerado` (que é o resultado do template sanitizado + dados escapados) antes de renderizá-lo com `dangerouslySetInnerHTML`.
*   **Status:** Decidido e implementado.
*   **Contexto:** A aplicação lida com HTML gerado por administradores (templates de contrato) e com dados de usuários que são inseridos nesses templates. É crucial prevenir vulnerabilidades XSS.
*   **Justificativa:**
    *   **Defesa em Profundidade:** Múltiplas camadas de sanitização (template no save, dados na injeção, output final no display) oferecem maior segurança.
    *   **DOMPurify:** É uma biblioteca bem conceituada e robusta para sanitização de HTML, prevenindo XSS ao remover código malicioso e permitir apenas tags/atributos seguros.
    *   **HTML Escaping:** Escapar dados dinâmicos previne que esses dados, se contiverem caracteres HTML, quebrem a estrutura do template ou introduzam XSS.
    *   **Controle do Admin:** Permite que administradores usem HTML para formatação rica nos templates, mas de forma segura.
*   **Consequências:**
    *   Adiciona dependências (`dompurify`, `jsdom` no backend; `dompurify` no frontend).
    *   Pequeno overhead de performance devido à sanitização, mas justificado pelo ganho de segurança.
    *   Requer configuração cuidadosa do DOMPurify para permitir as tags HTML necessárias para formatação de contratos, sem permitir vetores de ataque.

## ADR-009: Code Splitting para Rotas no Frontend (`React.lazy` e `Suspense`)

*   **Decisão:** Implementar code splitting baseado em rotas no frontend utilizando `React.lazy()` para importação dinâmica de componentes de página e `<Suspense>` para exibir um fallback de carregamento.
*   **Status:** Decidido e implementado em `App.js`.
*   **Contexto:** O bundle inicial do JavaScript do frontend estava incluindo o código de todas as páginas, o que pode levar a tempos de carregamento iniciais mais longos, especialmente à medida que a aplicação cresce.
*   **Justificativa:**
    *   **Melhora de Performance Percebida:** Reduz o tamanho do bundle inicial, fazendo com que a aplicação carregue mais rápido para o usuário. O código de cada página só é baixado quando o usuário navega para ela.
    *   **Padrão React:** `React.lazy` e `Suspense` são as ferramentas padrão fornecidas pelo React para esta finalidade.
    *   **Melhor Experiência do Usuário:** Carregamentos iniciais mais rápidos são cruciais para a retenção de usuários.
*   **Consequências:**
    *   Introduz um pequeno delay ao navegar para uma nova rota pela primeira vez, enquanto o chunk de JavaScript daquela página é baixado (mitigado por um componente de fallback via `Suspense`).
    *   Requer que os componentes de página sejam exportados como default ou que `React.lazy` seja usado com uma função que retorne o componente nomeado.

## ADR-010: Estratégia de Testes Automatizados (Jest, RTL, Supertest)

*   **Decisão:** Adotar Jest como framework de testes principal. Utilizar React Testing Library (RTL) para testes de componentes frontend e Supertest para testes de integração de API no backend.
*   **Status:** Decidido e parcialmente implementado (testes iniciais para `LeadService`, `PropostaContratoService`, `LoginPage`, `PropostaContratoFormPage`, e algumas rotas API).
*   **Contexto:** O projeto carecia de uma suíte de testes automatizados, o que é crucial para garantir a qualidade do código, prevenir regressões e facilitar refatorações seguras.
*   **Justificativa:**
    *   **Jest:** Um test runner popular, com bom suporte para mocking, asserções e relatórios de cobertura. Já é parte do setup do Create React App.
    *   **React Testing Library (RTL):** Promove testes que se assemelham mais à forma como os usuários interagem com os componentes, focando no comportamento em vez de detalhes de implementação.
    *   **Supertest:** Facilita o teste de aplicações Express.js fazendo requisições HTTP e validando respostas, ideal para testar a integração de rotas e controllers.
    *   **Abordagem de Pirâmide de Testes:** A intenção é construir uma base de testes unitários rápidos, complementados por testes de integração e, eventualmente, alguns testes E2E.
*   **Consequências:**
    *   Aumento no tempo de desenvolvimento inicial para escrever testes.
    *   Necessidade de manter os testes atualizados à medida que o código evolui.
    *   Overhead de CI/CD para rodar os testes.
    *   Benefício a longo prazo em termos de estabilidade e confiança nas alterações.

## ADR-011: Caching para Dados de Dashboard (Conceitual - `node-cache`)

*   **Decisão:** (Conceitual) Implementar um mecanismo de caching in-memory (usando `node-cache` como exemplo) para os resultados de agregações pesadas no `DashboardService`.
*   **Status:** Conceitualmente definido; implementação pendente de acesso ao `DashboardService.js`.
*   **Contexto:** As queries de agregação do dashboard podem ser resource-intensive no banco de dados, especialmente com grandes volumes de dados.
*   **Justificativa:**
    *   **Melhora de Performance:** Reduz a carga no banco de dados e diminui o tempo de resposta para requisições de dashboard, retornando dados cacheados quando disponíveis e dentro do TTL.
    *   **Simplicidade (para In-Memory):** `node-cache` é simples de implementar para um cache local de instância única.
*   **Consequências (para In-Memory Cache):**
    *   **Consumo de Memória:** O cache consumirá memória do servidor Node.js.
    *   **Escalabilidade Limitada:** Em um ambiente com múltiplas instâncias do backend, cada instância terá seu próprio cache, podendo levar a inconsistências temporárias ou múltiplas queries para popular caches individuais. Para ambientes escalados, um cache distribuído (ex: Redis) seria mais apropriado.
    *   **Frescor dos Dados:** Dados do dashboard podem ficar levemente desatualizados (dentro do TTL do cache).
    *   **Complexidade Adicional:** Gerenciamento de chaves de cache e estratégias de invalidação (além do TTL) podem adicionar complexidade se necessário.

Este documento será atualizado à medida que novas decisões arquiteturais significativas forem tomadas ou as existentes forem revisadas.
