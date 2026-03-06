const { EmbedBuilder, MessageFlags } = require('discord.js');
const { emoji, ownerId } = require('../config');

function genErrorId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

async function handleError(interaction, error, action) {
  const errorId = genErrorId();
  console.error(`[ERROR ${errorId}]`, error);

  const ownerMention = ownerId ? `<@${ownerId}>` : 'the bot owner';

  const embed = new EmbedBuilder()
    .setColor(0xed4245)
    .setTitle(`${emoji.error} An error occurred while performing the action:`)
    .setDescription(`\`\`\`${error?.message || 'Unknown error'}\`\`\``)
    .addFields(
      { name: 'Error ID', value: `\`${errorId}\``, inline: true },
      { name: 'Support', value: `Contact ${ownerMention} with the Error ID above.`, inline: true }
    )
    .setFooter({ text: 'Creating errors repeatedly in a short time may result in a temporary ban.' })
    .setTimestamp();

  try {
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ embeds: [embed], flags: MessageFlags.Ephemeral });
    } else {
      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
  } catch (e) {
    console.error('Failed to send error message:', e);
  }
}

module.exports = { handleError };