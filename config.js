require('dotenv').config();

const emoji = {
  success: '<a:succes:1479107788952047777>',
  error: '<:wrong:1479107957999538348>',
  rank: '<:rank:1479108243157553272>',
  score: '<:score:1479108677683118172>',
  board: '<:board:1479111789143654400>',
  add: '<:add:1479111373958152263>',
  remove: '<:remove:1479111731362926673>',
  list: '<:list:1479112114617450710>',
};

const ownerId = process.env.OWNER_ID || '';

module.exports = { emoji, ownerId };