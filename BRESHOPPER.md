# Beeshopper

## 1. O que é o Beeshopper

O **Beeshopper** é uma plataforma de compra e venda de produtos usados ou seminovos, conectando **usuários vendedores, usuários compradores e lojas parceiras**.

A proposta central é permitir que uma pessoa ofereça um produto para uma loja. A loja, por meio de um **operador**, cadastra e avalia o produto, define o valor de venda e estabelece como o valor será dividido entre o vendedor e a loja.

O diferencial do modelo é que a parcela destinada ao vendedor pode ser disponibilizada como **crédito dentro do Beeshopper/loja**, criando uma espécie de conta corrente do usuário.

### Exemplo principal

Rafael entrega uma raquete para a loja.

- Valor de venda definido pelo Beeshopper: **R$ 1.000**
- Valor destinado ao usuário vendedor: **R$ 600**
- Valor destinado à loja: **R$ 400**

Quando outro usuário compra a raquete por R$ 1.000, os R$ 600 pertencentes ao vendedor podem ser liberados como crédito na loja ou, conforme a regra definida, pagos por PIX.

O Beeshopper, portanto, não é apenas um catálogo de produtos: ele controla a **origem do produto, avaliação, venda e posteriormente o crédito financeiro gerado para o usuário**.

---

## 2. Conceitos fundamentais

### Usuário

É a pessoa que utiliza o Beeshopper.

Um mesmo usuário pode exercer papéis diferentes em momentos diferentes:

- vendedor;
- comprador;
- beneficiário de crédito.

Não existe uma entidade separada de “vendedor”. O vendedor é um **usuário** que possui um produto para vender.

### Loja

É a empresa/estabelecimento parceiro que recebe produtos, participa da avaliação, vende produtos e recebe a parcela que lhe cabe na operação.

### Operador

É um usuário vinculado a uma loja que atua **em nome da loja** dentro do sistema.

No MVP, somente o **operador ativo da própria loja** pode realizar operações administrativas sobre produtos, como o cadastro e a avaliação.

**Operadores não vendem nem compram produtos.** Quem é operador ativo de uma loja atua somente em nome dela: não pode ser o usuário vendedor de um produto (a API recusa com "Operadores de loja não podem vender produtos") e, no app, vê apenas a **Área da loja** — sem saldo e sem as ações de comprar ou vender.

### Produto

É o item colocado à venda pelo usuário e recebido/cadastrado por uma loja.

O produto mantém a relação com:

- usuário vendedor;
- loja;
- operador responsável pelo cadastro;
- categoria;
- marca;
- avaliação;
- valor de venda;
- status.

### Categoria

Cadastro utilizado para classificar produtos.

Exemplos:

- Raquetes de Tênis;
- Bicicletas;
- Eletrônicos;
- Celulares.

### Marca

Cadastro utilizado para identificar a marca do produto.

Exemplos:

- Babolat;
- Wilson;
- Head;
- Apple.

### Avaliação

É a etapa em que o operador da loja analisa o produto e registra o valor pelo qual ele será disponibilizado para venda, além da divisão financeira entre usuário e loja.

Exemplo:

```text
Valor de venda:       R$ 1.000
Valor do usuário:     R$   600
Valor da loja:        R$   400
```

A soma dos valores do usuário e da loja deve ser exatamente igual ao valor de venda.

---

## 3. Fluxo de negócio do MVP

```text
USUÁRIO
   │
   │ entrega produto
   ▼
LOJA
   │
   │ operador cadastra
   ▼
PRODUTO
   │
   │ categoria + marca
   ▼
AVALIAÇÃO
   │
   ├── valor de venda
   ├── valor do usuário
   └── valor da loja
   │
   ▼
PRODUTO DISPONÍVEL
   │
   │ comprador realiza compra
   ▼
VENDA
   │
   ▼
CONTA CORRENTE DO USUÁRIO
   │
   └── crédito gerado pela venda
```

---

## 4. Regras já definidas

### Regra 1 — Usuário também pode comprar e vender

Não existe uma tabela/entidade “vendedor”. O vendedor é o próprio usuário.

### Regra 2 — Operador pertence à loja

O operador é um usuário vinculado a uma loja.

### Regra 3 — Somente operador da loja pode cadastrar produto

Um operador precisa:

- estar ativo;
- pertencer à loja do produto;
- estar executando a operação em nome da própria loja.

### Regra 3.1 — Operador não vende nem compra

O usuário vendedor de um produto não pode ser operador ativo de nenhuma loja. O operador usa o sistema apenas para operar a loja.

### Regra 4 — Produto possui categoria e marca

