/*
MIT License
Copyright (c) 2022 Luis Gabriel Araújo

*/

const express = require("express"); // App
const saldoRU = require("saldo-ru-ufc");
const dotenv = require('dotenv')
dotenv.config();

// Telegraf Modules
const { Markup, Scenes, session, Telegraf } = require("telegraf");
const token = process.env.TOKEN;
const bot = new Telegraf(token);
const sceneVincular = new Scenes.BaseScene("vinculaCartao");
const sceneCardapio = new Scenes.BaseScene("cardapio");
const sceneCardapioChoose = new Scenes.BaseScene("cardapioChoose");
const stage = new Scenes.Stage([
  sceneVincular,
  sceneCardapio,
  sceneCardapioChoose,
]);

// Conectar com o banco
const mongoose = require("mongoose");
const userSchema = require("./schemas/user");
const https = require("https");
const mongoServer = process.env.MONGO_SERVER;

mongoose.connect(mongoServer);

bot.use(session());
bot.use(stage.middleware());

let stopListen;
let messageId;

const handleVincular = async (ctx) => {
  stopListen = false;

  ctx.replyWithMarkdown(`Certo, agora vincularemos o cartão e matrícula à sua conta do *Telegram*. Para isso, siga os passos abaixo:

*1.* Escreva o número do seu cartão do *RU*;
*2.* Dê espaço;
*3.* Escreva o *número da sua matrícula*;
*4.* Envie a mensagem.

*Exemplo:*
0123456789 123456
`);

  let userInfo = [];

  sceneVincular.enter(async (ctx) => {
    messageText = ctx.message.text;
    arr = messageText.split(" ");
    userId = ctx.message.from.id;

    saldoRU.saldo(arr[0], arr[1]).then(async (res) => {
      userInfo = [userId, parseInt(arr[0]), parseInt(arr[1])];
      if (res.nome) {
        return ctx
          .replyWithMarkdown(
            `Você confirma o vínculo ao cartão no nome de *${res.nome}*?`,
            Markup.inlineKeyboard([
              Markup.button.callback("Sim", "sim"),
              Markup.button.callback("Não", "nao"),
            ])
          )
          .then(({ message_id }) => {
            messageId = message_id;
          });
      } else {
        await ctx.replyWithMarkdown(`*❌ ${res}*`);
      }
    });
  });

  bot.on("text", async (ctx) => {
    if (stopListen == false) {
      await ctx.scene.enter("vinculaCartao");

      sceneVincular.action("sim", async (ctx) => {

        await ctx.answerCbQuery("Vinculando...");

        let usersData = await userSchema
          .find({
            UserId: userInfo[0],
          })
          .exec();

        if (usersData != "") {
          let updateData = await userSchema.findOneAndUpdate(
            {
              UserId: userInfo[0],
            },
            {
              CardNumber: userInfo[1],
              Matricula: userInfo[2],
            },
            {
              returnOriginal: false,
            }
          );
        } else {
          await userSchema.create({
            UserId: userInfo[0],
            CardNumber: userInfo[1],
            Matricula: userInfo[2],
          });
          //newData.save();
        }

        await ctx.deleteMessage(messageId);
        await ctx.replyWithMarkdown(
          "*✅ Cartão vinculado com sucesso!* Digite */saldo* para consultá-lo."
        );
      });

      sceneVincular.action("nao", async (ctx) => {
        await ctx.answerCbQuery("Vínculo cancelado!");
        await ctx.deleteMessage(messageId);
        await ctx.replyWithMarkdown(`*❌ Vínculo cancelado pelo usuário.*`);
      });
    }
    stopListen = true;
  });
};

bot.command("vincular", handleVincular);
bot.hears("⚙️ Vincular cartão", handleVincular);

const handleSaldo = async (ctx) => {
  let messageUserId = ctx.message.from.id;

  let usersData = await userSchema.find({
    UserId: messageUserId,
  });

  if (usersData != "") {
    saldoRU
      .saldo(usersData[0].CardNumber, usersData[0].Matricula)
      .then((res) => {
        name = res.nome.toLowerCase();
        finalName = name.replace(/(^\w{1})|(\s+\w{1})/g, (letter) =>
          letter.toUpperCase()
        );

        ctx.replyWithMarkdown(`*💳 - Informações do cartão*
*Titular:* ${finalName}
*Créditos:* ${res.creditos}

*⏮ - Última operação*
*Data:* ${res.ultimaOperacao.data}
*Tipo:* ${res.ultimaOperacao.tipo}
*Detalhes:* ${res.ultimaOperacao.detalhes}`);
      });
  } else {
    ctx.replyWithMarkdown(
      `❌ Parece que você ainda não vinculou nenhum cartão à sua conta. Para vincular, digite */vincular*.`
    );
  }
};

bot.command("saldo", handleSaldo);
bot.hears("💰 Consultar saldo", handleSaldo);

bot.start((ctx) =>
  ctx.replyWithMarkdown(
    `🤖 Olá! Eu posso consultar o seu saldo do *cartão do RU* da *Universidade Federal do Ceará*, que utiliza o sistema *SIPAC*.
Para iniciar a configuração, digite */vincular* e vincule o seu cartão.

*Obs: O bot não possui nenhum vínculo com a Universidade Federal do Ceará.*`,
    Markup.keyboard([
      ['💰 Consultar saldo'],
      ['❓ Ajuda', '⚙️ Vincular cartão']
    ])
      .resize()
      .persistent()
  )
);

const handleHelp = (ctx) => {
  ctx.replyWithMarkdown(
    `*📃 Os comandos disponíveis são:*

*/vincular* - Vincular cartão e matrícula à sua conta do *Telegram*.
*/saldo* - Consultar o saldo do seu cartão.

Fui desenvolvido por @luisgbr1el.
  
*Versão 1.1.0*`
  );
};

bot.help(handleHelp);
bot.hears("❓ Ajuda", handleHelp);

bot.launch();

if (bot.launch) {
  console.log("Bot online!");
}
