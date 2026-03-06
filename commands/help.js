const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { emoji } = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show all available commands'),

  async execute(interaction) {
    const e = emoji;

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('Leaderboard01 — Help')
      .setDescription('Universal leaderboard bot for Discord.')
      .addFields(
        {
          name: `${e.board} Board Management`,
          value: '`/lb create` — Create a leaderboard\n`/lb delete` — Delete a leaderboard\n`/lb list` — List all boards\n`/lb view` — View a leaderboard'
        },
        {
          name: `${e.score} Score Management`,
          value: '`/lb add` — Add points to a user\n`/lb set` — Set a user\'s score\n`/lb remove` — Remove a user from a board\n`/lb rank` — Check a user\'s rank'
        },
        {
          name: `${e.list} Other`,
          value: '`/lb report` — Report a bug\n`/help` — Show this help'
        }
      )
      .setFooter({ text: 'Leaderboard01 • Made by dev' })
      .setTimestamp();

    return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  }
};