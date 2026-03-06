const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../database');
const { emoji, ownerId } = require('../config');
const { handleError } = require('../utils/error');

const getT = (guildId) => {
  const lang = db.getGuildLang(guildId);
  return require(`../locales/${lang}`);
};

const fmt = (n) => Number.isInteger(n) ? n : parseFloat(n.toFixed(2));

const ephemeral = { flags: MessageFlags.Ephemeral };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lb')
    .setDescription('Manage leaderboards')
    .addSubcommand(sub => sub
      .setName('create')
      .setDescription('Create a new leaderboard')
      .addStringOption(opt => opt.setName('name').setDescription('Leaderboard name').setRequired(true))
      .addStringOption(opt => opt.setName('description').setDescription('Description').setRequired(false))
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
      .addIntegerOption(opt => opt.setName('top').setDescription('How many entries (default 10)').setMinValue(1).setMaxValue(25))
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
      .setDescription('Set a user score')
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
    )
    .addSubcommand(sub => sub
      .setName('lang')
      .setDescription('Set bot language for this server')
      .addStringOption(opt => opt
        .setName('language')
        .setDescription('Language')
        .setRequired(true)
        .addChoices(
          { name: 'Tieng Viet', value: 'vi' },
          { name: 'English', value: 'en' }
        )
      )
    )
    .addSubcommand(sub => sub
      .setName('report')
      .setDescription('Report a bug or issue to the bot owner')
      .addStringOption(opt => opt.setName('description').setDescription('Describe the issue').setRequired(true))
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
    const t = getT(guildId);
    const e = emoji;

    const requireBoard = (name) => {
      const board = db.getBoard(guildId, name);
      if (!board) {
        interaction.reply({ content: t.board_not_found(e, name), ...ephemeral });
        return null;
      }
      return board;
    };

    try {
      if (sub === 'lang') {
        const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.ManageGuild);
        if (!isAdmin) {
          return interaction.reply({ content: t.lang_no_perm(e), ...ephemeral });
        }
        const lang = interaction.options.getString('language');
        db.setGuildLang(guildId, lang);
        const newT = require(`../locales/${lang}`);
        return interaction.reply({ content: newT.lang_changed(e, lang), ...ephemeral });
      }

      if (sub === 'report') {
        const description = interaction.options.getString('description');

        if (!ownerId) {
          return interaction.reply({ content: t.report_no_channel(e), ...ephemeral });
        }

        const embed = new EmbedBuilder()
          .setColor(0xff4444)
          .setTitle(t.report_embed_title)
          .addFields(
            { name: t.report_embed_from, value: `${interaction.user.tag} (${interaction.user.id})`, inline: true },
            { name: t.report_embed_server, value: `${interaction.guild.name} (${interaction.guild.id})`, inline: true },
            { name: t.report_embed_desc, value: description }
          )
          .setTimestamp();

        try {
          const owner = await interaction.client.users.fetch(ownerId);
          await owner.send({ embeds: [embed] });
          return interaction.reply({ content: t.report_sent(e), ...ephemeral });
        } catch {
          return interaction.reply({ content: t.report_no_channel(e), ...ephemeral });
        }
      }

      if (sub === 'create') {
        const name = interaction.options.getString('name');
        const description = interaction.options.getString('description') || null;

        if (name.length > 32) {
          return interaction.reply({ content: t.board_name_too_long(e), ...ephemeral });
        }

        try {
          db.createBoard(guildId, name, description, interaction.user.id);
          const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle(t.embed_created_title)
            .addFields(
              { name: t.embed_field_name, value: name.toLowerCase(), inline: true },
              { name: t.embed_field_desc, value: description || t.embed_field_none, inline: true }
            )
            .setFooter({ text: t.embed_footer_created(interaction.user.tag) })
            .setTimestamp();
          return interaction.reply({ embeds: [embed], ...ephemeral });
        } catch {
          return interaction.reply({ content: t.board_exists(e, name), ...ephemeral });
        }
      }

      if (sub === 'delete') {
        const name = interaction.options.getString('name');
        const board = requireBoard(name);
        if (!board) return;

        const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.ManageGuild);
        if (board.created_by !== interaction.user.id && !isAdmin) {
          return interaction.reply({ content: t.board_delete_no_perm(e), ...ephemeral });
        }

        db.deleteBoard(guildId, name);
        return interaction.reply({ content: t.board_deleted(e, name), ...ephemeral });
      }

      if (sub === 'list') {
        const boards = db.listBoards(guildId);
        if (!boards.length) {
          return interaction.reply({ content: t.board_no_list(e), ...ephemeral });
        }

        const embed = new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle(t.embed_list_title)
          .setDescription(boards.map((b, i) => `**${i + 1}.** ${b.name}${b.description ? ` - ${b.description}` : ''}`).join('\n'))
          .setFooter({ text: t.embed_list_footer(boards.length) })
          .setTimestamp();
        return interaction.reply({ embeds: [embed], ...ephemeral });
      }

      if (sub === 'view') {
        const name = interaction.options.getString('name');
        const top = interaction.options.getInteger('top') || 10;
        const board = requireBoard(name);
        if (!board) return;

        await interaction.deferReply();

        const entries = db.getTop(board.id, top);
        if (!entries.length) {
          return interaction.editReply(t.board_empty(e, name));
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
          content: t.score_added(e, amount, user, name, fmt(result.score), result.rank),
          ...ephemeral
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
          content: t.score_set(e, user, fmt(score), name, result.rank),
          ...ephemeral
        });
      }

      if (sub === 'remove') {
        const name = interaction.options.getString('name');
        const user = interaction.options.getUser('user');
        const board = requireBoard(name);
        if (!board) return;

        db.removeEntry(board.id, user.id);
        return interaction.reply({ content: t.score_removed(e, user, name), ...ephemeral });
      }

      if (sub === 'rank') {
        const name = interaction.options.getString('name');
        const target = interaction.options.getUser('user') || interaction.user;
        const board = requireBoard(name);
        if (!board) return;

        const result = db.getUserRank(board.id, target.id);
        if (!result) {
          return interaction.reply({ content: t.score_no_entry(e, target, name), ...ephemeral });
        }

        return interaction.reply({
          content: t.rank_display(e, target.username, name, result.rank, fmt(result.score)),
          ...ephemeral
        });
      }
    } catch (err) {
      await handleError(interaction, err, t);
    }
  }
};