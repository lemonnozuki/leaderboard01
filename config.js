require('dotenv').config();

module.exports = {
  ownerId: process.env.OWNER_ID || '',

  emoji: {
    success: process.env.EMOJI_SUCCESS || '<:success:0>',
    error: process.env.EMOJI_ERROR || '<:error:0>',
    rank: process.env.EMOJI_RANK || '<:rank:0>',
    score: process.env.EMOJI_SCORE || '<:score:0>',
    board: process.env.EMOJI_BOARD || '<:board:0>',
    add: process.env.EMOJI_ADD || '<:add:0>',
    remove: process.env.EMOJI_REMOVE || '<:remove:0>',
    list: process.env.EMOJI_LIST || '<:list:0>',
  }
};