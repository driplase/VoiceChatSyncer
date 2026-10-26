import { ComponentType, MessageFlags, type Message, type PartialMessage } from "discord.js";
import { db } from "../db";
import { channels, messages, sentMessages, webhooks } from "../db/schema";
import { eq } from "drizzle-orm";
import { initializeWebhook } from "../utils/setup";
import type { Channel } from "discord.js";

export async function handleMessageCreate(msg: Message) {
  let message = msg;
  if (msg.partial) message = await msg.fetch();

  if (message.webhookId) {
    let existingWebhook = await db.select()
      .from(webhooks)
      .where(eq(webhooks.id, message.webhookId))
      .limit(1);

    if (existingWebhook.length > 0) return;
  }

  await db.insert(messages).values({
    id: message.id,
    channelId: message.channelId,
  }).onConflictDoNothing();

  try {
    let existingChannel = await db.select()
      .from(channels)
      .where(eq(channels.id, message.channelId))
      .limit(1)

    if (!existingChannel[0] || !existingChannel[0].sendTo) return;

    for (const ch of existingChannel[0].sendTo) {
      const channel = await message.guild?.channels.fetch(ch)

      if (!channel) continue;

      const webhook = await getWebhook(channel);

      if (!webhook) continue

      let sentMessage;
      try {
        const options = await generateWebhookSendOptions(message);
        if (!options) continue;
        sentMessage = await webhook.send(options)
      } catch (err) {
        if (err.code === 50006) {
          const options = await generateWebhookSendOptions(message, true);
          if (!options) continue;
          sentMessage = await webhook.send(options)
        } else {
          throw err;
        }
      }

      await db.insert(sentMessages).values({
        id: sentMessage.id,
        channelId: sentMessage.channelId,
        fromId: message.id,
      }).onConflictDoNothing();
    }
  } catch (err) {
    console.error(err)
  }
}

export async function handleMessageUpdate(oldMsg: Message | PartialMessage, newMessage: Message) {
  let oldMessage = oldMsg;
  if (oldMsg.partial) oldMessage = await oldMsg.fetch();

  const existingSentMessages = await db.select()
    .from(sentMessages)
    .where(eq(sentMessages.fromId, oldMessage.id))

  
  if (existingSentMessages.length === 0) return;

  for (const sentMsg of existingSentMessages) {
    const channel = oldMessage.guild?.channels.cache.get(sentMsg.channelId);

    // if the channel does not exist, ignore
    if (!channel) continue;

    const webhook = await getWebhook(channel);
    
    // just in case
    if (!webhook) continue;

    try {
      const options = await generateWebhookSendOptions(newMessage);
      if (!options) continue;
      await webhook.editMessage(sentMsg.id, options);
    } catch (err) {
      console.error(err)
    }
  }
}

export async function handleMessageDelete(msg: Message | PartialMessage) {
  let message = msg;
  if (msg.partial) message = await msg.fetch();

  const existingSentMessages = await db.select()
    .from(sentMessages)
    .where(eq(sentMessages.fromId, message.id))

  
  if (existingSentMessages.length === 0) return;

  for (const sentMsg of existingSentMessages) {
    const channel = message.guild?.channels.cache.get(sentMsg.channelId);

    // if the channel does not exist, ignore
    if (!channel) continue;

    const webhook = await getWebhook(channel);
    
    // just in case
    if (!webhook) continue;

    try {
      await webhook.deleteMessage(sentMsg.id);
    } catch (err) {
      console.error(err)
    }
  }

  await db.delete(messages).values({
    id: message.id,
    channelId: message.channelId,
  })
}

async function resolveOriginalReference(message: Message, reference: Message) {
  if (!reference.webhookId) return reference;

  const existingWebhook = await db.select()
    .from(webhooks)
    .where(eq(webhooks.id, reference.webhookId))
    .limit(1);
  if (!existingWebhook[0]) return reference;

  const existingSentMessage = await db.select()
    .from(sentMessages)
    .where(eq(sentMessages.id, reference.id))
    .limit(1);
  if (!existingSentMessage[0]) return reference;

  const sourceMessage = await db.select()
    .from(messages)
    .where(eq(messages.id, existingSentMessage[0].fromId))
    .limit(1);
  if (!sourceMessage[0]) return reference;

  const referenceChannel = await message.guild?.channels.fetch(sourceMessage[0].channelId);
  if (!referenceChannel || !("messages" in referenceChannel)) return reference;

  return referenceChannel.messages.fetch(sourceMessage[0].id);
}

export async function generateWebhookSendOptions(message: Message, blank?: boolean) {
  let messageHeader = "";
  let messageFooter = "";

  if (message.reference) {
    try {
      switch (message.reference.type) {
        case 0: {
          const reference = await message.fetchReference();
          const ref = await resolveOriginalReference(message, reference);

          const refAuthor = ref.author;
          messageHeader += `-# ${process.env.REPLY_EMOJI || "<:reply_arrow:1563984217648660560>"} <@${refAuthor.id}> ${ref.content.split('\n')[0]?.slice(0, 200)}${ref.content.length > 200 ? "..." : ""}\n`
          break;
        }
        case 1: {
          const forwardedMessage = message.messageSnapshots.at(-1);

          if (forwardedMessage) {
            messageHeader += `> -# ${process.env.FORWARD_EMOJI || "<:forward_arrow:1563984234111045722>"} _転送済み_\n> ${forwardedMessage.content.replaceAll('\n', '\n> ')}\n> -# ${forwardedMessage.url}[  •  <t:${Math.floor(forwardedMessage.createdTimestamp / 1000)}:t>](${forwardedMessage.url}) ›`
          }

          break;
        }
      }
    } catch (err){
      console.error(err)
    }
  }

  if (message.poll) messageHeader += `📊 投票: [${message.poll.question.text}](${message.url}) ${message.poll.expiresTimestamp ? `(<t:${Math.floor(message.poll.expiresTimestamp / 1000)}:R>)` : ""}`;

  if (message.stickers) messageFooter += message.stickers.map(sticker => sticker.url);

  const content = messageHeader + message.content + messageFooter + (blank ? "\u200b" : "");
  const isComponentsV2 = message.flags.has(MessageFlags.IsComponentsV2);
  const components = isComponentsV2 && content
    ? [{ type: ComponentType.TextDisplay, content }, ...message.components]
    : message.components;

  return {
    files: message.attachments.map(v => v),
    allowedMentions: {
      parse: []
    },
    avatarURL: message.member?.avatarURL()
      || message.author.avatarURL()
      || "",
    username: message.member?.displayName ?? message.author.username,
    ...(isComponentsV2
      ? { flags: MessageFlags.IsComponentsV2 as const, components }
      : { content, embeds: message.embeds, components, tts: message.tts }),
  }
}

export async function getWebhook(channel: Channel) {
  // if the channel type cannot have webhooks (e.g. categories), ignore
  if (!("createWebhook" in channel) || typeof channel.createWebhook !== "function") return null;

  return await initializeWebhook(channel)
}