const {
  SlashCommandBuilder, PermissionFlagsBits, MessageFlags,
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize,
  MediaGalleryBuilder, MediaGalleryItemBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle
} = require('discord.js');
const db = require('../database');
const { emoji, ownerId } = require('../config');

const v2 = { flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 };
const v2pub = { flags: MessageFlags.IsComponentsV2 };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('Shop system')
    .addSubcommand(sub => sub
      .setName('setup')
      .setDescription('Setup shop payment info')
      .addStringOption(opt => opt.setName('currency').setDescription('Currency (VND or USD)').setRequired(true).addChoices(
        { name: 'VND', value: 'VND' },
        { name: 'USD', value: 'USD' }
      ))
      .addStringOption(opt => opt.setName('payment_link').setDescription('PayPal or payment link'))
      .addAttachmentOption(opt => opt.setName('qr').setDescription('QR code image'))
    )
    .addSubcommand(sub => sub
      .setName('add')
      .setDescription('Add an item to the shop')
      .addStringOption(opt => opt.setName('name').setDescription('Item name').setRequired(true))
      .addNumberOption(opt => opt.setName('price').setDescription('Price').setRequired(true))
      .addStringOption(opt => opt.setName('description').setDescription('Item description'))
      .addStringOption(opt => opt.setName('emoji').setDescription('Custom emoji for the item'))
      .addStringOption(opt => opt.setName('duration').setDescription('Duration').addChoices(
        { name: '1 Day', value: '1d' },
        { name: '3 Days', value: '3d' },
        { name: '7 Days', value: '7d' },
        { name: '30 Days', value: '30d' },
        { name: '90 Days', value: '90d' },
        { name: '180 Days', value: '180d' },
        { name: '365 Days', value: '365d' },
        { name: 'Permanent', value: 'permanent' }
      ))
      .addIntegerOption(opt => opt.setName('stock').setDescription('Stock (-1 = unlimited)').setMinValue(-1))
    )
    .addSubcommand(sub => sub
      .setName('remove')
      .setDescription('Remove an item from the shop')
      .addIntegerOption(opt => opt.setName('id').setDescription('Item ID').setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName('list')
      .setDescription('Browse the shop')
    )
    .addSubcommand(sub => sub
      .setName('orders')
      .setDescription('View pending orders')
    )
    .addSubcommand(sub => sub
      .setName('inventory')
      .setDescription('View your purchased items')
      .addUserOption(opt => opt.setName('user').setDescription('User to check (admin only)'))
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.ManageGuild);
    const e = emoji;

    if (sub === 'setup') {
      if (!isAdmin) return interaction.reply({ content: `${e.error} No permission.`, ...v2 });

      const currency = interaction.options.getString('currency');
      const paymentLink = interaction.options.getString('payment_link') || null;
      const qr = interaction.options.getAttachment('qr');
      const qrUrl = qr ? qr.url : null;

      db.setShopSettings(guildId, currency, qrUrl, paymentLink);

      const container = new ContainerBuilder()
        .setAccentColor(0x57f287)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `### ${e.success} Shop Setup\n` +
          `💰 **Currency:** ${currency}\n` +
          (paymentLink ? `🔗 **Payment link:** ${paymentLink}\n` : '') +
          (qrUrl ? `🖼️ **QR:** saved` : '')
        ));
      return interaction.reply({ components: [container], ...v2 });
    }

    if (sub === 'add') {
      if (!isAdmin) return interaction.reply({ content: `${e.error} No permission.`, ...v2 });

      const name = interaction.options.getString('name');
      const price = interaction.options.getNumber('price');
      const description = interaction.options.getString('description') || '';
      const itemEmoji = interaction.options.getString('emoji') || '🛍️';
      const stock = interaction.options.getInteger('stock') ?? -1;
      const duration = interaction.options.getString('duration') || null;

      const result = db.addShopItem(guildId, name, description, itemEmoji, price, stock, duration);
      const settings = db.getShopSettings(guildId);
      const currency = settings?.currency || 'VND';

      const container = new ContainerBuilder()
        .setAccentColor(0x57f287)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `### ${e.success} Item Added\n` +
          `${itemEmoji} **${name}**\n` +
          `💰 **Price:** ${price.toLocaleString()} ${currency}\n` +
          (duration ? `⏱️ **Duration:** ${formatDuration(duration)}\n` : '') +
          (description ? `📝 **Desc:** ${description}\n` : '') +
          `📦 **Stock:** ${stock === -1 ? 'Unlimited' : stock}\n` +
          `🆔 **ID:** \`${result.lastInsertRowid}\``
        ));
      return interaction.reply({ components: [container], ...v2 });
    }

    if (sub === 'remove') {
      if (!isAdmin) return interaction.reply({ content: `${e.error} No permission.`, ...v2 });

      const id = interaction.options.getInteger('id');
      const item = db.getShopItem(id);
      if (!item || item.guild_id !== guildId) {
        return interaction.reply({ content: `${e.error} Item not found.`, ...v2 });
      }

      db.removeShopItem(id, guildId);
      const container = new ContainerBuilder()
        .setAccentColor(0xed4245)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `${e.remove} Removed **${item.emoji} ${item.name}** from shop.`
        ));
      return interaction.reply({ components: [container], ...v2 });
    }

    if (sub === 'list') {
      const items = db.listShopItems(guildId);
      const settings = db.getShopSettings(guildId);
      const currency = settings?.currency || 'VND';

      if (!items.length) {
        const container = new ContainerBuilder()
          .setAccentColor(0x5865f2)
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${e.list} Shop is empty.`));
        return interaction.reply({ components: [container], ...v2 });
      }

      const components = [];

      for (const item of items) {
        const stockText = item.stock === -1 ? 'Unlimited' : `${item.stock} left`;
        const row = new ContainerBuilder()
          .setAccentColor(0x5865f2)
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `${item.emoji} **${item.name}**\n` +
            (item.description ? `${item.description}\n` : '') +
            `💰 **${item.price.toLocaleString()} ${currency}**` +
            (item.duration ? ` • ⏱️ ${formatDuration(item.duration)}` : '') +
            `\n📦 ${stockText}`
          ))
          .addActionRowComponents(
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId(`shop_buy_${item.id}`)
                .setLabel('Buy')
                .setStyle(ButtonStyle.Success)
                .setEmoji('🛒'),
              new ButtonBuilder()
                .setCustomId(`shop_report_${item.id}`)
                .setLabel('Report')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🚩')
            )
          );
        components.push(row);
      }

      return interaction.reply({ components, flags: MessageFlags.IsComponentsV2 });
    }

    if (sub === 'orders') {
      if (!isAdmin) return interaction.reply({ content: `${e.error} No permission.`, ...v2 });

      const orders = db.getPendingOrders(guildId);
      if (!orders.length) {
        const container = new ContainerBuilder()
          .setAccentColor(0x5865f2)
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${e.list} No pending orders.`));
        return interaction.reply({ components: [container], ...v2 });
      }

      const settings = db.getShopSettings(guildId);
      const currency = settings?.currency || 'VND';
      const components = [];

      for (const order of orders) {
        const row = new ContainerBuilder()
          .setAccentColor(0xfee75c)
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `🧾 **Order #${order.id}**\n` +
            `👤 <@${order.user_id}>\n` +
            `${order.emoji} **${order.item_name}** — ${order.price.toLocaleString()} ${currency}\n` +
            `🕐 <t:${order.created_at}:R>`
          ))
          .addActionRowComponents(
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId(`shop_confirm_${order.id}`)
                .setLabel('Confirm')
                .setStyle(ButtonStyle.Success)
                .setEmoji('✅'),
              new ButtonBuilder()
                .setCustomId(`shop_cancel_${order.id}`)
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('❌')
            )
          );
        components.push(row);
      }

      return interaction.reply({ components, flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
    }

    if (sub === 'inventory') {
      const targetUser = interaction.options.getUser('user');
      if (targetUser && !isAdmin) return interaction.reply({ content: `${e.error} No permission.`, ...v2 });

      const userId = targetUser ? targetUser.id : interaction.user.id;
      const displayName = targetUser ? targetUser.username : 'Your';
      const inv = db.getInventory(guildId, userId);

      if (!inv.length) {
        const container = new ContainerBuilder()
          .setAccentColor(0x5865f2)
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${e.list} ${displayName} inventory is empty.`));
        return interaction.reply({ components: [container], ...v2 });
      }

      const items = inv.map(i => `${i.emoji} **${i.name}** x${i.quantity} — <t:${i.bought_at}:R>`).join('\n');
      const container = new ContainerBuilder()
        .setAccentColor(0x5865f2)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 🎒 ${displayName} Inventory`))
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(items));

      return interaction.reply({ components: [container], ...v2 });
    }
  },

  async handleButton(interaction) {
    const [, action, idStr] = interaction.customId.split('_');
    const id = parseInt(idStr);
    const guildId = interaction.guildId;
    const e = emoji;
    const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.ManageGuild);

    if (action === 'buy') {
      const item = db.getShopItem(id);
      if (!item) return interaction.reply({ content: `${e.error} Item not found.`, flags: MessageFlags.Ephemeral });
      if (item.stock === 0) return interaction.reply({ content: `${e.error} Out of stock.`, flags: MessageFlags.Ephemeral });

      const settings = db.getShopSettings(guildId);
      const currency = settings?.currency || 'VND';

      const order = db.createOrder(guildId, interaction.user.id, item.id);
      const orderId = order.lastInsertRowid;

      const components = [];

      if (settings?.payment_qr) {
        const qrContainer = new ContainerBuilder()
          .setAccentColor(0x57f287)
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `### 🛒 Order #${orderId} — ${item.emoji} ${item.name}\n` +
            `💰 **${item.price.toLocaleString()} ${currency}**\n\n` +
            `Scan the QR code to pay, then wait for admin confirmation.`
          ))
          .addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(
              new MediaGalleryItemBuilder().setURL(settings.payment_qr)
            )
          );
        components.push(qrContainer);
      }

      if (settings?.payment_link) {
        const linkContainer = new ContainerBuilder()
          .setAccentColor(0x57f287)
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            settings?.payment_qr ? '' : `### 🛒 Order #${orderId} — ${item.emoji} ${item.name}\n💰 **${item.price.toLocaleString()} ${currency}**\n\nClick the button below to pay.`
          ))
          .addActionRowComponents(
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setLabel('Pay Now')
                .setURL(settings.payment_link)
                .setStyle(ButtonStyle.Link)
                .setEmoji('💳')
            )
          );
        components.push(linkContainer);
      }

      if (!components.length) {
        const container = new ContainerBuilder()
          .setAccentColor(0x57f287)
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `### 🛒 Order #${orderId} — ${item.emoji} ${item.name}\n` +
            `💰 **${item.price.toLocaleString()} ${currency}**\n\n` +
            `Your order has been placed. Wait for admin to confirm payment.`
          ));
        components.push(container);
      }

      await interaction.reply({ components, flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });

      const owner = await interaction.client.users.fetch(ownerId).catch(() => null);
      if (owner) {
        const dmContainer = new ContainerBuilder()
          .setAccentColor(0xfee75c)
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `### 🔔 New Order #${orderId}\n` +
            `👤 **User:** ${interaction.user.username} (\`${interaction.user.id}\`)\n` +
            `🏠 **Server:** ${interaction.guild.name}\n` +
            `${item.emoji} **Item:** ${item.name}\n` +
            `💰 **Price:** ${item.price.toLocaleString()} ${currency}`
          ))
          .addActionRowComponents(
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId(`shop_confirm_${orderId}`)
                .setLabel('Confirm')
                .setStyle(ButtonStyle.Success)
                .setEmoji('✅'),
              new ButtonBuilder()
                .setCustomId(`shop_cancel_${orderId}`)
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('❌')
            )
          );

        await owner.send({ components: [dmContainer], flags: MessageFlags.IsComponentsV2 }).catch(() => null);
      }
    }

    if (action === 'confirm') {
      if (!isAdmin && interaction.user.id !== ownerId) {
        return interaction.reply({ content: `${e.error} No permission.`, flags: MessageFlags.Ephemeral });
      }

      const order = db.getOrder(id);
      if (!order || order.status !== 'pending') {
        return interaction.reply({ content: `${e.error} Order not found or already processed.`, flags: MessageFlags.Ephemeral });
      }

      const item = db.getShopItem(order.item_id);
      db.updateOrderStatus(id, 'confirmed');
      if (item.stock !== -1) db.decreaseStock(item.id);
      db.addInventory(order.guild_id, order.user_id, order.item_id);

      await interaction.update({
        components: [
          new ContainerBuilder()
            .setAccentColor(0x57f287)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
              `${e.success} Order #${id} confirmed — ${item.emoji} **${item.name}** added to <@${order.user_id}>'s inventory.`
            ))
        ],
        flags: MessageFlags.IsComponentsV2
      });

      const user = await interaction.client.users.fetch(order.user_id).catch(() => null);
      if (user) {
        const dmContainer = new ContainerBuilder()
          .setAccentColor(0x57f287)
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `### ${e.success} Order #${id} Confirmed!\n` +
            `${item.emoji} **${item.name}** has been added to your inventory.`
          ));
        await user.send({ components: [dmContainer], flags: MessageFlags.IsComponentsV2 }).catch(() => null);
      }
    }

    if (action === 'cancel') {
      if (!isAdmin && interaction.user.id !== ownerId) {
        return interaction.reply({ content: `${e.error} No permission.`, flags: MessageFlags.Ephemeral });
      }

      const order = db.getOrder(id);
      if (!order || order.status !== 'pending') {
        return interaction.reply({ content: `${e.error} Order not found or already processed.`, flags: MessageFlags.Ephemeral });
      }

      const item = db.getShopItem(order.item_id);
      db.updateOrderStatus(id, 'cancelled');

      await interaction.update({
        components: [
          new ContainerBuilder()
            .setAccentColor(0xed4245)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
              `${e.remove} Order #${id} cancelled — ${item.emoji} **${item.name}** for <@${order.user_id}>.`
            ))
        ],
        flags: MessageFlags.IsComponentsV2
      });

      const user = await interaction.client.users.fetch(order.user_id).catch(() => null);
      if (user) {
        const dmContainer = new ContainerBuilder()
          .setAccentColor(0xed4245)
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `### ❌ Order #${id} Cancelled\n` +
            `Your order for ${item.emoji} **${item.name}** was cancelled by an admin.`
          ));
        await user.send({ components: [dmContainer], flags: MessageFlags.IsComponentsV2 }).catch(() => null);
      }
    }

    if (action === 'report') {
      const item = db.getShopItem(id);
      const container = new ContainerBuilder()
        .setAccentColor(0xed4245)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `### 🚩 Report Item\n` +
          `${item?.emoji} **${item?.name}**\n\n` +
          `Your report has been sent to the admin.`
        ));

      await interaction.reply({ components: [container], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });

      const owner = await interaction.client.users.fetch(ownerId).catch(() => null);
      if (owner) {
        const dmContainer = new ContainerBuilder()
          .setAccentColor(0xed4245)
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `### 🚩 Item Reported\n` +
            `👤 **By:** ${interaction.user.username} (\`${interaction.user.id}\`)\n` +
            `🏠 **Server:** ${interaction.guild.name}\n` +
            `${item?.emoji} **Item:** ${item?.name} (\`#${id}\`)`
          ));
        await owner.send({ components: [dmContainer], flags: MessageFlags.IsComponentsV2 }).catch(() => null);
      }
    }
  }
};

function formatDuration(d) {
  const map = {
    '1d': '1 Day', '3d': '3 Days', '7d': '7 Days',
    '30d': '30 Days', '90d': '90 Days', '180d': '180 Days',
    '365d': '365 Days', 'permanent': 'Permanent'
  };
  return map[d] || d;
}