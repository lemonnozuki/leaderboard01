const {
  SlashCommandBuilder, MessageFlags,
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize
} = require('discord.js');
const https = require('https');
const dns = require('dns').promises;
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);
const { emoji } = require('../config');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'LeaderBoard.01-Bot' } }, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { reject(new Error('Parse error')); } });
    }).on('error', reject);
  });
}

async function getIpInfo(ip) {
  const url = ip ? `https://ipapi.co/${ip}/json/` : 'https://ipapi.co/json/';
  return fetchJson(url);
}

async function getPing(host) {
  try {
    const { stdout } = await exec(`ping -c 3 -W 2 ${host} 2>/dev/null || ping -n 3 -w 2000 ${host} 2>/dev/null`);
    const match = stdout.match(/avg[^=]+=\s*([\d.]+)/) || stdout.match(/Average = (\d+)ms/);
    return match ? `${match[1]}ms` : null;
  } catch { return null; }
}

async function getTraceroute(host) {
  try {
    const { stdout } = await exec(`traceroute -m 8 -w 1 ${host} 2>/dev/null || tracert -h 8 -w 1000 ${host} 2>/dev/null`, { timeout: 10000 });
    const lines = stdout.split('\n').slice(1, 9).filter(l => l.trim());
    return lines.map(l => l.trim().slice(0, 60)).join('\n') || null;
  } catch { return null; }
}

