const { Client, GatewayIntentBits, Partials, Events, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel]
});

const ID_CANAL_CONFESIONES = '1384660456584642600';
const ID_CANAL_PENDIENTES = '1398174599082147882';
const ID_CANAL_LOGS = '1398192843666755646';
const ID_BOT = '1398436221784559748';

client.once(Events.ClientReady, () => {
  console.log(`✅ Bot listo como ${client.user.tag}`);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  if (message.content === '!confesar') {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('abrir_confesion')
        .setLabel('Haz clic aquí para confesar anónimamente')
        .setStyle(ButtonStyle.Primary)
    );
    await message.reply({ content: '¡Ey! ¿Quieres confesar algo de forma anónima?', components: [row] });
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isButton() && interaction.customId === 'abrir_confesion') {
    const modal = new ModalBuilder()
      .setCustomId('modal_confesion')
      .setTitle('Confesión Anónima');

    const input = new TextInputBuilder()
      .setCustomId('contenido_confesion')
      .setLabel('Escribe tu confesión:')
      .setStyle(TextInputStyle.Paragraph)
      .setMaxLength(1000)
      .setRequired(true);

    const row = new ActionRowBuilder().addComponents(input);
    modal.addComponents(row);
    await interaction.showModal(modal);
  }

  if (interaction.isModalSubmit() && interaction.customId === 'modal_confesion') {
    const contenido = interaction.fields.getTextInputValue('contenido_confesion');
    const canalPendientes = await client.channels.fetch(ID_CANAL_PENDIENTES);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('aceptar_confesion').setLabel('✅ Aceptar').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('rechazar_confesion').setLabel('❌ Rechazar').setStyle(ButtonStyle.Danger)
    );

    const embed = {
      title: '📥 Nueva confesión pendiente',
      description: contenido,
      color: 0xFFD700
    };

    const mensaje = await canalPendientes.send({ embeds: [embed], components: [row] });

    mensaje.confesionData = {
      autor: interaction.user.id,
      contenido: contenido
    };

    await interaction.reply({ content: '✅ Tu confesión fue enviada de forma anónima para revisión.', ephemeral: true });

    client.cache = client.cache || {};
    client.cache[mensaje.id] = {
      autor: interaction.user.id,
      contenido: contenido
    };
  }

  if (interaction.isButton() && ['aceptar_confesion', 'rechazar_confesion'].includes(interaction.customId)) {
    const decision = interaction.customId === 'aceptar_confesion' ? 'aceptada' : 'rechazada';
    const mensajeOriginal = interaction.message;

    const datos = client.cache?.[mensajeOriginal.id];

    if (!datos) {
      await interaction.reply({ content: '❌ No se pudo encontrar la confesión original.', ephemeral: true });
      return;
    }

    const { autor, contenido } = datos;
    const canalConfesiones = await client.channels.fetch(ID_CANAL_CONFESIONES);
    const canalLogs = await client.channels.fetch(ID_CANAL_LOGS);

    if (decision === 'aceptada') {
      const embedConfesion = {
        title: '📣 Nueva confesión anónima',
        description: contenido,
        color: 0x00FFAA
      };
      await canalConfesiones.send({ embeds: [embedConfesion] });
    }

    const embedLog = {
      title: `📋 Confesión ${decision.toUpperCase()}`,
      fields: [
        { name: 'Contenido', value: contenido },
        { name: 'Autor original', value: `<@${autor}>` },
        { name: 'Moderador que decidió', value: `<@${interaction.user.id}>` }
      ],
      color: decision === 'aceptada' ? 0x00FF00 : 0xFF0000
    };

    await canalLogs.send({ embeds: [embedLog] });

    await interaction.update({ content: `Confesión ${decision} por <@${interaction.user.id}>`, components: [], embeds: interaction.message.embeds });
  }
});

client.login(process.env.TOKEN);