Categoria e marca são cadastros independentes e são referenciadas pelo produto por seus respectivos IDs.

### Regra 5 — Avaliação pertence ao produto

Um produto pode possuir uma avaliação no MVP.

### Regra 6 — Divisão da avaliação deve fechar

```text
valor_usuario + valor_loja = valor_venda
```

Não são permitidas diferenças entre os valores.

### Regra 7 — Status do domínio são em português

Os nomes utilizados pela aplicação e pelo domínio devem permanecer em português.

Exemplos:

```text
ATIVO
INATIVO
RECEBIDO
DISPONIVEL
VENDIDO
CANCELADO
PENDENTE
APROVADA
CONCLUIDA
```

---

## 5. Estado atual do projeto

O projeto está em uma fase de **MVP funcional de backend + primeiro frontend**.

### Backend

O backend está implementado em Python/FastAPI e publicado no Render.

API:

https://breshopper-api.onrender.com

Swagger:

https://breshopper-api.onrender.com/docs

### Banco

O projeto utiliza PostgreSQL e Alembic para controle das migrations.

### Frontend

Existe um frontend web em HTML/CSS/JavaScript, publicado no GitHub Pages:

https://pija14.github.io/prjBreshooper/

O frontend segue o Material Design 3 com identidade própria (marca "sacola com setas de reuso", paleta terracota gerada a partir da cor-semente `#c2410c`, temas claro e escuro).

O login com Google está integrado de ponta a ponta: o botão oficial do Google Identity Services entrega o ID token ao backend, que o valida (assinatura, audiência, emissor, validade e e-mail verificado), cria ou localiza o usuário e emite um token de sessão (JWT). A primeira área autenticada exibe saudação, saldo (ainda R$ 0,00), as próximas ações marcadas como "Em breve" e as lojas em que o usuário é operador.

Operadores entram direto na **Área da loja**: painel com contagem de produtos aguardando avaliação, disponíveis e vendidos (com filtros), **Receber produto** (cliente vendedor, categoria, marca, estado de conservação e descrição, com cadastro rápido de cliente, categoria e marca) e **Avaliar** (valor de venda e parte do cliente; a parte da loja é calculada em centavos para a divisão sempre fechar) e **Vender** (o operador registra, em nome da loja, a venda a um cliente comprador). As telas usam rotas por hash (`#/`, `#/receber`, `#/avaliar/<id>`, `#/vender/<id>`) para o botão voltar funcionar. Se o operador atuar em mais de uma loja, troca de loja pelo menu da conta.

Ainda não implementado: proteção por token dos endpoints administrativos existentes (produtos, avaliações, cadastros), que continuam recebendo `operador_id` como parâmetro.

### Estrutura funcional já construída

- [x] Usuários
- [x] Lojas
- [x] Operadores
- [x] Categorias
- [x] Marcas
- [x] Produtos
- [x] Avaliações
- [x] Documentação básica do Swagger em português
- [x] Frontend inicial
- [x] Login com Google (validação no backend + sessão JWT)
- [x] Área autenticada inicial (saudação, saldo, ações em breve, lojas do operador)
- [x] Área da loja para operadores (painel, receber produto, avaliar, vender)
- [x] Vendas (`POST /api/vendas`)
- [x] Conta corrente do usuário (crédito na venda, saldo e extrato) e financeiro da loja
- [x] Identidade visual e PWA (ícones, manifesto, service worker)
- [x] Publicação do frontend no GitHub Pages
- [x] Publicação da API no Render

---

## 6. Estrutura atual de dados

A estrutura conceitual atual é:

```text
USUARIOS
   │
   ├───────────────┐
   │               │
   ▼               ▼
OPERADORES       PRODUTOS
   │               │
   ▼               ├── CATEGORIA
 LOJAS             ├── MARCA
                   ├── USUÁRIO VENDEDOR
                   └── OPERADOR
                        │
                        ▼
                    AVALIAÇÃO
```

### Entidades principais

```text
usuarios
lojas
operadores
categorias
marcas
produtos
avaliacoes
```

A nomenclatura do domínio e dos JSONs da API deve permanecer em português.

---

## 7. O que falta para concluir o MVP

A partir do estado atual, o caminho recomendado é:

### Fase 1 — Autenticação real *(login concluído; falta proteger os endpoints administrativos com o token)*

Conectar a tela de login ao Google OAuth/OIDC.

Objetivos:

- autenticar usuário;
- identificar o usuário na API;
- criar ou localizar o cadastro do usuário;
- manter sessão autenticada;
- proteger endpoints que exigem autenticação.

---

### Fase 2 — Tela inicial autenticada

