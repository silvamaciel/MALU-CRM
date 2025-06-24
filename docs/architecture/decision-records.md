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

Este documento será atualizado à medida que novas decisões arquiteturais significativas forem tomadas ou as existentes forem revisadas.
