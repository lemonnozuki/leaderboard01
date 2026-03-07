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
    const nickname = member?.nickname ? `\n<:user:1479429927152652308> **Nickname:** ${member.nickname}` : '';
    const boostSince = member?.premiumSince
      ? `\n<:boost:1479797601204437125> **Boosting since:** <t:${Math.floor(member.premiumSinceTimestamp / 1000)}:R>`
      : '';
    const botTag = target.bot ? ' <:bot:1479797826056749136> ' : '';

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Avatar')
        .setURL(avatar)
        .setStyle(ButtonStyle.Link)
        .setEmoji('<a:avatar:1479798149756223570>')
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
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### <:lol:1479812165623087114> ${target.username}${botTag}`))
      .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `<:id:1479798826478080031> **ID:** \`${target.id}\`${nickname}\n` +
        `<a:calendar:1479800443793182780> **Account created:** ${createdAt} (${createdRel})\n` +
        `<:ewt:1479801319719174226> **Joined server:** ${joinedAt}${joinedRel ? ` (${joinedRel})` : ''}${boostSince}\n` +
        (badges.length ? `<:badges:1479802003931664536> **Badges:** ${badges.join(' ')}\n` : '') +
        `\n<:roles:1479811932277182485> **Roles [${member?.roles.cache.size - 1 || 0}]:** ${roles}`
      ))
      .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
      .addActionRowComponents(buttons);

    return interaction.reply({ components: [container], ...v2 });
  }
};

function getUserBadges(flags) {
  if (!flags) return [];
  const map = {
    Staff: '<:staff:1479802745987797144>',
    Partner: '<:partner:1479802984337510530>',
    Hypesquad: '<:hps:1479802767856898190>',
    BugHunterLevel1: '<:greenbughunter:1479803279935537193>',
    BugHunterLevel2: '<:ylbughunter:1479803311128445011>',
    HypeSquadOnlineHouse1: '<:alance:1479805855078813716>',
    HypeSquadOnlineHouse2: '<:redhyp:1479804961800847411>',
    HypeSquadOnlineHouse3: '<:ravery:1479805879015571596>',
    PremiumEarlySupporter: '<:earlysupporter:1479804443414368347>',
    EarlyVerifiedDeveloper: '<a:elv:1479807936246190222>',
    CertifiedModerator: '<:Moderator:1479808833101631550>',
  };
  return flags.toArray().map(f => map[f]).filter(Boolean);
}