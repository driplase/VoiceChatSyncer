import { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags, PermissionsBitField } from "discord.js";
import { removeSendTo } from "../utils/setup";

export const data = new SlashCommandBuilder()
	.setName('unsetup')
	.setDescription('チャンネルメッセージの複製設定を削除します')
	.addChannelOption(option => 
		option.setName("from")
			.setDescription("メッセージの複製元チャンネル")
			.setRequired(true)
		)
		.addChannelOption(option => 
			option.setName("to")
			.setDescription("メッセージの複製先チャンネル")
			.setRequired(true)
		)
		.addBooleanOption(option => 
			option.setName("viceversa")
			.setDescription("to → from の反対の設定も行う")
		)
	.setDefaultMemberPermissions(PermissionsBitField.Flags.ManageWebhooks
		| PermissionsBitField.Flags.ManageMessages
		| PermissionsBitField.Flags.ManageChannels)

export async function execute(interaction: ChatInputCommandInteraction) {
	if (!interaction.guildId) {
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
	const viceversa = interaction.options.getBoolean('viceversa');

	if (!from || !to) {
		await interaction.reply({
			content: "from または to オプションが指定されていません"
		})
		return;
	}

	await interaction.deferReply({ 
		// flags: MessageFlags.Ephemeral
	})

	try {
		const resolvedFrom = await interaction.client.channels.fetch(from.id)
		if (!resolvedFrom) throw new Error("複製元チャンネルを取得できませんでした")

		const resolvedTo = await interaction.client.channels.fetch(to.id)
		if (!resolvedTo) throw new Error("複製元チャンネルを取得できませんでした")
			
		await removeSendTo(resolvedFrom, [resolvedTo.id])
		if (viceversa) await removeSendTo(resolvedTo, [resolvedFrom.id]);

		if (viceversa) {
			await interaction.editReply({
				content: `<#${resolvedFrom.id}> から <#${resolvedTo.id}> の相互複製設定を削除しました`
			})
		} else {
			await interaction.editReply({
				content: `<#${resolvedFrom.id}> から <#${resolvedTo.id}> の複製設定を削除しました`
			})
		}
	} catch (err) {
		console.error(err)
	}
}