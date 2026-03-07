const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../database');
const { emoji } = require('../config');

const ep = { flags: MessageFlags.Ephemeral };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('noti')
    .setDescription('Manage notifications')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)

    // yt
    .addSubcommandGroup(group => group
      .setName('yt')
      .setDescription('YouTube notifications')
      .addSubcommand(sub => sub
        .setName('add')
        .setDescription('Add a YouTube channel to track')
        .addStringOption(opt => opt.setName('channel_url').setDescription('YouTube channel URL or ID').setRequired(true))
        .addChannelOption(opt => opt.setName('discord_channel').setDescription('Channel to send notifications').setRequired(true))
        .addIntegerOption(opt => opt.setName('interval').setDescription('Check interval in minutes (default 10)').setMinValue(5).setMaxValue(1440))
      )
      .addSubcommand(sub => sub
        .setName('remove')
        .setDescription('Remove a YouTube notification')
        .addStringOption(opt => opt.setName('channel_id').setDescription('YouTube channel ID').setRequired(true))
      )
      .addSubcommand(sub => sub
        .setName('list')
        .setDescription('List all YouTube notifications')
      )
    )

    // twch
    .addSubcommandGroup(group => group
      .setName('twitch')
      .setDescription('Twitch notifications')
      .addSubcommand(sub => sub
        .setName('add')
        .setDescription('Add a Twitch channel to track')
        .addStringOption(opt => opt.setName('username').setDescription('Twitch username').setRequired(true))
        .addChannelOption(opt => opt.setName('discord_channel').setDescription('Channel to send notifications').setRequired(true))
        .addIntegerOption(opt => opt.setName('interval').setDescription('Check interval in minutes (default 2)').setMinValue(1).setMaxValue(60))
      )
      .addSubcommand(sub => sub
        .setName('remove')
        .setDescription('Remove a Twitch notification')
        .addStringOption(opt => opt.setName('username').setDescription('Twitch username').setRequired(true))
      )
      .addSubcommand(sub => sub
        .setName('list')
        .setDescription('List all Twitch notifications')
      )
    ),

  async execute(interaction) {
    const group = interaction.options.getSubcommandGroup();
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    const e = emoji;

    if (group === 'yt') {
      if (sub === 'add') {
        const input = interaction.options.getString('channel_url');
        const discordChannel = interaction.options.getChannel('discord_channel');
        const interval = interaction.options.getInteger('interval') || 10;

        await interaction.deferReply({ ...ep });

        try {
          const ytChannelId = await resolveYoutubeChannelId(input);
          if (!ytChannelId) {
            return interaction.editReply(`${e.error} Could not find YouTube channel. Make sure the URL or ID is correct.`);
          }

          const info = await fetchYoutubeChannelInfo(ytChannelId);
          db.addYoutubeNoti(guildId, discordChannel.id, ytChannelId, info.name, interval);

          return interaction.editReply(`${e.success} Now tracking **${info.name}** — notifications will be sent to ${discordChannel} every **${interval}** minutes.`);
        } catch (err) {
          return interaction.editReply(`${e.error} Failed to add YouTube notification: ${err.message}`);
        }
      }

      if (sub === 'remove') {
        const ytChannelId = interaction.options.getString('channel_id');
        db.removeYoutubeNoti(guildId, ytChannelId);
        return interaction.reply({ content: `${e.remove} Removed YouTube notification for \`${ytChannelId}\`.`, ...ep });
      }

      if (sub === 'list') {
        const notis = db.listYoutubeNoti(guildId);
        if (!notis.length) return interaction.reply({ content: `${e.list} No YouTube notifications set up.`, ...ep });

        const embed = new EmbedBuilder()
          .setColor(0xff0000)
          .setTitle('YouTube Notifications')
          .setDescription(notis.map((n, i) => `**${i + 1}.** [${n.yt_channel_name}](https://youtube.com/channel/${n.yt_channel_id}) → <#${n.channel_id}> every **${n.interval_minutes}m**`).join('\n'))
          .setTimestamp();

        return interaction.reply({ embeds: [embed], ...ep });
      }
    }

    if (group === 'twitch') {
      if (sub === 'add') {
        const username = interaction.options.getString('username').toLowerCase();
        const discordChannel = interaction.options.getChannel('discord_channel');
        const interval = interaction.options.getInteger('interval') || 2;

        db.addTwitchNoti(guildId, discordChannel.id, username, interval);
        return interaction.reply({ content: `${e.success} Now tracking **${username}** on Twitch — notifications will be sent to ${discordChannel} every **${interval}** minutes.`, ...ep });
      }

      if (sub === 'remove') {
        const username = interaction.options.getString('username').toLowerCase();
        db.removeTwitchNoti(guildId, username);
        return interaction.reply({ content: `${e.remove} Removed Twitch notification for **${username}**.`, ...ep });
      }

      if (sub === 'list') {
        const notis = db.listTwitchNoti(guildId);
        if (!notis.length) return interaction.reply({ content: `${e.list} No Twitch notifications set up.`, ...ep });

        const embed = new EmbedBuilder()
          .setColor(0x9146ff)
          .setTitle('Twitch Notifications')
          .setDescription(notis.map((n, i) => `**${i + 1}.** [${n.twitch_username}](https://twitch.tv/${n.twitch_username}) → <#${n.channel_id}> every **${n.interval_minutes}m** ${n.is_live ? '🔴 LIVE' : ''}`).join('\n'))
          .setTimestamp();

        return interaction.reply({ embeds: [embed], ...ep });
      }
    }
  }
};

async function resolveYoutubeChannelId(input) {
  const apiKey = process.env.YOUTUBE_API_KEY;

  // if its already a channel ID (starts with UC)
  if (input.startsWith('UC')) return input;

  // extract from URL
  const handleMatch = input.match(/youtube\.com\/@([\w-]+)/);
  const channelMatch = input.match(/youtube\.com\/channel\/([\w-]+)/);

  if (channelMatch) return channelMatch[1];

  if (handleMatch) {
    const handle = handleMatch[1];
    const res = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${handle}&key=${apiKey}`);
    const data = await res.json();
    return data.items?.[0]?.id || null;
  }

  const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(input)}&maxResults=1&key=${apiKey}`);
  const data = await res.json();
  return data.items?.[0]?.id?.channelId || null;
}

async function fetchYoutubeChannelInfo(channelId) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const res = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelId}&key=${apiKey}`);
  const data = await res.json();
  const channel = data.items?.[0];
  return { name: channel?.snippet?.title || channelId };
}