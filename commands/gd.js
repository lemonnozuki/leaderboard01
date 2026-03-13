const {
  SlashCommandBuilder, MessageFlags, AttachmentBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle
} = require('discord.js');
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const https = require('https');
const path = require('path');
const { emoji } = require('../config');

const FONT_PATH = path.join(__dirname, '../assets/fonts/font2.ttf');
GlobalFonts.registerFromPath(FONT_PATH, 'GDFont');

const ICONS = {
  star:     'https://gdbrowser.com/assets/star.png',
  demon:    'https://gdbrowser.com/assets/demon.png',
  diamond:  'https://gdbrowser.com/assets/diamond.png',
  moon:     'https://gdbrowser.com/assets/moon.png',
  coin:     'https://gdbrowser.com/assets/coin.png',
  cp:       'https://gdbrowser.com/assets/cp.png',
  download: 'https://gdbrowser.com/assets/download.png',
  like:     'https://gdbrowser.com/assets/like.png',
  featured: 'https://gdbrowser.com/assets/featured.png',
  epic:     'https://gdbrowser.com/assets/epic.png',
};

const iconCache = {};
async function getIcon(key) {
  if (iconCache[key]) return iconCache[key];
  try {
    const buf = await fetchBuffer(ICONS[key]);
    const img = await loadImage(buf);
    iconCache[key] = img;
    return img;
  } catch { return null; }
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'LeaderBoard.01-Bot' } }, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { reject(new Error('Parse error')); } });
    }).on('error', reject);
  });
}

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'LeaderBoard.01-Bot' } }, res => {
      if (res.statusCode >= 300) return reject(new Error('Not found'));
      const chunks = [];
      res.on('data', d => chunks.push(d));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

function formatNum(n) {
  if (!n && n !== 0) return '0';
  const num = Number(n);
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toLocaleString();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

async function drawIcon(ctx, key, x, y, size) {
  const img = await getIcon(key);
  if (img) ctx.drawImage(img, x, y, size, size);
}

const DIFF_COLORS = {
  'Auto': '#b0b0b0', 'Easy': '#6bff6b', 'Normal': '#6bbfff', 'Hard': '#ffdf6b',
  'Harder': '#ff9a3c', 'Insane': '#ff5c5c',
  'Easy Demon': '#ff6bdf', 'Medium Demon': '#ff6bdf', 'Hard Demon': '#ff6bdf',
  'Insane Demon': '#ff6bdf', 'Extreme Demon': '#ff4444', 'Demon': '#ff6bdf', 'N/A': '#aaaaaa'
};

const DIFF_ICON_URL = {
  'Auto':          'https://gdbrowser.com/assets/difficulties/auto.png',
  'Easy':          'https://gdbrowser.com/assets/difficulties/easy.png',
  'Normal':        'https://gdbrowser.com/assets/difficulties/normal.png',
  'Hard':          'https://gdbrowser.com/assets/difficulties/hard.png',
  'Harder':        'https://gdbrowser.com/assets/difficulties/harder.png',
  'Insane':        'https://gdbrowser.com/assets/difficulties/insane.png',
  'Easy Demon':    'https://gdbrowser.com/assets/difficulties/demon-easy.png',
  'Medium Demon':  'https://gdbrowser.com/assets/difficulties/demon-medium.png',
  'Hard Demon':    'https://gdbrowser.com/assets/difficulties/demon-hard.png',
  'Insane Demon':  'https://gdbrowser.com/assets/difficulties/demon-insane.png',
  'Extreme Demon': 'https://gdbrowser.com/assets/difficulties/demon-extreme.png',
  'Demon':         'https://gdbrowser.com/assets/difficulties/demon.png',
  'N/A':           'https://gdbrowser.com/assets/difficulties/unrated.png',
};

async function renderLevelCard(level) {
  const W = 780, H = 170;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  const diffLabel = level.isDemon ? (level.demonDifficulty || 'Demon') : (level.difficulty || 'N/A');
  const accent = DIFF_COLORS[diffLabel] || '#aaaaaa';

  roundRect(ctx, 0, 0, W, H, 14);
  ctx.fillStyle = '#3b2510';
  ctx.fill();

  roundRect(ctx, 0, 0, W, H, 14);
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, '#4a2e14');
  bgGrad.addColorStop(1, '#2a1a0a');
  ctx.fillStyle = bgGrad;
  ctx.fill();

  ctx.fillStyle = accent;
  roundRect(ctx, 0, 0, 6, H, 3);
  ctx.fill();

  const diffIconSize = 80;
  const diffX = 20;
  const diffY = (H - diffIconSize) / 2 - 8;

  try {
    const buf = await fetchBuffer(DIFF_ICON_URL[diffLabel] || DIFF_ICON_URL['N/A']);
    const img = await loadImage(buf);
    ctx.drawImage(img, diffX, diffY, diffIconSize, diffIconSize);
  } catch {
    ctx.fillStyle = accent;
    ctx.font = `bold 32px "GDFont"`;
    ctx.textAlign = 'center';
    ctx.fillText('?', diffX + diffIconSize / 2, diffY + diffIconSize / 2 + 10);
    ctx.textAlign = 'left';
  }

  const starIcon = await getIcon('star');
  if (starIcon) ctx.drawImage(starIcon, diffX + 18, diffY + diffIconSize + 4, 16, 16);
  ctx.fillStyle = '#ffd700';
  ctx.font = `bold 13px "GDFont"`;
  ctx.textAlign = 'center';
  ctx.fillText(level.isDemon ? '10' : String(level.stars || 0), diffX + diffIconSize / 2, diffY + diffIconSize + 18);
  ctx.textAlign = 'left';

  const tx = diffX + diffIconSize + 18;

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 26px "GDFont"`;
  ctx.fillText(level.name, tx, 40);

  ctx.fillStyle = '#ffdf6b';
  ctx.font = `16px "GDFont"`;
  ctx.fillText(`By ${level.author || 'Unknown'}`, tx, 64);

  ctx.fillStyle = '#d4a0ff';
  ctx.font = `13px "GDFont"`;
  if (level.songName) ctx.fillText(`♪  ${level.songName}${level.songAuthor ? `  —  ${level.songAuthor}` : ''}`, tx, 84);

  const iconSize = 18;
  const statsY = 112;
  const statGap = 120;
  const stats = [
    { key: 'download', value: formatNum(level.downloads) },
    { key: 'like',     value: formatNum(level.likes) },
  ];

  let sx = tx;
  for (const stat of stats) {
    await drawIcon(ctx, stat.key, sx, statsY - iconSize + 2, iconSize);
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 15px "GDFont"`;
    ctx.fillText(stat.value, sx + iconSize + 6, statsY + 1);
    sx += statGap;
  }

  const badgeItems = [
    level.epic     ? { key: 'epic',     label: 'Epic' }     : null,
    level.featured ? { key: 'featured', label: 'Featured' } : null,
  ].filter(Boolean);

  let bx = W - 16;
  for (const badge of badgeItems) {
    const img = await getIcon(badge.key);
    if (img) {
      bx -= 28;
      ctx.drawImage(img, bx, 12, 24, 24);
    }
  }

  ctx.fillStyle = '#ffffff33';
  ctx.font = `11px "GDFont"`;
  ctx.textAlign = 'right';
  ctx.fillText(`ID: ${level.id}`, W - 14, H - 10);
  ctx.textAlign = 'left';

  if (level.description) {
    ctx.fillStyle = '#ffffff88';
    ctx.font = `12px "GDFont"`;
    const desc = level.description.slice(0, 80) + (level.description.length > 80 ? '...' : '');
    ctx.fillText(desc, tx, H - 10);
  }

  return canvas.toBuffer('image/png');
}