async function dnsLookup(host) {
  try {
    const records = await dns.resolve4(host).catch(() => []);
    const ptr = await dns.reverse(host).catch(() => []);
    return { a: records.slice(0, 3), ptr: ptr.slice(0, 2) };
  } catch { return null; }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('network')
    .setDescription('Network information and diagnostics')
    .addSubcommand(sub => sub
      .setName('ip')
      .setDescription('Lookup IP address info')
      .addStringOption(opt => opt.setName('address').setDescription('IP address to lookup (default: bot server IP)'))
      .addBooleanOption(opt => opt.setName('visible').setDescription('Show result to everyone (default: false)'))
    )
    .addSubcommand(sub => sub
      .setName('ping')
      .setDescription('Ping a host')
      .addStringOption(opt => opt.setName('host').setDescription('Host to ping').setRequired(true))
      .addBooleanOption(opt => opt.setName('visible').setDescription('Show result to everyone (default: false)'))
    )
    .addSubcommand(sub => sub
      .setName('traceroute')
      .setDescription('Traceroute to a host')
      .addStringOption(opt => opt.setName('host').setDescription('Host to trace').setRequired(true))
      .addBooleanOption(opt => opt.setName('visible').setDescription('Show result to everyone (default: false)'))
    )
    .addSubcommand(sub => sub
      .setName('dns')
      .setDescription('DNS lookup for a domain')
      .addStringOption(opt => opt.setName('host').setDescription('Domain to lookup').setRequired(true))
      .addBooleanOption(opt => opt.setName('visible').setDescription('Show result to everyone (default: false)'))
    )
    .addSubcommand(sub => sub
      .setName('whois')
      .setDescription('WHOIS / ASN info for an IP or domain')
      .addStringOption(opt => opt.setName('target').setDescription('IP or domain').setRequired(true))
      .addBooleanOption(opt => opt.setName('visible').setDescription('Show result to everyone (default: false)'))
    )
    .addSubcommand(sub => sub
      .setName('botping')
      .setDescription('Show bot WebSocket ping')
      .addBooleanOption(opt => opt.setName('visible').setDescription('Show result to everyone (default: false)'))
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const visible = interaction.options.getBoolean('visible') ?? false;
    const flags = visible
      ? MessageFlags.IsComponentsV2
      : MessageFlags.Ephemeral | MessageFlags.IsComponentsV2;

    await interaction.deferReply({ flags: visible ? undefined : MessageFlags.Ephemeral });

    if (sub === 'ip') {
      const address = interaction.options.getString('address') || null;
      const info = await getIpInfo(address).catch(() => null);

      if (!info || info.error) {
        return interaction.editReply({ content: '${emoji.error} Could not fetch IP info.' });
      }

      const container = new ContainerBuilder()
        .setAccentColor(0x5865f2)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 🌐 IP Information`))
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `🔢 **IP:** \`${info.ip}\`\n` +
          `🏢 **ISP:** ${info.org || 'Unknown'}\n` +
          `🌍 **Country:** ${info.country_name || 'Unknown'} ${info.country_flag_emoji || ''}\n` +
          `🏙️ **City:** ${info.city || 'Unknown'}, ${info.region || ''}\n` +
          `📮 **Postal:** ${info.postal || 'N/A'}\n` +
          `🕐 **Timezone:** ${info.timezone || 'Unknown'}\n` +
          `<:uptimeasn:1479809950845894766> **ASN:** ${info.asn || 'Unknown'}\n` +
          `🗺️ **Coords:** ${info.latitude}, ${info.longitude}`
        ));

      return interaction.editReply({ components: [container], flags });
    }

    if (sub === 'ping') {
      const host = interaction.options.getString('host');
      const result = await getPing(host);

      const container = new ContainerBuilder()
        .setAccentColor(result ? 0x57f287 : 0xed4245)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 📡 Ping — \`${host}\``))
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          result
            ? `${emoji.success} **Average RTT:** ${result}`
            : `${emoji.error} Host unreachable or timed out.`
        ));

      return interaction.editReply({ components: [container], flags });
    }

    if (sub === 'traceroute') {
      const host = interaction.options.getString('host');
      const result = await getTraceroute(host);

      const container = new ContainerBuilder()
        .setAccentColor(0xfee75c)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 🛤️ Traceroute — \`${host}\``))
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          result
            ? `\`\`\`\n${result}\n\`\`\``
            : `${emoji.error} Traceroute failed or host unreachable.`
        ));

      return interaction.editReply({ components: [container], flags });
    }

    if (sub === 'dns') {
      const host = interaction.options.getString('host');
      const result = await dnsLookup(host);

      const container = new ContainerBuilder()
        .setAccentColor(0x5865f2)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 🔍 DNS Lookup — \`${host}\``))
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          result
            ? `📌 **A Records:** ${result.a.length ? result.a.map(r => `\`${r}\``).join(', ') : 'None'}\n` +
              `🔁 **PTR Records:** ${result.ptr.length ? result.ptr.join(', ') : 'None'}`
            : `${emoji.error} DNS lookup failed.`
        ));

      return interaction.editReply({ components: [container], flags });
    }

    if (sub === 'whois') {
      const target = interaction.options.getString('target');
      const isIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(target);
      const info = await getIpInfo(isIp ? target : null).catch(() => null);

      let resolvedIp = target;
      if (!isIp) {
        try {
          const resolved = await dns.resolve4(target);
          resolvedIp = resolved[0];
        } catch { resolvedIp = null; }
      }

      const ipInfo = resolvedIp ? await getIpInfo(resolvedIp).catch(() => null) : null;

      const container = new ContainerBuilder()
        .setAccentColor(0x9146ff)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 🔎 WHOIS — \`${target}\``))
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          ipInfo && !ipInfo.error
            ? `🔢 **IP:** \`${ipInfo.ip}\`\n` +
              `🏢 **Org:** ${ipInfo.org || 'Unknown'}\n` +
              `📡 **ASN:** ${ipInfo.asn || 'Unknown'}\n` +
              `🌍 **Country:** ${ipInfo.country_name || 'Unknown'} ${ipInfo.country_flag_emoji || ''}\n` +
              `🏙️ **City:** ${ipInfo.city || 'Unknown'}, ${ipInfo.region || ''}\n` +
              `🕐 **Timezone:** ${ipInfo.timezone || 'Unknown'}`
            : `${emoji.error} Could not resolve WHOIS info for \`${target}\`.`
        ));

      return interaction.editReply({ components: [container], flags });
    }

    if (sub === 'botping') {
      const ws = interaction.client.ws.ping;
      const start = Date.now();
      await interaction.editReply({ content: '...' });
      const rest = Date.now() - start;

      const color = ws < 100 ? 0x57f287 : ws < 200 ? 0xfee75c : 0xed4245;

      const container = new ContainerBuilder()
        .setAccentColor(color)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 🏓 Bot Ping`))
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `📡 **WebSocket:** ${ws}ms\n` +
          `🌐 **REST API:** ${rest}ms`
        ));

      return interaction.editReply({ components: [container], flags });
    }
  }
};