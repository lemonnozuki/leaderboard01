const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { emoji, ownerId } = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('whyimstandhere')
    .setDescription('Why are you standing here?'),

  async execute(interaction) {
    const e = emoji;

    if (interaction.user.id === ownerId) {
      return interaction.reply({
        content: `${e.success} You're the owner, you can stand wherever you want.`,
        flags: MessageFlags.Ephemeral
      });
    }

    try {
      const member = await interaction.guild.members.fetch(interaction.user.id);
      await interaction.reply({
        content: `${e.remove} Why are you standing here?`,
        flags: MessageFlags.Ephemeral
      });
      await member.kick('Why are you standing here?');
    } catch {
      return interaction.reply({
        content: `${e.error} Failed to kick. Missing permissions.`,
        flags: MessageFlags.Ephemeral
      });
    }
  }
};