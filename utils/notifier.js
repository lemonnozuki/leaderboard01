const { EmbedBuilder } = require('discord.js');
const db = require('../database');

let twitchToken = null;
let twitchTokenExpiry = 0;

async function getTwitchToken() {
  if (twitchToken && Date.now() < twitchTokenExpiry) return twitchToken;

  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const res = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`, { method: 'POST' });
  const data = await res.json();
  twitchToken = data.access_token;
  twitchTokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return twitchToken;
}

async function checkYoutubeOne(client, noti) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return;

  try {
    const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${noti.yt_channel_id}&order=date&maxResults=1&type=video&key=${apiKey}`);
    const data = await res.json();
    const latest = data.items?.[0];
    if (!latest) return;

    const videoId = latest.id.videoId;
    if (videoId === noti.last_video_id) return;

    db.updateYoutubeLastVideo(noti.id, videoId);
    if (!noti.last_video_id) return;

    const channel = await client.channels.fetch(noti.channel_id).catch(() => null);
    if (!channel) return;

    const snippet = latest.snippet;
    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle(snippet.title)
      .setURL(`https://www.youtube.com/watch?v=${videoId}`)
      .setDescription(`**${noti.yt_channel_name}** just uploaded a new video!`)
      .setImage(snippet.thumbnails?.high?.url)
      .setFooter({ text: 'YouTube' })
      .setTimestamp(new Date(snippet.publishedAt));

    await channel.send({ embeds: [embed] });
  } catch (err) {
    console.error(`[YT] ${noti.yt_channel_name}:`, err.message);
  }
}

async function checkTwitchOne(client, noti) {
  const clientId = process.env.TWITCH_CLIENT_ID;
  if (!clientId) return;

  const token = await getTwitchToken();
  if (!token) return;

  try {
    const res = await fetch(`https://api.twitch.tv/helix/streams?user_login=${noti.twitch_username}`, {
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await res.json();
    const stream = data.data?.[0];
    const isLive = !!stream;

    if (isLive && !noti.is_live) {
      db.updateTwitchLiveStatus(noti.id, true);

      const channel = await client.channels.fetch(noti.channel_id).catch(() => null);
      if (!channel) return;

      const embed = new EmbedBuilder()
        .setColor(0x9146ff)
        .setTitle(stream.title)
        .setURL(`https://twitch.tv/${noti.twitch_username}`)
        .setDescription(`**${noti.twitch_username}** is now live on Twitch!`)
        .addFields(
          { name: 'Game', value: stream.game_name || 'Unknown', inline: true },
          { name: 'Viewers', value: `${stream.viewer_count}`, inline: true }
        )
        .setImage(`${stream.thumbnail_url.replace('{width}', '1280').replace('{height}', '720')}?t=${Date.now()}`)
        .setFooter({ text: 'Twitch' })
        .setTimestamp();

      await channel.send({ embeds: [embed] });
    } else if (!isLive && noti.is_live) {
      db.updateTwitchLiveStatus(noti.id, false);
    }
  } catch (err) {
    console.error(`[Twitch] ${noti.twitch_username}:`, err.message);
  }
}

function startNotifier(client) {
  const ytIntervals = new Map();
  const twitchIntervals = new Map();

  setInterval(async () => {
    const ytNotis = db.getAllYoutubeNoti();
    for (const noti of ytNotis) {
      if (!ytIntervals.has(noti.id)) ytIntervals.set(noti.id, 0);
      ytIntervals.set(noti.id, ytIntervals.get(noti.id) + 1);
      if (ytIntervals.get(noti.id) >= noti.interval_minutes) {
        ytIntervals.set(noti.id, 0);
        checkYoutubeOne(client, noti);
      }
    }

    const twitchNotis = db.getAllTwitchNoti();
    for (const noti of twitchNotis) {
      if (!twitchIntervals.has(noti.id)) twitchIntervals.set(noti.id, 0);
      twitchIntervals.set(noti.id, twitchIntervals.get(noti.id) + 1);
      if (twitchIntervals.get(noti.id) >= noti.interval_minutes) {
        twitchIntervals.set(noti.id, 0);
        checkTwitchOne(client, noti);
      }
    }
  }, 60 * 1000);

  console.log('[Notifier] Started');
}

module.exports = { startNotifier };