async function renderProfileCard(data) {
  const W = 780, H = 230;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  roundRect(ctx, 0, 0, W, H, 14);
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, '#1e3a5f');
  bgGrad.addColorStop(1, '#0d1b2a');
  ctx.fillStyle = bgGrad;
  ctx.fill();

  ctx.fillStyle = '#4fc3f7';
  roundRect(ctx, 0, 0, 6, H, 3);
  ctx.fill();

  const iconSize = 90;
  const iconX = 20;
  const iconY = 20;

  ctx.fillStyle = '#4fc3f744';
  roundRect(ctx, iconX, iconY, iconSize, iconSize, 10);
  ctx.fill();
  ctx.strokeStyle = '#4fc3f7';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#4fc3f7';
  ctx.font = `bold 40px "GDFont"`;
  ctx.textAlign = 'center';
  ctx.fillText(data.username[0].toUpperCase(), iconX + iconSize / 2, iconY + iconSize / 2 + 14);
  ctx.textAlign = 'left';

  const tx = iconX + iconSize + 20;

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 30px "GDFont"`;
  ctx.fillText(data.username, tx, 52);

  if (data.moderator === 2) {
    ctx.fillStyle = '#f39c12';
    ctx.font = `bold 14px "GDFont"`;
    ctx.fillText('★ Elder Moderator', tx, 74);
  } else if (data.moderator === 1) {
    ctx.fillStyle = '#3498db';
    ctx.font = `bold 14px "GDFont"`;
    ctx.fillText('★ Moderator', tx, 74);
  }

  ctx.fillStyle = '#ffd700';
  ctx.font = `bold 15px "GDFont"`;
  ctx.fillText(data.globalRank ? `Global Rank  #${formatNum(data.globalRank)}` : 'Unranked', tx, 96);

  const statsData = [
    { key: 'star',    value: formatNum(data.stars),     label: 'Stars' },
    { key: 'demon',   value: formatNum(data.demons),    label: 'Demons' },
    { key: 'diamond', value: formatNum(data.diamonds),  label: 'Diamonds' },
    { key: 'moon',    value: formatNum(data.moons),     label: 'Moons' },
    { key: 'coin',    value: formatNum(data.coins),     label: 'Coins' },
    { key: 'cp',      value: formatNum(data.cp),        label: 'Creator Points' },
  ];

  const colW = (W - tx - 16) / 3;
  for (let i = 0; i < statsData.length; i++) {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const sx = tx + col * colW;
    const sy = 118 + row * 52;

    roundRect(ctx, sx, sy, colW - 10, 44, 8);
    ctx.fillStyle = '#ffffff0d';
    ctx.fill();
    ctx.strokeStyle = '#ffffff22';
    ctx.lineWidth = 1;
    ctx.stroke();

    const iconImg = await getIcon(statsData[i].key);
    if (iconImg) ctx.drawImage(iconImg, sx + 8, sy + 8, 22, 22);

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 16px "GDFont"`;
    ctx.fillText(statsData[i].value, sx + 36, sy + 24);

    ctx.fillStyle = '#ffffff66';
    ctx.font = `10px "GDFont"`;
    ctx.fillText(statsData[i].label, sx + 8, sy + 40);
  }

  ctx.fillStyle = '#ffffff22';
  ctx.font = `11px "GDFont"`;
  ctx.textAlign = 'right';
  ctx.fillText('LEADERBOARD.01', W - 14, H - 10);
  ctx.textAlign = 'left';

  return canvas.toBuffer('image/png');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gd')
    .setDescription('Geometry Dash info')
    .addSubcommand(sub => sub
      .setName('level')
      .setDescription('Search for a GD level')
      .addStringOption(opt => opt.setName('name').setDescription('Level name').setRequired(true))
      .addBooleanOption(opt => opt.setName('visible').setDescription('Show to everyone (default: false)'))
    )
    .addSubcommand(sub => sub
      .setName('profile')
      .setDescription('View a GD player profile')
      .addStringOption(opt => opt.setName('username').setDescription('GD username').setRequired(true))
      .addBooleanOption(opt => opt.setName('visible').setDescription('Show to everyone (default: false)'))
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const visible = interaction.options.getBoolean('visible') ?? false;

    await interaction.deferReply({ flags: visible ? undefined : MessageFlags.Ephemeral });

    if (sub === 'level') {
      const name = interaction.options.getString('name');
      const data = await fetchJson(`https://gdbrowser.com/api/search/${encodeURIComponent(name)}?count=5`).catch(() => null);

      if (!data || !data.length) {
        return interaction.editReply({ content: `${emoji.error} No levels found for \`${name}\`.` });
      }

      const files = [];
      const rows = [];

      for (const level of data.slice(0, 3)) {
        const buf = await renderLevelCard(level).catch(() => null);
        if (!buf) continue;
        files.push(new AttachmentBuilder(buf, { name: `level_${level.id}.png` }));
        rows.push(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setLabel(level.name.slice(0, 40))
              .setURL(`https://gdbrowser.com/level/${level.id}`)
              .setStyle(ButtonStyle.Link),
            new ButtonBuilder()
              .setLabel(level.author || 'Unknown')
              .setURL(`https://gdbrowser.com/u/${encodeURIComponent(level.author || 'unknown')}`)
              .setStyle(ButtonStyle.Link)
          )
        );
      }

      return interaction.editReply({ files, components: rows });
    }

    if (sub === 'profile') {
      const username = interaction.options.getString('username');
      const data = await fetchJson(`https://gdbrowser.com/api/profile/${encodeURIComponent(username)}`).catch(() => null);

      if (!data || data.error) {
        return interaction.editReply({ content: `${emoji.error} Player \`${username}\` not found.` });
      }

      const buf = await renderProfileCard(data).catch(() => null);
      if (!buf) return interaction.editReply({ content: `${emoji.error} Failed to render profile.` });

      return interaction.editReply({
        files: [new AttachmentBuilder(buf, { name: `profile_${data.username}.png` })],
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setLabel('View on GDBrowser')
              .setURL(`https://gdbrowser.com/u/${encodeURIComponent(data.username)}`)
              .setStyle(ButtonStyle.Link)
          )
        ]
      });
    }
  }
};