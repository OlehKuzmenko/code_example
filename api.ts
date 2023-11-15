import { MaybeDrafted } from '@reduxjs/toolkit/dist/query/core/buildThunks';
import i18next from 'i18next';
import { EBotsProvider } from '@/constants/enums/EBotsProvider';
import { ILiveChatSettingsFormData } from '@/components/LiveChatModal/ILiveChatSettingsFromData';
import { showNotification } from '@/components/extras/showNotification';
import { ESubscriberActivities } from '@/constants/enums/ESubscriberActivities';

import { ApiTypes } from '@/redux';
import { projectApi } from '@/redux/api';
import { returnHeaders } from '@/redux/api/headers';
import { getSocket } from '@/redux/api/socket';
import { EMessageContentTypes } from '@/constants/enums/EMessageContentTypes';
import { ESocketEvent } from '@/constants/enums/ESocketEvent';
import { IBot } from '@/interfaces/IBot';

export type IGetBotsListResponse = {
	data: IBot[];
	count: number;
};

export interface IGetBotsListRequest {
	take?: number;
	skip?: number;
}

export type ICreateBotResponse = IBot;
export type ICreateBotRequest = {
	type: EBotsProvider;
	token?: string;
	link?: string;
};

export type IDeleteBotResponse = {
	id: number;
	delete: boolean;
};
export type IDeleteBotRequest = {
	botId: number;
};

export interface ISendMsgToDialogFromBotRequest {
	botId: number | undefined;
	chatId: number | undefined;
	msg: string;
}

export interface ISendPhotoToDialogFromBotRequest {
	botId: number | undefined;
	chatId: number | undefined;
	file: File;
	msg: string;
	fileType: EMessageContentTypes;
}

export interface IGetCommandsListRequest {
	botId: number;
}

export interface IGetCommandsListResponse {
	menu: {
		command: string;
		description: string;
		data: {
			botId: string;
			trigger: string;
			chainId: number;
			triggerName: string;
			active: boolean;
			description: string;
		};
	}[];
}

export interface ICreateCommandRequest {
	botId: number;
	command: string;
	description: string;
	chainId: number;
}

export interface IDeleteCommandRequest {
	botId: number;
	command: string;
	chainId: number;
}

export interface IGetBotResponse {
	link: string;
	id: number;
	name: string;
	ownerId: number;
	integration: null | {
		botId: number;
		customModel: string;
		id: number;
		maxLen: number;
		model:
			| 'babbage'
			| 'davinci'
			| 'ada'
			| 'gpt-3.5-turbo'
			| 'curie'
			| 'gpt-4'
			| 'text-moderation-latest';

		prompt: string;
		temperature: number;
		token: string;
	};
	provider: EBotsProvider;
}

export interface IGetBotRequest {
	botId: number;
}

export interface IBulkSendChainRequest {
	botId: number;
	chainId: number;
	chatIds: number[];
}

export interface ISendChainRequest {
	chainId: number;
	chatId: number;
}

export interface IBulkTestSendChainRequest {
	botId: number;
	chainId: number;
}

export interface ISetBotOwnerResponse {
	url: string;
}

export interface ISetBotOwnerRequest {
	botId: number;
}

export interface IUpdateWebhookRequest {
	botId: number;
	webhookUrl: string | null;
	webhookAccess: ESubscriberActivities[];
}

export interface IChangeTokenRequest {
	botId: number;
	providers: EBotsProvider;
	token: string;
}

export interface ITransferBotRequest {
	botId: number;
	userEmail: string;
}

export interface IEditCommandRequest {
	botId: number;
	command: string;
	description: string;
	chainId: number;
}

export interface IActivateCommandRequest {
	botId: number;
	command: string;
	chainId: number;
}

export interface IActivateCommandResponse {
	botId: number;
	trigger: string;
	description: string;
	chainId: number;
	triggerName: string;
	active: boolean;
}

export interface IGetWebhookSettingsResponse {
	created_at: string;
	updated_at: string;
	id: number;
	botId: number;
	webhookUrl: string;
	webhookAccess: ESubscriberActivities[];
	active: boolean;
}

