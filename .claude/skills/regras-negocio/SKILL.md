---
name: regras-negocio
description: Guardião do domínio do Breshopper (consignação de produtos usados com conta corrente de créditos). Use antes de criar ou alterar qualquer funcionalidade, entidade, status, endpoint ou tela que envolva usuários, lojas, operadores, produtos, avaliações, vendas, crédito, saldo ou PIX — e sempre que houver dúvida sobre o que o MVP deve ou não fazer.
---

# Regras de negócio — Breshopper

A fonte de verdade do produto é o arquivo `BRESHOPPER.md` na raiz. **Leia-o antes de propor qualquer mudança** e trate esta skill como o resumo operacional dele. Se o código e o `BRESHOPPER.md` divergirem, aponte a divergência em vez de escolher um lado em silêncio.

## O produto em uma frase

Uma pessoa entrega um produto usado a uma **loja parceira**; um **operador** da loja cadastra e **avalia** o produto, definindo o preço de venda e a divisão entre usuário e loja; quando outro usuário **compra**, a parte do vendedor vira **crédito** na conta corrente dele (usável na loja ou sacável via PIX).

## Glossário (use exatamente estes termos)

| Termo | Significado | Tabela |
|---|---|---|
| Usuário | Qualquer pessoa. O mesmo usuário compra, vende e recebe crédito. | `usuarios` |
| Loja | Estabelecimento parceiro que recebe, avalia e vende produtos. | `lojas` |
| Operador | Usuário vinculado a uma loja, perfil `OPERADOR` ou `ADMINISTRADOR`, que age em nome dela. | `operadores` |
| Produto | Item do usuário vendedor sob responsabilidade de uma loja. | `produtos` |
| Categoria / Marca | Cadastros independentes referenciados pelo produto por ID. | `categorias` / `marcas` |
| Avaliação | Preço de venda e divisão usuário/loja definidos pelo operador. Uma por produto. | `avaliacoes` |
| Venda | *(a criar)* Compra de um produto disponível por um usuário. | — |
| Conta corrente | *(a criar)* Movimentações de crédito do usuário. | — |

## Regras invioláveis

1. **Não existe entidade "vendedor"** — o vendedor é um `usuario` (campo `usuario_vendedor_id` no produto).
2. **Operador pertence a uma loja** e só opera produtos **da própria loja**, e somente se estiver `ATIVO`.
   - **Venda:** registrada pelo operador ativo da loja (`POST /api/vendas`) para um comprador ativo que não é o vendedor nem operador; valores copiados da avaliação; uma venda por produto.
   - **Repasse e carteira:** a venda gera, na mesma transação, um repasse `PENDENTE` de `valor_usuario` (despesa da loja, tabela `repasses`). A loja paga uma vez, por `PIX`, `CARTAO` ou `CREDITO_LOJA`; **só `CREDITO_LOJA` credita a carteira** (`movimentacoes`). Uso do saldo e saque PIX pelo cliente ainda não existem (Fase 8) — não invente regras.
   - **Login vira operador:** com `LOJA_OPERADOR_AUTOMATICO` (padrão 1), todo login com Google cria o vínculo `OPERADOR` ativo nessa loja, se ainda não existir; vínculo existente (inclusive `INATIVO`) não muda.
   - **Operador não vende nem compra.** Um operador ativo nunca é `usuario_vendedor_id` de produto (a API retorna 400) e, no app, vê só a Área da loja — sem saldo e sem comprar/vender.
3. **Produto exige categoria e marca por ID** (cadastros próprios, não texto livre).
4. **Uma avaliação por produto** (restrição única `uq_avaliacoes_produto`).
5. **A divisão fecha exatamente:** `valor_usuario + valor_loja == valor_venda`, sem tolerância. Valores monetários são `Decimal`/`Numeric(12,2)` — **nunca `float`**.
6. **Domínio em português:** nomes de tabelas, colunas, campos JSON, status e mensagens de erro.
7. **O usuário não torna o próprio produto disponível** — quem controla essa etapa é o operador da loja, via avaliação.
8. **Nenhuma regra financeira inventada:** comissões, prazos de saque, taxas e regras de PIX só entram quando definidas no `BRESHOPPER.md`. Se faltar definição, pergunte.

## Ciclo de vida

```
Produto:    RECEBIDO ──(avaliação APROVADA pelo operador da loja)──► DISPONIVEL ──(venda)──► VENDIDO
                └───────────────────────────────► CANCELADO
Operador / Usuário / Loja / Categoria / Marca:  ATIVO ⇄ INATIVO
Venda:      CONCLUIDA (registrada pelo operador da loja; produto passa a VENDIDO)
Repasse (loja → vendedor):  PENDENTE ──(pagamento: PIX | CARTAO | CREDITO_LOJA)──► PAGO
Movimentação (carteira):  CREDITO quando o repasse é pago em CREDITO_LOJA, status CONCLUIDA; saldo = créditos − débitos
Status já previstos no domínio:  PENDENTE, APROVADA, CONCLUIDA (crédito — a especificar)
```

Transições fora deste diagrama precisam ser definidas no `BRESHOPPER.md` antes de implementadas.

## Fluxo-alvo do MVP (definição de pronto)

1. usuário entra → 2. entrega produto → 3. loja recebe → 4. operador cadastra (`RECEBIDO`) → 5. operador avalia → 6. produto `DISPONIVEL` → 7. outro usuário compra → 8. venda registrada → 9. produto `VENDIDO` → 10. parcela do vendedor vira crédito → 11. usuário consulta saldo/histórico.

Ordem de construção recomendada: **login real → área autenticada → entrada de produto → avaliação → catálogo → venda → conta corrente → crédito/PIX**.

## Fora do escopo do MVP (não antecipar)

Comissões complexas, múltiplos tipos de conta, marketplace avançado, chat, reviews de compradores, logística própria, fidelidade, BI, precificação automática, integração financeira completa antes do fluxo de venda validado.

> **Regra de ouro:** não implementar complexidade antes de validar o fluxo principal do MVP.

## Como usar esta skill

- Antes de implementar: confirme em qual etapa do fluxo a mudança se encaixa e quais regras acima ela toca.
- Ao revisar: verifique cada regra inviolável; aponte violações com o número da regra.
- Para dinheiro: exija `Decimal`, arredondamento explícito e testes com valores de borda (centavos, soma que não fecha por R$ 0,01).
- Ao concluir uma etapa ou mudar uma regra estrutural: proponha a atualização correspondente no `BRESHOPPER.md`.
