import { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags, PermissionsBitField } from "discord.js";
import { addSendTo, initializeChannel, initializeWebhook } from "../utils/setup";
import { channels } from "../db/schema";
import { db } from "../db";
import { eq } from "drizzle-orm";

export const data = new SlashCommandBuilder()
	.setName('list')
	.setDescription('複製設定の一覧を表示します')
	.addChannelOption(option => 
		option.setName("from")
			.setDescription("メッセージの複製元チャンネル")
		)
		.addChannelOption(option => 
			option.setName("to")
			.setDescription("メッセージの複製先チャンネル")
		)
	.setDefaultMemberPermissions(PermissionsBitField.Flags.ManageWebhooks
		| PermissionsBitField.Flags.ManageMessages
		| PermissionsBitField.Flags.ManageChannels)

export async function execute(interaction: ChatInputCommandInteraction) {
	if (!interaction.guild) {
		await interaction.reply({
			content: "サーバー内で実行してください",
			flags: Math.random() <= .9 ? MessageFlags.Ephemeral : undefined,
		})
		return;
	};

	if (!interaction.member?.permissions.has([PermissionsBitField.Flags.ManageWebhooks, PermissionsBitField.Flags.ManageMessages, PermissionsBitField.Flags.ManageChannels])) {
		await interaction.reply({
			content: `あなたには権力が足りません。\n${[
				[PermissionsBitField.Flags.ManageWebhooks, "ウェブフックの管理"],
				[PermissionsBitField.Flags.ManageMessages, "メッセージの管理"], 
				[PermissionsBitField.Flags.ManageChannels, "チャンネルの管理"]
			].map(perm => `- ${interaction.member?.permissions.has(perm[0]) ? "✅" : "🚨"} ${perm[1]}`).join("\n")}`,
			flags: Math.random() <= .9 ? MessageFlags.Ephemeral : undefined,
		})
		return;
	}

	const from = interaction.options.getChannel('from');
	const to = interaction.options.getChannel('to');

	await interaction.deferReply({ 
		// flags: MessageFlags.Ephemeral
	})

  let guildChannels = await db.select()
    .from(channels)
    .where(eq(channels.guildId, interaction.guild.id));

	if (from) {
		guildChannels = guildChannels.filter(channel => channel.id === from.id)
	}
	if (to) {
		guildChannels = guildChannels.filter(channel => channel.sendTo?.includes(to.id)) || []
	}

	guildChannels = guildChannels.filter(channel => channel.sendTo && channel.sendTo.length > 0)

	if (guildChannels.length === 0) {
		await interaction.editReply({
			content: `複製設定はありません`
		})
	} else {
		await interaction.editReply({
			content: `複製設定が${guildChannels.length}個あります`
				+ guildChannels.map(ch => `\n- <#${ch.id}>${ch.sendTo?.map(to => `\n  - ➡️ <#${to}>`).join('')}`).join('')
		})
	}
}