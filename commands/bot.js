const { SlashCommandBuilder, MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MediaGalleryBuilder, MediaGalleryItemBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const v2 = { flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 };
const startTime = Date.now();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bot')
    .setDescription('Show information about the bot'),

  async execute(interaction) {
    const { client } = interaction;
    const bot = client.user;

    const uptime = formatUptime(Date.now() - startTime);
    const createdAt = `<t:${Math.floor(bot.createdTimestamp / 1000)}:D>`;
    const ping = client.ws.ping;
    const guildCount = client.guilds.cache.size;
    const totalMembers = client.guilds.cache.reduce((a, g) => a + g.memberCount, 0);
    const avatar = bot.displayAvatarURL({ size: 256, extension: 'png' });
    const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${bot.id}&permissions=8&scope=bot%20applications.commands`;

    const container = new ContainerBuilder()
      .setAccentColor(0x5865f2)
      .addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
          new MediaGalleryItemBuilder().setURL(avatar)
        )
      )
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 🤖 ${bot.username}`))
      .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `🆔 **ID:** \`${bot.id}\`\n` +
        `📅 **Created:** ${createdAt}\n` +
        `📡 **Ping:** ${ping}ms\n` +
        `⏱️ **Uptime:** ${uptime}\n` +
        `🏠 **Servers:** ${guildCount}\n` +
        `👥 **Total members:** ${totalMembers.toLocaleString()}`
      ))
      .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setLabel('Invite')
            .setURL(inviteUrl)
            .setStyle(ButtonStyle.Link)
            .setEmoji('🔗')
        )
      );

    return interaction.reply({ components: [container], ...v2 });
  }
};

function formatUptime(ms) {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  parts.push(`${sec}s`);
  return parts.join(' ');
}