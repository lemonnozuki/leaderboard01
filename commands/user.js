const { SlashCommandBuilder, MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MediaGalleryBuilder, MediaGalleryItemBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const v2 = { flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('user')
    .setDescription('Show information about a user')
    .addUserOption(opt => opt.setName('target').setDescription('User to inspect (default: you)')),

  async execute(interaction) {
    const target = interaction.options.getUser('target') || interaction.user;
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);

    const createdAt = `<t:${Math.floor(target.createdTimestamp / 1000)}:D>`;
    const createdRel = `<t:${Math.floor(target.createdTimestamp / 1000)}:R>`;
    const joinedAt = member ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:D>` : 'Unknown';
    const joinedRel = member ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : '';

    const roles = member
      ? member.roles.cache
          .filter(r => r.id !== interaction.guildId)
          .sort((a, b) => b.position - a.position)
          .map(r => `<@&${r.id}>`)
          .slice(0, 10)
          .join(' ') || 'None'
      : 'None';

    const badges = getUserBadges(target.flags);
    const avatar = target.displayAvatarURL({ size: 256, extension: 'png' });
    const banner = target.bannerURL?.({ size: 1024 }) || null;
    const nickname = member?.nickname ? `\n🏷️ **Nickname:** ${member.nickname}` : '';
    const boostSince = member?.premiumSince
      ? `\n💎 **Boosting since:** <t:${Math.floor(member.premiumSinceTimestamp / 1000)}:R>`
      : '';
    const botTag = target.bot ? ' 🤖' : '';

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Avatar')
        .setURL(avatar)
        .setStyle(ButtonStyle.Link)
        .setEmoji('🖼️')
    );

    if (banner) {
      buttons.addComponents(
        new ButtonBuilder()
          .setLabel('Banner')
          .setURL(banner)
          .setStyle(ButtonStyle.Link)
          .setEmoji('🎨')
      );
    }

    const container = new ContainerBuilder()
      .setAccentColor(member?.displayColor || 0x5865f2)
      .addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
          new MediaGalleryItemBuilder().setURL(avatar)
        )
      )
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 👤 ${target.username}${botTag}`))
      .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `🆔 **ID:** \`${target.id}\`${nickname}\n` +
        `📅 **Account created:** ${createdAt} (${createdRel})\n` +
        `📥 **Joined server:** ${joinedAt}${joinedRel ? ` (${joinedRel})` : ''}${boostSince}\n` +
        (badges.length ? `🏅 **Badges:** ${badges.join(' ')}\n` : '') +
        `\n🎭 **Roles [${member?.roles.cache.size - 1 || 0}]:** ${roles}`
      ))
      .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
      .addActionRowComponents(buttons);

    return interaction.reply({ components: [container], ...v2 });
  }
};

function getUserBadges(flags) {
  if (!flags) return [];
  const map = {
    Staff: '👨‍💼',
    Partner: '🤝',
    Hypesquad: '🏠',
    BugHunterLevel1: '🐛',
    BugHunterLevel2: '🐛',
    HypeSquadOnlineHouse1: '🏠',
    HypeSquadOnlineHouse2: '🏠',
    HypeSquadOnlineHouse3: '🏠',
    PremiumEarlySupporter: '⭐',
    VerifiedDeveloper: '💻',
    CertifiedModerator: '🛡️',
    ActiveDeveloper: '🔧',
  };
  return flags.toArray().map(f => map[f]).filter(Boolean);
}