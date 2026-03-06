const { SlashCommandBuilder, EmbedBuilder, MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize } = require('discord.js');
const { emoji, ownerId } = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('report')
    .setDescription('Report a bug or issue to the bot owner')
    .addStringOption(opt =>
      opt.setName('description')
        .setDescription('Describe the issue')
        .setRequired(true)
    ),

  async execute(interaction) {
    const e = emoji;
    const description = interaction.options.getString('description');

    if (!ownerId) {
      return interaction.reply({ content: `${e.error} Report channel is not configured.`, flags: MessageFlags.Ephemeral });
    }

    const embed = new EmbedBuilder()
      .setColor(0xff4444)
      .setTitle('<:bug:1479429638735270059> New Bug Report!')
      .addFields(
        { name: '<:user:1479429927152652308> From', value: `${interaction.user.tag}\n\`${interaction.user.id}\``, inline: true },
        { name: '<:home:1479430251141398580> Server', value: `${interaction.guild.name}\n\`${interaction.guild.id}\``, inline: true },
        { name: '<:description:1479430474387689522> Description', value: description }
      )
      .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
      .setTimestamp();

    try {
      const owner = await interaction.client.users.fetch(ownerId);
      await owner.send({ embeds: [embed] });

      const container = new ContainerBuilder()
        .setAccentColor(0x57f287)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`### ${e.success} Report Sent!`)
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`<:description:1479430474387689522> **Your report has been received.**\nThe bot owner will look into it as soon as possible.\n\n> ${description}`)
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`-# <:time:1479431034004312104> Sent at <t:${Math.floor(Date.now() / 1000)}:f>`)
        );

      return interaction.reply({
        components: [container],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
    } catch {
      return interaction.reply({
        content: `${e.error} Failed to send report. Please try again later.`,
        flags: MessageFlags.Ephemeral
      });
    }
  }
};