import { Guild, type Channel } from "discord.js";
import { db } from "../db";
import { channels, guilds, webhooks } from "../db/schema";
import { eq } from "drizzle-orm";

export async function initializeChannel(channel: Channel) {
  let target = channel;

  if (channel.partial) target = await channel.fetch();

  // if the channel does not belong to any channels (e.g. DMs), ignore
  if (!("guildId" in target)) return;

  // if the channel type cannot have webhooks (e.g. categories), ignore
  if (!("createWebhook" in target) || typeof target.createWebhook !== "function") return;

  const guildId = target.guildId;

  const existingGuild = await db.select().from(guilds).where(eq(guilds.id, guildId));

  if (existingGuild.length === 0) {
    await db.insert(guilds)
      .values({ id: guildId })
      .onConflictDoNothing();
  }

  await db.insert(channels)
    .values({
      id: target.id,
      guildId,
    })
    .onConflictDoNothing();
}

export async function initializeWebhook(channel: Channel) {
  let target = channel;

  if (channel.partial) target = await channel.fetch();

  // if the channel does not belong to any channels (e.g. DMs), ignore
  if (!("guildId" in target)) return;

  // if the channel type cannot have webhooks (e.g. categories), ignore
  if (!("createWebhook" in target) || typeof target.createWebhook !== "function") return;

  await initializeChannel(target);

  const existingWebhooksInDb = await db
    .select()
    .from(webhooks)
    .where(eq(webhooks.channelId, target.id));

  const channelWebhooks = await target.fetchWebhooks();

  const existingWebhooks = existingWebhooksInDb.filter(async hook => {
    const result = channelWebhooks.filter(hook => hook.token).has(hook.id)

    // if the webhook did not exist, delete it from the DB
    if (!result) {
      await db.delete(webhooks).values({
        id: hook.id,
        channelId: hook.channelId,
      })
    }

    return result;
  })

  // if existing webhook found, do not create new one
  if (existingWebhooks.length > 0) return channelWebhooks.find(hook => hook.id === existingWebhooks.at(0)?.id);


  const webhook = await target.createWebhook({
    name: process.env.WEBHOOK_NAME || "MessageCopier",
  });

  await db.insert(webhooks)
    .values({
      id: webhook.id,
      channelId: target.id,
    })
    .onConflictDoNothing();

  return webhook
}

export async function addSendTo(channel: Channel, targetChannels: string[]) {
  await initializeChannel(channel)

  
  const existingChannel = await db.select().from(channels).where(eq(channels.id, channel.id));

  if (existingChannel.length === 0) return;

  const currentSendTo = existingChannel[0]?.sendTo || []

  const sendTo = Array.from(new Set(currentSendTo.concat(targetChannels)))

  await db.update(channels)
    .set({ sendTo })
    .where(eq(channels.id, channel.id))
}

export async function removeSendTo(channel: Channel, targetChannels: string[]) {
  const existingChannel = await db.select().from(channels).where(eq(channels.id, channel.id));

  if (existingChannel.length === 0) return;

  const currentSendTo = existingChannel[0]?.sendTo || []

  const sendTo = currentSendTo.filter(i => !targetChannels.includes(i))

  await db.update(channels)
    .set({ sendTo })
    .where(eq(channels.id, channel.id))
}