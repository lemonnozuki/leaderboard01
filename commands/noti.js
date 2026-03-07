const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize } = require('discord.js');
const db = require('../database');
const { emoji } = require('../config');

const ep = { flags: MessageFlags.Ephemeral };
const v2 = { flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 };

function makeContainer(accentColor, content) {
  return new ContainerBuilder()
    .setAccentColor(accentColor)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
}

function makeContainerWithList(accentColor, title, items) {
  return new ContainerBuilder()
    .setAccentColor(accentColor)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${title}`))
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(items));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('noti')
    .setDescription('Manage notifications')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
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
            return interaction.editReply({ content: `${e.error} Could not find YouTube channel.` });
          }

          const info = await fetchYoutubeChannelInfo(ytChannelId);
          db.addYoutubeNoti(guildId, discordChannel.id, ytChannelId, info.name, interval);

          const container = new ContainerBuilder()
            .setAccentColor(0xff0000)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${e.success} YouTube Notification Added`))
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
              `<:yt:1479709933179109537> **Channel:** ${info.name}\n<:4214_notify:1479710314147614845> **Notify in:** ${discordChannel}\n⏱ **Interval:** every **${interval}** minutes`
            ));
          return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        } catch (err) {
          return interaction.editReply({ content: `${e.error} Failed: ${err.message}` });
        }
      }

      if (sub === 'remove') {
        const ytChannelId = interaction.options.getString('channel_id');
        db.removeYoutubeNoti(guildId, ytChannelId);
        const container = makeContainer(0xff0000, `${e.remove} Removed YouTube notification for \`${ytChannelId}\`.`);
        return interaction.reply({ components: [container], ...v2 });
      }

      if (sub === 'list') {
        const notis = db.listYoutubeNoti(guildId);
        if (!notis.length) {
          const container = makeContainer(0xff0000, `${e.list} No YouTube notifications set up.`);
          return interaction.reply({ components: [container], ...v2 });
        }

        const items = notis.map((n, i) =>
          `**${i + 1}.** [${n.yt_channel_name}](https://youtube.com/channel/${n.yt_channel_id}) → <#${n.channel_id}> every **${n.interval_minutes}m**`
        ).join('\n');

        const container = makeContainerWithList(0xff0000, '<:yt:1479709933179109537> YouTube Notifications', items);
        return interaction.reply({ components: [container], ...v2 });
      }
    }

    if (group === 'twitch') {
      if (sub === 'add') {
        const username = interaction.options.getString('username').toLowerCase();
        const discordChannel = interaction.options.getChannel('discord_channel');
        const interval = interaction.options.getInteger('interval') || 2;

        db.addTwitchNoti(guildId, discordChannel.id, username, interval);

        const container = new ContainerBuilder()
          .setAccentColor(0x9146ff)
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${e.success} Twitch Notification Added`))
          .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `<:twitch:1479710502044041378> **Channel:** ${username}\n<:4214_notify:1479710314147614845> **Notify in:** ${discordChannel}\n⏱ **Interval:** every **${interval}** minutes`
          ));
        return interaction.reply({ components: [container], ...v2 });
      }

      if (sub === 'remove') {
        const username = interaction.options.getString('username').toLowerCase();
        db.removeTwitchNoti(guildId, username);
        const container = makeContainer(0x9146ff, `${e.remove} Removed Twitch notification for **${username}**.`);
        return interaction.reply({ components: [container], ...v2 });
      }

      if (sub === 'list') {
        const notis = db.listTwitchNoti(guildId);
        if (!notis.length) {
          const container = makeContainer(0x9146ff, `${e.list} No Twitch notifications set up.`);
          return interaction.reply({ components: [container], ...v2 });
        }

        const items = notis.map((n, i) =>
          `**${i + 1}.** [${n.twitch_username}](https://twitch.tv/${n.twitch_username}) → <#${n.channel_id}> every **${n.interval_minutes}m** ${n.is_live ? '🔴 LIVE' : ''}`
        ).join('\n');

        const container = makeContainerWithList(0x9146ff, '🎮 Twitch Notifications', items);
        return interaction.reply({ components: [container], ...v2 });
      }
    }
  }
};

async function resolveYoutubeChannelId(input) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (input.startsWith('UC')) return input;

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