export interface IGetWebhookSettingsRequest {
	botId: number;
}

export interface IAddIntegrationRequest {
	botId: number;
	token: string;
	model:
		| 'babbage'
		| 'davinci'
		| 'ada'
		| 'gpt-3.5-turbo'
		| 'curie'
		| 'gpt-4'
		| 'text-moderation-latest';
	customModel: string;
	prompt: string;
	temperature: number;
	maxLen: number;
}

export interface IRemoveIntegrationRequest {
	botId: number;
}

export interface IDeactivateWebhookRequest {
	botId: number;
}

interface IUpdateWidgetChatSettingsRequest {
	botId: number;
	settings: Omit<ILiveChatSettingsFormData, 'greeting' | 'link'>;
}

interface IGetWidgetChatSettingsResponse {
	id: number;
	name: string;
	token: string;
	provider: EBotsProvider;
	link: string;
	widgetSettings: ILiveChatSettingsFormData;
	avatarId: number;
	ownerId: number;
	messengerBotId: number;
	avatar: {};
}

const extendedApi = projectApi
	.enhanceEndpoints({
		addTagTypes: [ApiTypes.Bots, ApiTypes.BotCommands, ApiTypes.Webhooks],
	})
	.injectEndpoints({
		endpoints: (builder) => ({
			getBotsList: builder.query<IGetBotsListResponse, IGetBotsListRequest>({
				query() {
					const myHeaders = returnHeaders('bots/list');
					return {
						url: '/bots/list',
						method: 'GET',
						headers: myHeaders,
						redirect: 'follow',
						// params,
					};
				},
				async onCacheEntryAdded(
					arg,
					{ updateCachedData, cacheDataLoaded, cacheEntryRemoved },
				) {
					const socket = getSocket();

					const listener = (data: { id: number; ownerId: number }) => {
						updateCachedData((draft: MaybeDrafted<IGetBotsListResponse>) => {
							const botToUpdate = draft.data.find((bot) => bot.id === data.id);
							if (botToUpdate) {
								botToUpdate.ownerId = data.ownerId;
							}
						});
						showNotification(
							i18next
								.t('account-details.messages.success_title', {
									ns: 'account-profile',
								})
								.toString(),
							i18next.t('main.owner.success', { ns: 'bots' }).toString(),
							'success',
						);
					};

					try {
						// Wait for the initial query to resolve before proceeding
						await cacheDataLoaded;

						// Listen for the "sub-owner" event and update the cache when it occurs
						socket.on(ESocketEvent.SUBOWNER, listener);
					} catch {
						// no-op in case `cacheEntryRemoved` resolves before `cacheDataLoaded`,
						// in which case `cacheDataLoaded` will throw
					}

					// `cacheEntryRemoved` will resolve when the cache subscription is no longer active
					await cacheEntryRemoved;

					// perform cleanup steps once the `cacheEntryRemoved` promise resolves
					socket.off(ESocketEvent.SUBOWNER, listener);
				},
				providesTags(result) {
					return result
						? [
								...result.data.map(({ id }) => ({
									type: `${ApiTypes.Bots}` as ApiTypes.Bots,
									id,
								})),
								ApiTypes.Bots,
						  ]
						: [ApiTypes.Bots];
				},
				transformResponse({ count, data }: IGetBotsListResponse) {
					const transfomedResponse = {
						count,
						data: data.map((bot) => {
							if (bot?.provider === EBotsProvider.WidgetChat) {
								const widgetChatName = new URL(bot?.link).hostname;
								return {
									...bot,
									name: widgetChatName,
								};
							}
							return bot;
						}),
					};
					return transfomedResponse;
				},
			}),
			createNewBot: builder.mutation<ICreateBotResponse, ICreateBotRequest>({
				query: ({ type, token, link }) => {
					const myHeaders = returnHeaders(`/xbots/create/${type}`);

					return {
						url: `/bots/create/${type}`,
						method: 'POST',
						redirect: 'follow',
						headers: myHeaders,
						body: {
							token,
							link,
						},
					};
				},
				invalidatesTags() {
					return [ApiTypes.Bots];
				},
			}),
			deleteBot: builder.mutation<IDeleteBotResponse, IDeleteBotRequest>({
				query: ({ botId }) => {
					return {
						url: `/bots/${botId}`,
						method: 'DELETE',
						redirect: 'follow',
					};
				},
				invalidatesTags(result, error, arg) {
					return result?.delete
						? [
								{ type: `${ApiTypes.Bots}` as ApiTypes.Bots, id: arg.botId },
								ApiTypes.Bots,
						  ]
						: [ApiTypes.Bots];
				},
			}),
			sendMsgToDialogFromBot: builder.mutation<void, ISendMsgToDialogFromBotRequest>({
				query: ({ botId, chatId, msg }) => {
					const myHeaders = returnHeaders(`/bots/${botId}/send/${chatId}`);
					return {
						url: `/bots/${botId}/send/${chatId}`,
						method: 'POST',
						redirect: 'follow',
						headers: myHeaders,
						body: {
							text: msg,
						},
					};
				},
			}),
			sendFileToDialogFromBot: builder.mutation<void, ISendPhotoToDialogFromBotRequest>({
				query: ({ botId, chatId, file, msg }) => {
					const myHeaders = returnHeaders(`/bots/${botId}/send-file/${chatId}`);
					const formData = new FormData();
					formData.append('file', file);
					formData.append('text', msg);
					return {
						url: `/bots/${botId}/send-file/${chatId}`,
						method: 'POST',
						redirect: 'follow',
						headers: myHeaders,
						body: formData,
					};
				},
			}),
			getCommandsList: builder.query<IGetCommandsListResponse, IGetCommandsListRequest>({
				query({ botId }) {
					const myHeaders = returnHeaders(`bots/${botId}/update/list-command`);
					return {
						url: `bots/${botId}/update/list-command`,
						method: 'GET',
						headers: myHeaders,
						redirect: 'follow',
					};
				},
				providesTags(result) {
					return result
						? [
								...result.menu.map(({ command }) => ({
									type: `${ApiTypes.BotCommands}` as ApiTypes.BotCommands,
									command,
								})),
								ApiTypes.BotCommands,
						  ]
						: [ApiTypes.BotCommands];
				},
			}),
			createNewCommand: builder.mutation<void, ICreateCommandRequest>({
				query: ({ botId, chainId, description, command }) => {
					const myHeaders = returnHeaders(`/bots/${botId}/update/add-command`);
					return {
						url: `/bots/${botId}/update/add-command`,
						method: 'PATCH',
						redirect: 'follow',
						headers: myHeaders,
						body: {
							command,
							description,
							chainId,
						},
					};
				},
				invalidatesTags() {
					return [ApiTypes.BotCommands];
				},
			}),
			editCommand: builder.mutation<void, IEditCommandRequest>({
				query: ({ botId, chainId, description, command }) => {
					const myHeaders = returnHeaders(`/bots/${botId}/update/update-command`);
					return {
						url: `/bots/${botId}/update/update-command`,
						method: 'PATCH',
						redirect: 'follow',
						headers: myHeaders,
						body: {
							command: `/${command}`,
							description,
							chainId,
						},
					};
				},
				invalidatesTags() {
					return [ApiTypes.BotCommands];
				},
			}),
			activateCommand: builder.mutation<IActivateCommandResponse, IActivateCommandRequest>({
				query: ({ botId, chainId, command }) => {
					const myHeaders = returnHeaders(`/bots/${botId}/update/command-status`);
					return {
						url: `/bots/${botId}/update/command-status`,
						method: 'PATCH',
						redirect: 'follow',
						headers: myHeaders,
						body: {
							command,
							chainId,
						},
					};
				},
				invalidatesTags() {
					return [ApiTypes.BotCommands];
				},
			}),
			deleteCommand: builder.mutation<void, IDeleteCommandRequest>({
				query: ({ chainId, command, botId }) => {
					const myHeaders = returnHeaders(`/bots/${botId}/update/remove-command`);
					return {
						url: `/bots/${botId}/update/remove-command`,
						method: 'PATCH',
						redirect: 'follow',
						headers: myHeaders,
						body: {
							command,
							chainId,
						},
					};
				},
				invalidatesTags() {
					return [ApiTypes.BotCommands];
				},
			}),
			getBot: builder.query<IGetBotResponse, IGetBotRequest>({
				query: ({ botId }) => {
					const myHeaders = returnHeaders(`/bots/${botId}`);

					return {
						url: `/bots/${botId}`,
						method: 'GET',
						redirect: 'follow',
						headers: myHeaders,
					};
				},
				transformResponse(bot: IGetBotResponse) {
					if (bot?.provider === EBotsProvider.WidgetChat) {
						const widgetChatName = new URL(bot?.link).hostname;
						return {
							...bot,
							name: widgetChatName,
						};
					}
					return bot;
				},
				providesTags() {
					return [{ type: ApiTypes.Bots }];
				},
			}),
			sendChain: builder.mutation<void, ISendChainRequest>({
				query: ({ chainId, chatId }) => {
					const myHeaders = returnHeaders(`/bots/send-chain/${chatId}`);

					return {
						url: `/bots/send-chain/${chatId}`,
						method: 'POST',
						redirect: 'follow',
						headers: myHeaders,
						body: {
							chainId,
						},
					};
				},
			}),
			bulkSendChain: builder.mutation<void, IBulkSendChainRequest>({
				query: ({ botId, chainId, chatIds }) => {
					const myHeaders = returnHeaders(`/bots/${botId}/bulk/send-chain`);

					return {
						url: `/bots/${botId}/bulk/send-chain`,
						method: 'POST',
						redirect: 'follow',
						headers: myHeaders,
						body: {
							chainId,
							chatIds,
						},
					};
				},
			}),
			bulkTestSendChain: builder.mutation<void, IBulkTestSendChainRequest>({
				query: ({ botId, chainId }) => {
					const myHeaders = returnHeaders(`/bots/${botId}/bulk/test-send-chain`);

					return {
						url: `/bots/${botId}/bulk/test-send-chain`,
						method: 'POST',
						redirect: 'follow',
						headers: myHeaders,
						body: {
							chainId,
						},
					};
				},
			}),
			setBotOwner: builder.query<ISetBotOwnerResponse, ISetBotOwnerRequest>({
				query: ({ botId }) => {
					const myHeaders = returnHeaders(`/bots/${botId}/change-sub-owner`);
					return {
						url: `/bots/${botId}/change-sub-owner`,
						method: 'GET',
						redirect: 'follow',
						headers: myHeaders,
					};
				},
			}),
			transferBot: builder.mutation<void, ITransferBotRequest>({
				query: ({ botId, userEmail }) => {
					const myHeaders = returnHeaders(`/bots/${botId}/update/change-owner`);
					return {
						url: `/bots/${botId}/update/change-owner`,
						method: 'PATCH',
						redirect: 'follow',
						headers: myHeaders,
						body: {
							userEmail,
						},
					};
				},
				invalidatesTags() {
					return [ApiTypes.Bots];
				},
			}),
			changeToken: builder.mutation<void, IChangeTokenRequest>({
				query: ({ botId, providers, token }) => {
					const myHeaders = returnHeaders(
						`/bots/${botId}/update/${providers}/change-token`,
					);

					return {
						url: `/bots/${botId}/update/${providers}/change-token`,
						method: 'PATCH',
						redirect: 'follow',
						headers: myHeaders,
						body: {
							token,
						},
					};
				},
				invalidatesTags() {
					return [ApiTypes.Bots];
				},
			}),
			updateWebhook: builder.mutation<void, IUpdateWebhookRequest>({
				query: ({ botId, webhookUrl, webhookAccess }) => {
					const myHeaders = returnHeaders(`/bots/${botId}/update/webhook`);

					return {
						url: `/bots/${botId}/update/webhook`,
						method: 'PATCH',
						redirect: 'follow',
						headers: myHeaders,
						body: {
							webhookUrl,
							webhookAccess,
						},
					};
				},
				invalidatesTags() {
					return [ApiTypes.Webhooks];
				},
			}),
			deactivateWebhook: builder.mutation<void, IDeactivateWebhookRequest>({
				query: ({ botId }) => {
					const myHeaders = returnHeaders(`/bots/${botId}/update/deactivate-webhook`);

					return {
						url: `/bots/${botId}/update/deactivate-webhook`,
						method: 'DELETE',
						redirect: 'follow',
						headers: myHeaders,
					};
				},
				invalidatesTags() {
					return [ApiTypes.Webhooks];
				},
			}),
			getWebhookSettings: builder.query<
				IGetWebhookSettingsResponse,
				IGetWebhookSettingsRequest
			>({
				query: ({ botId }) => {
					const myHeaders = returnHeaders(`/bots/${botId}/update/webhook`);

					return {
						url: `/bots/${botId}/update/webhook`,
						method: 'GET',
						redirect: 'follow',
						headers: myHeaders,
					};
				},
				providesTags() {
					return [{ type: ApiTypes.Webhooks }];
				},
			}),
			addIntegration: builder.mutation<void, IAddIntegrationRequest>({
				query: ({ botId, token, model, customModel, prompt, temperature, maxLen }) => {
					const myHeaders = returnHeaders(`/bots/${botId}/update/add-integration`);

					return {
						url: `/bots/${botId}/update/add-integration`,
						method: 'POST',
						redirect: 'follow',
						headers: myHeaders,
						body: {
							token,
							model,
							customModel,
							prompt,
							temperature,
							maxLen,
						},
					};
				},
				invalidatesTags() {
					return [ApiTypes.Bots];
				},
			}),
			removeIntegration: builder.mutation<void, IRemoveIntegrationRequest>({
				query: ({ botId }) => {
					const myHeaders = returnHeaders(`/bots/${botId}/update/remove-integration`);

					return {
						url: `/bots/${botId}/update/remove-integration`,
						method: 'DELETE',
						redirect: 'follow',
						headers: myHeaders,
					};
				},
				invalidatesTags() {
					return [ApiTypes.Bots];
				},
			}),
			updateWidgetChatSettings: builder.mutation<void, IUpdateWidgetChatSettingsRequest>({
				query: ({ botId, settings }) => {
					const myHeaders = returnHeaders(`/bots/widget-chat/update/${botId}`);

					return {
						url: `/bots/widget-chat/update/${botId}`,
						method: 'PATCH',
						redirect: 'follow',
						headers: myHeaders,
						body: {
							...settings,
						},
					};
				},
			}),
			getWidgetChatSettings: builder.query<IGetWidgetChatSettingsResponse, IGetBotRequest>({
				query: ({ botId }) => {
					const myHeaders = returnHeaders(`/bots/widget-chat/settings/${botId}`);

					return {
						url: `/bots/widget-chat/settings/${botId}`,
						method: 'GET',
						redirect: 'follow',
						headers: myHeaders,
					};
				},
			}),
		}),
		overrideExisting: false,
	});

export const {
	useGetBotsListQuery,
	useCreateNewBotMutation,
	useDeleteBotMutation,
	useSendMsgToDialogFromBotMutation,
	useSendFileToDialogFromBotMutation,
	useGetCommandsListQuery,
	useCreateNewCommandMutation,
	useDeleteCommandMutation,
	useGetBotQuery,
	useSendChainMutation,
	useBulkSendChainMutation,
	useBulkTestSendChainMutation,
	useSetBotOwnerQuery,
	useUpdateWebhookMutation,
	useDeactivateWebhookMutation,
	useChangeTokenMutation,
	useTransferBotMutation,
	useEditCommandMutation,
	useActivateCommandMutation,
	useGetWebhookSettingsQuery,
	useAddIntegrationMutation,
	useRemoveIntegrationMutation,
	useUpdateWidgetChatSettingsMutation,
	useGetWidgetChatSettingsQuery,
} = extendedApi;
