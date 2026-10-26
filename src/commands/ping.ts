import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";

const emojis = [
	"<:GOTT:1138475462838988900>",
	"<a:gott_point:1180822654144487424>",
	"<:goto:1306729579561619537>",
	"<a:gott_hi:1180818704389374064>",
	"<:hatotai_hatotai:1129001164655042571>",
	"<:moji_fumble_1:1432392013432754206>",
	"<:moji_fumble_2:1432392072228241559>",
	"<:moji_fumble_3:1432392109679181854>",
	"<:moji_fumble_4:1432392173998964736>",
	"<:moji_fumble_5:1432392213261979648>",
]

export const data = new SlashCommandBuilder()
	.setName('ping')
	.setDescription('🏓')

export async function execute(interaction: ChatInputCommandInteraction) {
	await interaction.deferReply()

	let msg = await interaction.fetchReply();

	await interaction.editReply(`🏓 WS: ${interaction.client.ws.ping}ms, API: ${msg.createdTimestamp - interaction.createdTimestamp}ms ${emojis[Math.floor(Math.random() * emojis.length)]}`);
}