Depois do login, criar a primeira área autenticada do Beeshopper.

Deve apresentar inicialmente:

- saudação do usuário;
- ações principais;
- comprar;
- vender;
- meus produtos;
- saldo/crédito;
- histórico básico.

Nesta fase o objetivo principal é validar a experiência do produto, sem tentar construir todo o sistema visual de uma vez.

---

### Fase 3 — Fluxo de entrada de produto

Criar no frontend o fluxo:

```text
Usuário
   ↓
Vender produto
   ↓
Informar produto
   ↓
Loja recebe
   ↓
Operador cadastra
   ↓
Produto RECEBIDO
```

Para o MVP, o usuário não deve conseguir transformar diretamente o produto em disponível para venda. A loja/operator controla essa etapa.

---

### Fase 4 — Avaliação

Criar a interface e a integração para o operador avaliar o produto.

Fluxo:

```text
Produto RECEBIDO
      ↓
Operador da loja
      ↓
Avaliação
      ├── valor de venda
      ├── valor do usuário
      └── valor da loja
      ↓
Produto DISPONIVEL
```

Deve haver validação para garantir que a divisão financeira feche exatamente.

---

### Fase 5 — Catálogo e compra

Criar a experiência do comprador:

```text
DISPONIVEIS
    ↓
Lista de produtos
    ↓
Detalhes do produto
    ↓
Comprar
```

O MVP pode começar com um catálogo simples, com filtros básicos por:

- categoria;
- marca;
- loja.

---

### Fase 6 — Venda ✅ implementada

Implementada na tabela `vendas` e no endpoint `POST /api/vendas?operador_id=` (corpo: `produto_id`, `usuario_comprador_id`). Regras: operador ativo da loja do produto; produto `DISPONIVEL` com avaliação `APROVADA`; comprador ativo, diferente do vendedor e que não seja operador de loja; uma venda por produto. Os valores (`valor_venda`, `valor_usuario`, `valor_loja`) são copiados da avaliação, a venda nasce `CONCLUIDA` com `referencia` única (`VND-XXXXXXXXXX`) e `data_hora`, e o produto passa a `VENDIDO`. A parte do vendedor vira um **repasse** `PENDENTE` (despesa da loja), pago depois pela loja (Fase 7).

Criar a entidade e o fluxo de venda.

A venda deve registrar pelo menos:

- produto;
- comprador;
- loja;
- valor da venda;
- status;
- data/hora;
- referência da operação.

Fluxo:

```text
PRODUTO DISPONIVEL
       ↓
COMPRADOR
       ↓
VENDA
       ↓
PRODUTO VENDIDO
```

---

### Fase 7 — Conta corrente do usuário ✅ implementada

Duas tabelas:

- `repasses` — o que a loja deve a cada vendedor, um por venda. Nasce `PENDENTE` na venda (mesma transação) com o `valor_usuario`. A loja paga com `forma_pagamento` **`PIX`**, **`CARTAO`** ou **`CREDITO_LOJA`**; o repasse vira `PAGO` (com `pago_em` e operador). Um repasse só é pago uma vez (UPDATE condicional — dois cliques ou dois operadores não pagam em dobro).
- `movimentacoes` — a carteira (conta corrente) do usuário: lançamentos `CREDITO`/`DEBITO`, status `CONCLUIDA`. **Só o pagamento em `CREDITO_LOJA` gera crédito na carteira**; PIX e cartão são pagos fora do Breshopper e ficam apenas registrados. Saldo = créditos − débitos.

Vendas anteriores a esta regra (que creditavam a carteira automaticamente) foram migradas como repasses `PAGO` em `CREDITO_LOJA` (migration `0009`), sem alterar saldos.

Endpoints (todos exigem token; os da loja, operador ativo da loja):

- `GET /api/conta-corrente` — saldo, extrato e `a_receber` (repasses pendentes do usuário). Tela inicial do cliente.
- `GET /api/lojas/{loja_id}/financeiro?de=&ate=` — receitas (vendas), parte da loja e dos vendedores, pago aos vendedores (por forma) no período e **a pagar** (todos os pendentes, sem filtro de período).
- `GET /api/lojas/{loja_id}/repasses?status=&de=&ate=` — despesas como extrato, do mais recente ao mais antigo pela `data_referencia` (data do pagamento; para os pendentes, data da venda).
- `POST /api/repasses/{id}/pagamento` `{forma_pagamento}` — paga o vendedor.

