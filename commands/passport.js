const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const path = require('path');
const db = require('../database');

const FONT_PATH = path.join(__dirname, '../assets/fonts/font.otf');
GlobalFonts.registerFromPath(FONT_PATH, 'PassportFont');

function generatePassportId() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '0123456789';
  let id = '';
  for (let i = 0; i < 2; i++) id += letters[Math.floor(Math.random() * letters.length)];
  for (let i = 0; i < 7; i++) id += digits[Math.floor(Math.random() * digits.length)];
  return id;
}

function formatDate(ts) {
  return new Date(ts * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/ /g, '-');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('passport')
    .setDescription('View your passport'),

  async execute(interaction) {
    await interaction.deferReply();

    const user = interaction.user;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    let passport = db.getPassport(user.id);
    if (!passport) {
      db.createPassport(user.id, interaction.guildId, generatePassportId());
      passport = db.getPassport(user.id);
    }

    const W = 720, H = 540;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#1a1f36';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#2b3a6b';
    ctx.fillRect(0, 0, W, 8);
    ctx.fillRect(0, H - 8, W, 8);
    ctx.fillRect(0, 0, 6, H);
    ctx.fillRect(W - 6, 0, 6, H);

    ctx.fillStyle = '#c9aa71';
    ctx.font = '13px "PassportFont"';
    ctx.fillText('REPUBLIC OF DISCORD', 40, 38);

    ctx.fillStyle = '#ffffff';
    ctx.font = '28px "PassportFont"';
    ctx.fillText('PASSPORT', 40, 72);

    ctx.strokeStyle = '#c9aa71';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, 84);
    ctx.lineTo(W - 40, 84);
    ctx.stroke();

    const avatarSize = 140;
    const avatarX = 40;
    const avatarY = 100;

    ctx.fillStyle = '#2b3a6b';
    ctx.fillRect(avatarX - 4, avatarY - 4, avatarSize + 8, avatarSize + 8);

    try {
      const avatarImg = await loadImage(user.displayAvatarURL({ extension: 'png', size: 256 }));
      ctx.save();
      ctx.beginPath();
      ctx.rect(avatarX, avatarY, avatarSize, avatarSize);
      ctx.clip();
      ctx.drawImage(avatarImg, avatarX, avatarY, avatarSize, avatarSize);
      ctx.restore();
    } catch {
      ctx.fillStyle = '#3a4a7a';
      ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize);
      ctx.fillStyle = '#ffffff';
      ctx.font = '48px "PassportFont"';
      ctx.textAlign = 'center';
      ctx.fillText(user.username[0].toUpperCase(), avatarX + avatarSize / 2, avatarY + avatarSize / 2 + 16);
      ctx.textAlign = 'left';
    }

    const fields = [
      { label: 'SURNAME / NOM', value: user.username },
      { label: 'GIVEN NAMES', value: member?.displayName || user.globalName || user.username },
      { label: 'NATIONALITY', value: 'DISCORD' },
      { label: 'DATE OF ISSUE', value: formatDate(passport.issued_at) },
      { label: 'PASSPORT NO.', value: passport.passport_id },
      { label: 'USER ID', value: user.id },
    ];

    const infoX = 220;
    let fy = 115;
    for (const field of fields) {
      ctx.fillStyle = '#c9aa71';
      ctx.font = '10px "PassportFont"';
      ctx.fillText(field.label, infoX, fy);
      ctx.fillStyle = '#ffffff';
      ctx.font = field.label === 'USER ID' ? '13px "PassportFont"' : '16px "PassportFont"';
      ctx.fillText(field.value, infoX, fy + 16);
      fy += 52;
    }

    ctx.fillStyle = '#0f1325';
    ctx.fillRect(0, H - 90, W, 82);

    const pad = (s, n) => s.toString().padEnd(n, '<');
    const mrz1 = `P<DIS${pad(user.username.toUpperCase().replace(/[^A-Z]/g, '<'), 39)}`;
    const mrz2 = `${passport.passport_id}${pad(user.id.slice(-13), 13)}${pad('', 15)}`;

    ctx.fillStyle = '#556688';
    ctx.font = '11px "PassportFont"';
    ctx.fillText(mrz1.slice(0, 44), 40, H - 62);
    ctx.fillText(mrz2.slice(0, 44), 40, H - 44);

    ctx.font = '10px "PassportFont"';
    ctx.fillText('LEADERBOARD.01 — OFFICIAL DOCUMENT', 40, H - 20);

    const buffer = canvas.toBuffer('image/png');
    await interaction.editReply({ files: [new AttachmentBuilder(buffer, { name: 'passport.png' })] });
  }
};