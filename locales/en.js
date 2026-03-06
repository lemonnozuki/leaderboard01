module.exports = {
  board_created: (e, name) => `${e.success} Leaderboard **${name}** has been created`,
  board_exists: (e, name) => `${e.error} Leaderboard **${name}** already exists`,
  board_deleted: (e, name) => `${e.remove} Leaderboard **${name}** has been deleted`,
  board_not_found: (e, name) => `${e.error} Leaderboard **${name}** not found`,
  board_empty: (e, name) => `${e.board} Leaderboard **${name}** has no entries`,
  board_no_list: (e) => `${e.list} This server has no leaderboards`,
  board_name_too_long: (e) => `${e.error} Leaderboard name must be 32 characters or less`,
  board_delete_no_perm: (e) => `${e.error} Only the creator or an admin can delete this leaderboard`,

  score_added: (e, amount, user, name, score, rank) =>
    `${e.add} Added **${amount}** points to ${user} in **${name}**\n${e.score} Score: \`${score}\` ${e.rank} Rank: **#${rank}**`,
  score_set: (e, user, score, name, rank) =>
    `${e.success} Set score of ${user} to \`${score}\` in **${name}** ${e.rank} Rank: **#${rank}**`,
  score_removed: (e, user, name) => `${e.remove} Removed ${user} from leaderboard **${name}**`,
  score_no_entry: (e, user, name) => `${e.error} ${user} has no score in **${name}**`,

  rank_display: (e, user, name, rank, score) =>
    `${e.rank} **${user}** in **${name}**: Rank **#${rank}** with \`${score}\` points`,

  embed_created_title: 'Leaderboard Created',
  embed_field_name: 'Name',
  embed_field_desc: 'Description',
  embed_field_none: 'None',
  embed_footer_created: (tag) => `Created by ${tag}`,
  embed_list_title: 'Leaderboard List',
  embed_list_footer: (n) => `${n} leaderboard(s)`,

  lang_changed: (e, lang) => `${e.success} Language changed to: **${lang}**`,
  lang_no_perm: (e) => `${e.error} Only admins can change the language`,

  report_sent: (e) => `${e.success} Report sent. Thank you!`,
  report_embed_title: 'New Bug Report',
  report_embed_from: 'From',
  report_embed_server: 'Server',
  report_embed_desc: 'Description',
  report_no_channel: (e) => `${e.error} Report channel is not configured.`,

  error_occurred: 'An error occurred.',
  error_contact: (owner) => `Contact ${owner} and provide the Error ID for support.`,
};