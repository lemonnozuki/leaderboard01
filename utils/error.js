const { emoji, ownerId } = require('../config');

function genErrorId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

async function handleError(interaction, error, t) {
  const errorId = genErrorId();

  console.error(`[ERROR ${errorId}]`, error);

  const ownerMention = ownerId ? `<@${ownerId}>` : 'owner';
  const msg = `${emoji.error} ${t.error_occurred}\n\`Error ID: ${errorId}\`\n${t.error_contact(ownerMention)}`;

  try {
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: msg, ephemeral: true });
    } else {
      await interaction.reply({ content: msg, ephemeral: true });
    }
  } catch (e) {
    console.error('Failed to send error message:', e);
  }
}

module.exports = { handleError };