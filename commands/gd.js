const {
  SlashCommandBuilder, MessageFlags,
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize,
  MediaGalleryBuilder, MediaGalleryItemBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle
} = require('discord.js');
const https = require('https');
const { emoji } = require('../config');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'LeaderBoard.01-Bot' } }, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { reject(new Error('Parse error')); } });
    }).on('error', reject);
  });
}

const DIFF_EMOJI = {
  'Auto': '⚪', 'Easy': '🟢', 'Normal': '🔵', 'Hard': '🟡',
  'Harder': '🟠', 'Insane': '🔴', 'Easy Demon': '😈', 'Medium Demon': '😈',
  'Hard Demon': '😈', 'Insane Demon': '😈', 'Extreme Demon': '💀', 'Demon': '😈', 'N/A': '⬜'
};

function diffEmoji(diff) { return DIFF_EMOJI[diff] || '⬜'; }
function formatNum(n) { if (!n && n !== 0) return 'N/A'; return Number(n).toLocaleString(); }

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gd')
    .setDescription('Geometry Dash info')
    .addSubcommand(sub => sub
      .setName('level')
      .setDescription('Search for a GD level')
      .addStringOption(opt => opt.setName('name').setDescription('Level name').setRequired(true))
      .addBooleanOption(opt => opt.setName('visible').setDescription('Show to everyone (default: false)'))
    )
    .addSubcommand(sub => sub
      .setName('profile')
      .setDescription('View a GD player profile')
      .addStringOption(opt => opt.setName('username').setDescription('GD username').setRequired(true))
      .addBooleanOption(opt => opt.setName('visible').setDescription('Show to everyone (default: false)'))
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const visible = interaction.options.getBoolean('visible') ?? false;
    const flags = visible ? MessageFlags.IsComponentsV2 : MessageFlags.Ephemeral | MessageFlags.IsComponentsV2;

    await interaction.deferReply({ flags: visible ? undefined : MessageFlags.Ephemeral });

    if (sub === 'level') {
      const name = interaction.options.getString('name');
      const data = await fetchJson(`https://gdbrowser.com/api/search/${encodeURIComponent(name)}?count=5`).catch(() => null);

      if (!data || !data.length) {
        return interaction.editReply({ content: `${emoji.error} No levels found for \`${name}\`.` });
      }

      const components = [];

      for (const level of data.slice(0, 3)) {
        const diffLabel = level.isDemon ? (level.demonDifficulty || 'Demon') : (level.difficulty || 'N/A');
        const thumbUrl = `https://gdbrowser.com/gdlevelimage/${level.id}`;

        const badges = [
          level.isRated ? '✅ Rated' : '',
          level.featured ? '⭐ Featured' : '',
          level.epic ? '🔥 Epic' : '',
          level.legendary ? '🌟 Legendary' : '',
        ].filter(Boolean).join(' • ');

        const container = new ContainerBuilder()
          .setAccentColor(0xff6600)
          .addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(
              new MediaGalleryItemBuilder().setURL(thumbUrl)
            )
          )
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `### ${diffEmoji(diffLabel)} ${level.name}\n` +
            `👤 **By:** ${level.author || 'Unknown'} • 🆔 \`${level.id}\``
          ))
          .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `⭐ **Stars:** ${level.stars || 0} • 💎 **Diamonds:** ${level.diamonds || 0} • 🎯 **${diffLabel}**\n` +
            `👍 **Likes:** ${formatNum(level.likes)} • 🔽 **Downloads:** ${formatNum(level.downloads)}\n` +
            `🎵 **Song:** ${level.songName || 'N/A'}${level.songAuthor ? ` — ${level.songAuthor}` : ''}` +
            (badges ? `\n${badges}` : '') +
            (level.description ? `\n📝 ${level.description}` : '')
          ))
          .addActionRowComponents(
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setLabel('View on GDBrowser')
                .setURL(`https://gdbrowser.com/level/${level.id}`)
                .setStyle(ButtonStyle.Link)
                .setEmoji('🌐')
            )
          );

        components.push(container);
      }

      return interaction.editReply({ components, flags });
    }

    if (sub === 'profile') {
      const username = interaction.options.getString('username');
      const data = await fetchJson(`https://gdbrowser.com/api/profile/${encodeURIComponent(username)}`).catch(() => null);

      if (!data || data.error) {
        return interaction.editReply({ content: `${emoji.error} Player \`${username}\` not found.` });
      }

      const rankText = data.globalRank ? `🏅 **#${formatNum(data.globalRank)}**` : 'Unranked';
      const iconUrl = `https://gdbrowser.com/icon/${encodeURIComponent(data.username)}?form=cube&outline=1`;

      const container = new ContainerBuilder()
        .setAccentColor(0xff6600)
        .addMediaGalleryComponents(
          new MediaGalleryBuilder().addItems(
            new MediaGalleryItemBuilder().setURL(iconUrl)
          )
        )
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 👤 ${data.username}`))
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `🌍 **Global Rank:** ${rankText}\n` +
          `⭐ **Stars:** ${formatNum(data.stars)} • 🌙 **Moons:** ${formatNum(data.moons)}\n` +
          `💎 **Diamonds:** ${formatNum(data.diamonds)}\n` +
          `😈 **Demons:** ${formatNum(data.demons)}\n` +
          `🪙 **Coins:** ${formatNum(data.coins)} normal • ${formatNum(data.userCoins)} user\n` +
          `🎨 **Creator Points:** ${formatNum(data.cp)}\n` +
          `🛡️ **Mod:** ${data.moderator === 2 ? 'Elder Mod 🔶' : data.moderator === 1 ? 'Mod 🔷' : 'None'}`
        ))
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `🐦 **Twitter:** ${data.twitter ? `[@${data.twitter}](https://twitter.com/${data.twitter})` : 'N/A'}\n` +
          `📺 **YouTube:** ${data.youtube ? `[Link](https://youtube.com/channel/${data.youtube})` : 'N/A'}\n` +
          `🎮 **Twitch:** ${data.twitch ? `[${data.twitch}](https://twitch.tv/${data.twitch})` : 'N/A'}`
        ))
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setLabel('View on GDBrowser')
              .setURL(`https://gdbrowser.com/u/${encodeURIComponent(data.username)}`)
              .setStyle(ButtonStyle.Link)
              .setEmoji('🌐')
          )
        );

      return interaction.editReply({ components: [container], flags });
    }
  }
};