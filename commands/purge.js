const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { emoji } = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Delete a number of messages in this channel')
    .addIntegerOption(opt =>
      opt.setName('amount')
        .setDescription('Number of messages to delete (1-100)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    const e = emoji;
    const amount = interaction.options.getInteger('amount');

    try {
      await interaction.channel.bulkDelete(amount, true);
      return interaction.reply({
        content: `${e.success} Deleted **${amount}** message(s).`,
        flags: MessageFlags.Ephemeral
      });
    } catch {
      return interaction.reply({
        content: `${e.error} Failed to delete messages. Messages older than 14 days cannot be bulk deleted.`,
        flags: MessageFlags.Ephemeral
      });
    }
  }
};