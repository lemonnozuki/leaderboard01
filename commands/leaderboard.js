const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../database');
const { emoji } = require('../config');
const { handleError } = require('../utils/error');

const fmt = (n) => Number.isInteger(n) ? n : parseFloat(n.toFixed(2));
const ep = { flags: MessageFlags.Ephemeral };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lb')
    .setDescription('Manage leaderboards')
    .addSubcommand(sub => sub
      .setName('create')
      .setDescription('Create a new leaderboard')
      .addStringOption(opt => opt.setName('name').setDescription('Leaderboard name').setRequired(true))
      .addStringOption(opt => opt.setName('description').setDescription('Description'))
    )
    .addSubcommand(sub => sub
      .setName('delete')
      .setDescription('Delete a leaderboard')
      .addStringOption(opt => opt.setName('name').setDescription('Leaderboard name').setRequired(true).setAutocomplete(true))
    )
    .addSubcommand(sub => sub
      .setName('list')
      .setDescription('List all leaderboards')
    )
    .addSubcommand(sub => sub
      .setName('view')
      .setDescription('View a leaderboard')
      .addStringOption(opt => opt.setName('name').setDescription('Leaderboard name').setRequired(true).setAutocomplete(true))
      .addIntegerOption(opt => opt.setName('top').setDescription('How many entries to show (default 10)').setMinValue(1).setMaxValue(25))
    )
    .addSubcommand(sub => sub
      .setName('add')
      .setDescription('Add points to a user')
      .addStringOption(opt => opt.setName('name').setDescription('Leaderboard name').setRequired(true).setAutocomplete(true))
      .addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true))
      .addNumberOption(opt => opt.setName('amount').setDescription('Points to add').setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName('set')
      .setDescription('Set a user\'s score')
      .addStringOption(opt => opt.setName('name').setDescription('Leaderboard name').setRequired(true).setAutocomplete(true))
      .addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true))
      .addNumberOption(opt => opt.setName('score').setDescription('New score').setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName('remove')
      .setDescription('Remove a user from a leaderboard')
      .addStringOption(opt => opt.setName('name').setDescription('Leaderboard name').setRequired(true).setAutocomplete(true))
      .addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName('rank')
      .setDescription('Check rank of yourself or another user')
      .addStringOption(opt => opt.setName('name').setDescription('Leaderboard name').setRequired(true).setAutocomplete(true))
      .addUserOption(opt => opt.setName('user').setDescription('User (leave empty = yourself)'))
    ),

  async autocomplete(interaction) {
    try {
      const boards = db.listBoards(interaction.guildId);
      const focused = interaction.options.getFocused().toLowerCase();
      const filtered = boards
        .filter(b => b.name.includes(focused))
        .slice(0, 25)
        .map(b => ({ name: b.name, value: b.name }));
      await interaction.respond(filtered);
    } catch {
      await interaction.respond([]);
    }
  },

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    const e = emoji;

    const requireBoard = (name) => {
      const board = db.getBoard(guildId, name);
      if (!board) {
        interaction.reply({ content: `${e.error} Leaderboard **${name}** not found.`, ...ep });
        return null;
      }
      return board;
    };

    try {
      if (sub === 'create') {
        const name = interaction.options.getString('name');
        const description = interaction.options.getString('description') || null;

        if (name.length > 32) {
          return interaction.reply({ content: `${e.error} Leaderboard name must be 32 characters or less.`, ...ep });
        }

        try {
          db.createBoard(guildId, name, description, interaction.user.id);
          const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('Leaderboard Created')
            .addFields(
              { name: 'Name', value: name.toLowerCase(), inline: true },
              { name: 'Description', value: description || 'None', inline: true }
            )
            .setFooter({ text: `Created by ${interaction.user.tag}` })
            .setTimestamp();
          return interaction.reply({ embeds: [embed], ...ep });
        } catch {
          return interaction.reply({ content: `${e.error} Leaderboard **${name}** already exists.`, ...ep });
        }
      }

      if (sub === 'delete') {
        const name = interaction.options.getString('name');
        const board = requireBoard(name);
        if (!board) return;

        const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.ManageGuild);
        if (board.created_by !== interaction.user.id && !isAdmin) {
          return interaction.reply({ content: `${e.error} Only the creator or an admin can delete this leaderboard.`, ...ep });
        }

        db.deleteBoard(guildId, name);
        return interaction.reply({ content: `${e.remove} Leaderboard **${name}** has been deleted.`, ...ep });
      }

      if (sub === 'list') {
        const boards = db.listBoards(guildId);
        if (!boards.length) {
          return interaction.reply({ content: `${e.list} This server has no leaderboards.`, ...ep });
        }

        const embed = new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle('Leaderboard List')
          .setDescription(boards.map((b, i) => `**${i + 1}.** ${b.name}${b.description ? ` — ${b.description}` : ''}`).join('\n'))
          .setFooter({ text: `${boards.length} leaderboard(s)` })
          .setTimestamp();
        return interaction.reply({ embeds: [embed], ...ep });
      }

      if (sub === 'view') {
        const name = interaction.options.getString('name');
        const top = interaction.options.getInteger('top') || 10;
        const board = requireBoard(name);
        if (!board) return;

        await interaction.deferReply();

        const entries = db.getTop(board.id, top);
        if (!entries.length) {
          return interaction.editReply(`${e.board} Leaderboard **${name}** has no entries.`);
        }

        const lines = await Promise.all(entries.map(async (entry, i) => {
          let username;
          try {
            const member = await interaction.guild.members.fetch(entry.user_id);
            username = member.displayName;
          } catch {
            username = `<@${entry.user_id}>`;
          }
          return `**${i + 1}.** ${username} — \`${fmt(entry.score)}\``;
        }));

        const embed = new EmbedBuilder()
          .setColor(0xFFD700)
          .setTitle(board.name.toUpperCase())
          .setDescription(lines.join('\n'))
          .setFooter({ text: board.description || `Top ${top}` })
          .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
      }

      if (sub === 'add') {
        const name = interaction.options.getString('name');
        const user = interaction.options.getUser('user');
        const amount = interaction.options.getNumber('amount');
        const board = requireBoard(name);
        if (!board) return;

        db.addScore(board.id, user.id, amount);
        const result = db.getUserRank(board.id, user.id);

        return interaction.reply({
          content: `${e.add} Added **${amount}** points to ${user} in **${name}**\n${e.score} Score: \`${fmt(result.score)}\` ${e.rank} Rank: **#${result.rank}**`,
          ...ep
        });
      }

      if (sub === 'set') {
        const name = interaction.options.getString('name');
        const user = interaction.options.getUser('user');
        const score = interaction.options.getNumber('score');
        const board = requireBoard(name);
        if (!board) return;

        db.setScore(board.id, user.id, score);
        const result = db.getUserRank(board.id, user.id);

        return interaction.reply({
          content: `${e.success} Set score of ${user} to \`${fmt(score)}\` in **${name}** ${e.rank} Rank: **#${result.rank}**`,
          ...ep
        });
      }

      if (sub === 'remove') {
        const name = interaction.options.getString('name');
        const user = interaction.options.getUser('user');
        const board = requireBoard(name);
        if (!board) return;

        db.removeEntry(board.id, user.id);
        return interaction.reply({ content: `${e.remove} Removed ${user} from leaderboard **${name}**.`, ...ep });
      }

      if (sub === 'rank') {
        const name = interaction.options.getString('name');
        const target = interaction.options.getUser('user') || interaction.user;
        const board = requireBoard(name);
        if (!board) return;

        const result = db.getUserRank(board.id, target.id);
        if (!result) {
          return interaction.reply({ content: `${e.error} ${target} has no score in **${name}**.`, ...ep });
        }

        return interaction.reply({
          content: `${e.rank} **${target.username}** in **${name}**: Rank **#${result.rank}** with \`${fmt(result.score)}\` points`,
          ...ep
        });
      }
    } catch (err) {
      await handleError(interaction, err);
    }
  }
};