A Área da loja tem um **menu lateral** (navigation drawer M3: abre pelo ☰ no celular, fixo à esquerda em telas a partir de 1200 px) com **Início** (resumo financeiro, tela inicial do operador), **Produtos**, **Financeiro › Despesas** (pagar vendedores: A pagar / Pagos / Todos) e **Receitas**, **Clientes** (cadastro: busca por nome, e-mail ou telefone; novo cliente com telefone; edição de nome e telefone via `PATCH /api/usuarios/{id}`, com token, por operador ativo ou pelo próprio usuário — o e-mail não muda) e **Relatórios** (em breve).

Receitas e Despesas funcionam como **extrato bancário**: lançamentos agrupados por dia (Hoje, Ontem, data), com o total de cada dia. Receitas mostram só a parte da loja; tocar num lançamento abre a divisão vendedor/loja. O período é compartilhado por Início, Receitas e Despesas: Hoje, 7 dias, Este mês, Mês passado, Tudo ou Personalizado (de/até, as duas datas inclusas).

Uso do saldo na loja e saque por PIX pelo cliente ficam para a Fase 8.

Este é um dos pontos centrais do modelo de negócio.

Depois de uma venda, a parcela destinada ao usuário deve gerar um crédito.

Exemplo:

```text
Venda:                 R$ 1.000
Crédito do usuário:    R$   600
Receita da loja:       R$   400
```

A conta corrente deve registrar a movimentação, permitindo posteriormente consultar o saldo e o histórico.

---

### Fase 8 — Crédito / PIX

Depois da conta corrente básica funcionar, implementar as formas de disponibilização do crédito.

Inicialmente:

```text
CRÉDITO DO USUÁRIO
       │
       ├── utilizar na loja
       │
       └── solicitar PIX
```

A regra operacional de quando o PIX pode ser solicitado deve ser definida antes da implementação financeira final.

---

## 8. MVP concluído — definição

Consideraremos o MVP concluído quando for possível executar ponta a ponta o seguinte cenário:

```text
1. Usuário entra no Beeshopper
          ↓
2. Usuário possui/entrega um produto
          ↓
3. Loja recebe o produto
          ↓
4. Operador cadastra o produto
          ↓
5. Operador avalia o produto
          ↓
6. Produto fica disponível
          ↓
7. Outro usuário compra
          ↓
8. Venda é registrada
          ↓
9. Produto fica vendido
          ↓
10. Parcela do vendedor vira crédito
          ↓
11. Usuário consulta seu saldo/histórico
```

O MVP **não precisa inicialmente** ter todos os recursos de um marketplace completo. O foco é provar esse ciclo principal com regras de negócio corretas.

---

## 9. O que não deve ser antecipado

Para manter o MVP enxuto, evitar inicialmente:

- sistema complexo de comissões;
- múltiplos tipos de conta;
- marketplace avançado;
- chat entre usuários;
- avaliações/reviews de compradores;
- logística própria;
- programa de fidelidade;
- BI avançado;
- regras complexas de precificação automática;
- integração financeira completa antes do fluxo de venda estar validado.

Esses recursos podem entrar depois que o ciclo principal estiver funcionando.

---

## 10. Diretrizes para desenvolvimento com Claude ou outras IAs

Este arquivo deve ser utilizado como **contexto funcional do projeto** por qualquer IA que participe do desenvolvimento.

Antes de alterar código, a IA deve:

1. entender o fluxo descrito neste documento;
2. preservar as regras de negócio já definidas;
3. não criar uma entidade “vendedor” separada de usuário;
4. manter operador como usuário vinculado à loja;
5. respeitar que somente operador da própria loja pode operar produtos da loja;
6. manter nomes de domínio, tabelas, campos de resposta e status em português;
7. não introduzir regras financeiras que não estejam definidas;
8. não remover funcionalidades existentes sem justificar;
9. preferir migrations para alterações de banco;
10. manter o Swagger documentado em português;
11. testar o fluxo afetado antes de considerar a etapa concluída.

### Regra de ouro

> **Não implementar complexidade antes de validar o fluxo principal do MVP.**

---

## 11. Próximo passo recomendado

O próximo desenvolvimento deve ser **autenticação real**, conectando a tela de login publicada no GitHub Pages ao backend FastAPI no Render.

Depois disso, seguir nesta ordem:

```text
LOGIN REAL
   ↓
ÁREA AUTENTICADA
   ↓
ENTRADA DE PRODUTO
   ↓
AVALIAÇÃO
   ↓
CATÁLOGO
   ↓
VENDA
   ↓
CONTA CORRENTE
   ↓
CRÉDITO / PIX
   ↓
MVP
```

Este documento deve ser atualizado sempre que uma regra estrutural do produto for alterada ou quando uma etapa importante do MVP for concluída.
