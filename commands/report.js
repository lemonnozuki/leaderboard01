const { SlashCommandBuilder, MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize } = require('discord.js');
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
    const ts = Math.floor(Date.now() / 1000);

    if (!ownerId) {
      return interaction.reply({ content: `${e.error} Report channel is not configured.`, flags: MessageFlags.Ephemeral });
    }

    try {
      const owner = await interaction.client.users.fetch(ownerId);

      const dmContainer = new ContainerBuilder()
        .setAccentColor(0xff4444)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('### <:bug:1479429638735270059> New Bug Report!')
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`<:user:1479429927152652308> **From:** ${interaction.user.tag} \`${interaction.user.id}\`\n<:home:1479430251141398580> **Server:** ${interaction.guild.name} \`${interaction.guild.id}\``)
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`<:description:1479430474387689522> **Description:**\n> ${description}`)
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`-# <:time:1479431034004312104> Received at <t:${ts}:f>`)
        );

      await owner.send({
        components: [dmContainer],
        flags: MessageFlags.IsComponentsV2
      });

      const replyContainer = new ContainerBuilder()
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
          new TextDisplayBuilder().setContent(`-# <:time:1479431034004312104> Sent at <t:${ts}:f>`)
        );

      return interaction.reply({
        components: [replyContainer],
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