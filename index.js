/*
MIT License
Copyright (c) 2022 Luis Gabriel Araújo

*/

const express = require("express"); // App
const saldoRU = require("saldo-ru-ufc");
const cardapioRU = require("cardapio-ru-ufc-crateus");

// App Configs
const app = express();
const port = 3000;
app.get("/", (req, res) => res.send("<h1>Hello World!</h1>"));
app.listen(port, () =>
  console.log(`Example app listening at http://localhost:${port}`)
);

// Telegraf Modules
const { Markup, Scenes, session, Telegraf } = require("telegraf");
const token = process.env["token"];
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
const mongoServer = process.env["mongoServer"];

mongoose.connect(mongoServer, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

bot.use(session());
bot.use(stage.middleware());

let stopListen;
let messageId;
bot.command("/vincular", async (ctx) => {
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
        // If Video In Cache, Send Quickly

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
});

bot.command("/saldo", async (ctx) => {
  messageUserId = ctx.message.from.id;

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

        ctx.replyWithMarkdown(`*💳 Informações do cartão*

*Titular:* ${finalName}
*Créditos:* ${res.creditos}`);
      });
  } else {
    ctx.replyWithMarkdown(
      `❌ Parece que você ainda não vinculou nenhum cartão à sua conta. Para vincular, digite */vincular*.`
    );
  }
});

bot.command("/cardapio", async (ctx) => {
  sceneCardapio.enter(async (ctx) => {
    ctx
      .replyWithMarkdown(
        `Qual cardápio você deseja checar?`,
        Markup.inlineKeyboard([
          Markup.button.callback("De hoje", "today"),
          Markup.button.callback("Da semana", "week"),
        ])
      )
      .then(({ message_id }) => {
        messageId = message_id;
      });
  });
  //await ctx.scene.enter("cardapio");
  //sceneCardapio.action("today", async (ctx) => {
  //await ctx.answerCbQuery("Carregando cardápio de hoje...");

  var d = new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
  d = new Date(d);
  d = d.getDay();

  if (d == 6 || d == 0 || d == 1) day = "segunda";
  else if (d == 2) day = "terca";
  else if (d == 3) day = "quarta";
  else if (d == 4) day = "quinta";
  else if (d == 5) day = "sexta";

  sceneCardapioChoose.enter(async (ctx) => {
    //await ctx.deleteMessage(messageId);
    ctx
      .replyWithMarkdown(
        `Você deseja checar o cardápio referente à qual refeição?`,
        Markup.inlineKeyboard([
          Markup.button.callback("Almoço", "almoco"),
          Markup.button.callback("Jantar", "jantar"),
        ])
      )
      .then(({ message_id }) => {
        messageId = message_id;
      });
  });
  await ctx.scene.enter("cardapioChoose");

  sceneCardapioChoose.action("almoco", async (ctx) => {
    cardapioRU.cardapio().then(async (res) => {
      let headerDay;

      if (day == "segunda") headerDay = res.cardapio.semana[0];
      if (day == "terca") headerDay = res.cardapio.semana[1];
      if (day == "quarta") headerDay = res.cardapio.semana[2];
      if (day == "quinta") headerDay = res.cardapio.semana[3];
      if (day == "sexta") headerDay = res.cardapio.semana[4];

      await ctx.answerCbQuery("Carregando cardápio do almoço de hoje...");
      await ctx.deleteMessage(messageId);

      header =
        "Cardápio almoço " +
        headerDay +
        "\n\n(*) Contém Leite/Lactose\n(**) Contém Glúten";
      principal = "[Principal]\n" + res.cardapio.almoco[day].principal;
      vegetariano = "[Vegetariano]\n" + res.cardapio.almoco[day].vegetariano;
      salada = "[Salada]\n" + res.cardapio.almoco[day].salada;
      guarnicao = "[Guarnição]\n" + res.cardapio.almoco[day].guarnicao;
      acompanhamento =
        "[Acompanhamento]\n" + res.cardapio.almoco[day].acompanhamento;
      suco = "[Suco]\n" + res.cardapio.almoco[day].suco;
      sobremesa = "[Sobremesa]\n" + res.cardapio.almoco[day].sobremesa;

      await ctx.reply(
        header +
          "\n\n" +
          principal +
          "\n\n" +
          vegetariano +
          "\n\n" +
          salada +
          "\n\n" +
          guarnicao +
          "\n\n" +
          acompanhamento +
          "\n\n" +
          suco +
          "\n\n" +
          sobremesa
      );
    });
  });

  sceneCardapioChoose.action("jantar", async (ctx) => {
    cardapioRU.cardapio().then(async (res) => {
      let headerDay;

      if (day == "segunda") headerDay = res.cardapio.semana[0];
      if (day == "terca") headerDay = res.cardapio.semana[1];
      if (day == "quarta") headerDay = res.cardapio.semana[2];
      if (day == "quinta") headerDay = res.cardapio.semana[3];
      if (day == "sexta") headerDay = res.cardapio.semana[4];

      await ctx.answerCbQuery("Carregando cardápio do jantar de hoje...");
      await ctx.deleteMessage(messageId);

      header =
        "Cardápio jantar " +
        headerDay +
        "\n\n(*) Contém Leite/Lactose\n(**) Contém Glúten";
      principal = "[Principal]\n" + res.cardapio.jantar[day].principal;
      vegetariano = "[Vegetariano]\n" + res.cardapio.jantar[day].vegetariano;
      salada = "[Salada]\n" + res.cardapio.jantar[day].salada;
      guarnicao = "[Guarnição]\n" + res.cardapio.jantar[day].guarnicao;
      acompanhamento =
        "[Acompanhamento]\n" + res.cardapio.jantar[day].acompanhamento;
      suco = "[Suco]\n" + res.cardapio.jantar[day].suco;
      sobremesa = "[Sobremesa]\n" + res.cardapio.jantar[day].sobremesa;

      await ctx.reply(
        header +
          "\n\n" +
          principal +
          "\n\n" +
          vegetariano +
          "\n\n" +
          salada +
          "\n\n" +
          guarnicao +
          "\n\n" +
          acompanhamento +
          "\n\n" +
          suco +
          "\n\n" +
          sobremesa
      );
    });
  });
  //});

  //sceneCardapio.action("week", async (ctx) => {

  //await ctx.answerCbQuery("Vínculo cancelado!");
  //await ctx.deleteMessage(messageId);
  // await ctx.replyWithMarkdown(`*❌ Vínculo cancelado pelo usuário.*`);
  //});
});

bot.start((ctx) =>
  ctx.replyWithMarkdown(
    `🤖 Olá! Eu posso consultar o seu saldo do *cartão do RU* da *Universidade Federal do Ceará*, que utiliza o sistema *SIPAC* e também posso checar o cardápio para você.
Para iniciar a configuração, digite */vincular* e vincule o seu cartão.

*Obs: O bot não possui nenhum vínculo com a Universidade Federal do Ceará.*`
  )
);

bot.help((ctx) => {
  ctx.replyWithMarkdown(
    `*📃 Os comandos disponíveis são:*

*/vincular* - Vincular cartão e matrícula à sua conta do *Telegram*.
*/saldo* - Consultar o saldo do seu cartão.
*/cardapio* - Checar o cardápio do RU.

Fui desenvolvido por @luisgbr1el.
  
*Versão 1.1.0*`
  );
});

bot.launch();

if (bot.launch) {
  console.log("Bot online!");
}
