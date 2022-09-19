# RU UFC Telegram Bot


[![GitHub issues](https://img.shields.io/github/issues/luisgbr1el/kelle-telegram?style=flat-square)](https://github.com/luisgbr1el/saldo-ru-ufc-telegram/issues)
[![GitHub forks](https://img.shields.io/github/forks/luisgbr1el/kelle-telegram?style=flat-square)](https://github.com/luisgbr1el/saldo-ru-ufc-telegram/network)
[![GitHub stars](https://img.shields.io/github/stars/luisgbr1el/kelle-telegram?style=flat-square)](https://github.com/luisgbr1el/saldo-ru-ufc-telegram/stargazers)
[![GitHub license](https://img.shields.io/github/license/luisgbr1el/kelle-telegram?style=flat-square)](https://github.com/luisgbr1el/saldo-ru-ufc-telegram/blob/main/LICENSE)

Um simples bot para o Telegram que checa o saldo do cartão e cardápio do Restaurante Universitário da Universidade Federal do Ceará.

[Clique aqui](https://t.me/SaldoRuUFCBot) para utilizá-lo.

## Comandos
|Comando|Descrição|
|--|--|
|`/help`|Ver o guia de comandos e informações.|
|`/vincular`|Vincular sua conta do Telegram ao seu cartão.|
|`/saldo`|Consultar seu saldo do cartão.|

# Compilar
Para compilar o bot em seu PC, comece **baixando** ou **clonando** [esse repositório](https://github.com/luisgbr1el/ru-ufc-bot).
### 1. Clonando repositório
Para clonar esse repositório utilizando o **Git**, digite em seu console:
```
git clone https://github.com/luisgbr1el/ru-ufc-bot.git
```

### 2. Instalando packages
Para fazer o bot funcionar, você precisa instalar todas as **packages** que foram utilizadas no projeto. Para fazer isso, entre na pasta do projeto pelo **console** e digite:
```
npm install
```
Isso instalará todos os pacotes necessários.

### 3. Inserindo seu token
Para que o bot seja iniciado, você precisa inserir seu *token* no código.

**Obs:** Você consegue um criando um bot com o [BotFather](https://t.me/BotFather), no próprio Telegram.

Depois de copiar seu *token*, vá até essa linha do código em `index.js`:
```
const token = process.env['token'];
```
E substitua `process.env['token']` pelo seu *token*, entre aspas. Afinal, é uma *String*.

### 4. Rodar o bot
Finalmente, vá até o **console** e digite:
```
node index.js
```

# Contribua
Você pode contribuir com o repositório solicitando um **Pull Request**.
