const { SlashCommandBuilder, MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, ThumbnailBuilder } = require('discord.js');

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
    const avatar = bot.displayAvatarURL({ size: 256, extension: 'png' });

    const totalMembers = client.guilds.cache.reduce((a, g) => a + g.memberCount, 0);

    const container = new ContainerBuilder()
      .setAccentColor(0x5865f2)
      .addThumbnailComponents(
        new ThumbnailBuilder().setURL(avatar)
      )
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `### 🤖 ${bot.username}\n` +
        `🆔 **ID:** \`${bot.id}\`\n` +
        `📅 **Created:** ${createdAt}`
      ))
      .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `📡 **Ping:** ${ping}ms\n` +
        `⏱️ **Uptime:** ${uptime}\n` +
        `🏠 **Servers:** ${guildCount}\n` +
        `👥 **Total members:** ${totalMembers.toLocaleString()}`
      ))
      .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `🔗 [Invite](https://discord.com/oauth2/authorize?client_id=${bot.id}&permissions=8&scope=bot%20applications.commands) • 🖼️ [Avatar](${avatar})`
      ));

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