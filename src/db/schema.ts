import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { defineRelations } from 'drizzle-orm';
import { timestamps } from "./columns.helpers";

export const guilds = sqliteTable("guilds", {
  id: text().primaryKey().default("0"),
  ...timestamps
});

export const channels = sqliteTable("channels", {
  id: text().primaryKey().default("0"),
  guildId: text("guild_id").references(() => guilds.id, {onDelete: 'cascade'}).notNull(),
  sendTo: text({ mode: 'json' }).$type<string[]>(),
  ...timestamps
})

export const messages = sqliteTable("messages", {
  id: text().primaryKey().default("0"),
  channelId: text("channel_id").references(() => channels.id, {onDelete: 'cascade'}).notNull(),
  ...timestamps
})

export const sentMessages = sqliteTable("sent_messages", {
  id: text().primaryKey().default("0"),
  channelId: text().notNull(),
  fromId: text().notNull(),
  ...timestamps
})

export const webhooks = sqliteTable("webhooks", {
  id: text().primaryKey().default("0"),
  channelId: text("channel_id").references(() => channels.id, {onDelete: 'cascade'}).notNull(),
  ...timestamps
})

export const relations = defineRelations({ guilds, channels, webhooks, messages, sentMessages }, (r) => ({
  guilds: {
    channels: r.many.channels(),
  },
  channels: {
    guild: r.one.guilds({
      from: r.channels.guildId,
      to: r.guilds.id,
    }),
    webhooks: r.many.webhooks(),
  },
  webhooks: {
    channel: r.one.channels({
      from: r.webhooks.channelId,
      to: r.channels.id,
    }),
  },
  messages: {
    channel: r.one.channels({
      from: r.messages.channelId,
      to: r.channels.id,
    }),
    sent: r.many.sentMessages(),
  },
  sentMessages: {
    from: r.one.messages({
      from: r.sentMessages.fromId,
      to: r.messages.id,
    }),
  },
}));