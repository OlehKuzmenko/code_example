import classNames from 'classnames';
import { ChangeEvent, FC, useCallback, useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createSelector } from '@reduxjs/toolkit';
import { useNavigate } from 'react-router-dom';
import { ChatInterface } from '@/pages/Dialogs/ChatInterface';
import { debounce, parseErrorField } from '@/helpers/helpers';
import { EViewMode } from '@/constants/enums/EViewMode';
import Button, { ButtonGroup } from '@/components/bootstrap/Button';
import Card, {
	CardActions,
	CardBody,
	CardFooter,
	CardFooterLeft,
	CardFooterRight,
	CardHeader,
} from '@/components/bootstrap/Card';
import Textarea from '@/components/bootstrap/forms/Textarea';
import Tooltips from '@/components/bootstrap/Tooltips';
import { ChatAvatar } from '@/components/Chat';
import Icon from '@/components/icon/Icon';
import { EMessageContentTypes } from '@/constants/enums/EMessageContentTypes';
import { ETariffsNames } from '@/constants/enums/ETariffsNames';
import ThemeContext from '@/contexts/themeContext';
import { getLanguages } from '@/lang';
import { useGetMyProfileQuery } from '@/redux/profile/api';
import { IBotDialogMessage } from '@/interfaces/IBot';
import { IBotDialog } from '@/interfaces/IBotDialog';
import './style.scss';
import {
	useChangeOpenStatusMutation,
	useGetChatInfoQuery,
	useStopMailingMutation,
} from '@/redux/botsChats/api';
import { showNotification } from '@/components/extras/showNotification';
import fallbackImage from '@/assets/img/wanna/wanna3.webp';
import { useAppDispatch, useAppSelector } from '@/hooks/useRedux';
import { IChatState, setChatStatus, setOpenDialogs } from '@/redux/bots/reducer';
import { RootState } from '@/redux';
import { EDialogType } from '@/constants/enums/EDialogType';
import {
	useSendFileToDialogFromBotMutation,
	useSendMsgToDialogFromBotMutation,
} from '@/redux/bots/api';
import { EChatStatus } from '@/constants/enums/EChatStatus';
import { SendFileToChatModal } from '../SendFileToChatModal/SendFileToChatModal';

interface IDialogMessages {
	selectedDialog: IBotDialog | undefined;
	onScrollChat: () => void;
	dialogMessages: IBotDialogMessage[] | undefined;
	isGroup: boolean;
	handleChangeViewMode: (mode: EViewMode) => void;
	count: number;
}

const selectBots = (state: RootState): IChatState => state.bots;

const openDialogsSelector = createSelector(selectBots, (state) => state.openDialogs);

export const DialogMessages: FC<IDialogMessages> = ({
	onScrollChat,
	dialogMessages,
	isGroup,
	count,
	selectedDialog,
	handleChangeViewMode,
}) => {
	const { t } = useTranslation(getLanguages(['dialogs']));
	const { xlDesign, mobileDesign } = useContext(ThemeContext);
	const { data: profile } = useGetMyProfileQuery();
	const hasDialogs = Boolean(dialogMessages?.length);

	const navigate = useNavigate();

	const [openModal, setOpenModal] = useState<boolean>(false);
	const [text, setText] = useState<string>('');

	const openDialogs = useAppSelector(openDialogsSelector);
	const dispatch = useAppDispatch();

	useEffect(() => {
		if (text) {
			setText('');
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedDialog]);

	const [sendMsgToDialogFromBot, { isLoading: isSendingMsg }] =
		useSendMsgToDialogFromBotMutation();
	const handleSendMessage = debounce(
		useCallback(
			(msg: string): void => {
				if (selectedDialog?.id) {
					sendMsgToDialogFromBot({
						botId: selectedDialog?.botId,
						chatId: selectedDialog?.id,
						msg,
					})
						.unwrap()
						.catch((e) => {
							const _error = parseErrorField(e);
							showNotification(
								t(
									'my-bot:bot-structure.new-trigger.commands.error-keywords',
								).toString(),
								_error.message.join(', '),
								'danger',
							);
						});
				}
			},
			[selectedDialog?.id, selectedDialog?.botId, sendMsgToDialogFromBot, t],
		),
		300,
	);

	const [sendFileToDialogFromBot] = useSendFileToDialogFromBotMutation();
	const handleSendPhoto = debounce(
		useCallback(
			({
				msg,
				file,
				fileType,
			}: {
				msg: string;
				file: File;
				fileType: EMessageContentTypes;
			}): void => {
				if (selectedDialog?.id) {
					sendFileToDialogFromBot({
						botId: selectedDialog?.botId,
						chatId: selectedDialog?.id,
						msg,
						file,
						fileType,
					})
						.unwrap()
						.catch((e) => {
							const _error = parseErrorField(e);
							showNotification(
								t(
									'my-bot:bot-structure.new-trigger.commands.error-keywords',
								).toString(),
								_error.message.join(', '),
								'danger',
							);
						});
				}
			},
			[selectedDialog?.id, selectedDialog?.botId, sendFileToDialogFromBot, t],
		),
		300,
	);

	const [stopMailing] = useStopMailingMutation();
	const { data: chatData } = useGetChatInfoQuery(
		{
			chatId: Number(selectedDialog?.id),
		},
		{ skip: !selectedDialog?.id || isGroup },
	);

	const handleSubmit = debounce(
		useCallback(() => {
			if (text) {
				handleSendMessage(text);
				setText('');
				if (!chatData?.expirationDate && selectedDialog) {
					stopMailing({
						botId: selectedDialog?.botId,
						chatId: selectedDialog?.id,
						hours: 1,
					})
						.unwrap()
						.catch((e) => {
							const _error = parseErrorField(e);
							showNotification(
								t(
									'my-bot:bot-structure.new-trigger.commands.error-keywords',
								).toString(),
								_error.message.join(', '),
								'danger',
							);
						});
				}
			}
		}, [chatData?.expirationDate, handleSendMessage, selectedDialog, stopMailing, t, text]),
		300,
	);

	const [changeStatus] = useChangeOpenStatusMutation();

	const handleChangeOpenStatus = useCallback(() => {
		if (selectedDialog) {
			changeStatus({
				botId: selectedDialog.botId,
				chatId: selectedDialog.id,
				openStatus: !selectedDialog.isOpenStatus,
			})
				.then(() => {
					const dialogs = new Set(openDialogs);
					if (selectedDialog.isOpenStatus) {
						dialogs.delete(selectedDialog.id);
						dispatch(setOpenDialogs({ dialogs: Array.from(dialogs) }));
					} else {
						dialogs.add(selectedDialog.id);
						dispatch(setOpenDialogs({ dialogs: Array.from(dialogs) }));
					}
				})
				.finally(() => {
					dispatch(setChatStatus({ status: EChatStatus.ALL }));
				});
		}
	}, [changeStatus, dispatch, openDialogs, selectedDialog]);

	return (
		<>
			<Card stretch>
				{!hasDialogs && (
					<CardBody>
						<div className='d-flex align-items-center justify-content-center w-100 h-100'>
							<p className='fw-bolder fs-3 text-muted'>
								<Icon icon='MarkChatUnread' size='3x' className='me-2' />
								{t('dialogs.selectDialog')}
							</p>
						</div>
					</CardBody>
				)}
				{hasDialogs && (
					<>
						<CardHeader
							className='d-flex flex-column flex-sm-row align-items-start align-items-sm-center justify-content-between gap-3'
							borderSize={1}>
							<div className='d-flex m-0 gap-2 align-items-center'>
								{mobileDesign && (
									<CardActions className='m-0 h-100'>
										<Button
											isLight
											color='primary'
											onClick={() => {
												handleChangeViewMode(EViewMode.List);
												navigate(`/dialogs/${selectedDialog?.botId}`);
											}}
											className='h-100'>
											<Icon icon='ArrowBack' size='2x' />
										</Button>
									</CardActions>
								)}
								<CardActions
									className={classNames({ 'cursor-pointer': xlDesign })}
									onClick={() => {
										if (xlDesign) {
											handleChangeViewMode(EViewMode.Info);
										}
									}}>
									<div className='d-flex align-items-center'>
										<ChatAvatar
											src={selectedDialog?.avatar?.url || fallbackImage}
											className='me-3'
										/>
										<div className='fw-bold'>{selectedDialog?.name}</div>
									</div>
								</CardActions>
							</div>
							{selectedDialog?.type !== EDialogType.CHANNEL && (
								<CardActions className='w-100 w-sm-auto'>
									<Button
										color={selectedDialog?.isOpenStatus ? 'danger' : 'success'}
										icon={
											selectedDialog?.isOpenStatus
												? 'CheckCircle'
												: 'CallMade'
										}
										className='w-100 w-sm-auto'
										onClick={handleChangeOpenStatus}
										size='sm'>
										{selectedDialog?.isOpenStatus
											? t('dialogs.closeChatBtn')
											: t('dialogs.openChatBtn')}
									</Button>
								</CardActions>
							)}
						</CardHeader>
						<CardBody
							className='py-1 pe-1 chat-scrollBox overflow-auto d-flex flex-column-reverse'
							id='scrollableDiv'
							style={{ height: '10rem' }}>
							{dialogMessages && (
								<ChatInterface
									dialogMessages={dialogMessages}
									onScrollChat={onScrollChat}
									count={count}
									isGroup={isGroup}
								/>
							)}
						</CardBody>
						<CardFooter borderSize={1} className='d-flex flex-row align-items-center'>
							<CardFooterLeft className='w-70 w-sm-85 w-md-100 h-100 m-0'>
								<Textarea
									rows={2}
									isEmojiPicker
									value={text}
									className='rounded-start h-100'
									wrapperClassName='h-100'
									onChange={(e: ChangeEvent<HTMLTextAreaElement>) => {
										// @ts-ignore
										if (e.nativeEvent.inputType !== 'insertLineBreak') {
											setText(e.target.value);
										}
									}}
									placeholder={t('dialogs.sendMsgPlaceholder').toString()}
									onKeyDown={(e) => {
										if (e.code === 'Enter' && e.shiftKey) {
											setText((prev) => `${prev}\n`);
										} else if (e.code === 'Enter') {
											e.preventDefault();
											handleSubmit();
										}
									}}
									style={{
										resize: 'none',
										borderRadius: 0,
									}}
									limit={500}
								/>
							</CardFooterLeft>
							<CardFooterRight className='w-30 w-sm-15 w-md-auto h-100'>
								<ButtonGroup className='h-100 w-100'>
									<Tooltips
										isDisableElements
										title={
											profile?.tariff.name === ETariffsNames.Free
												? t('dialogs.sendFileTariffTooltip')
												: t('dialogs.sendFileTooltip')
										}>
										<Button
											icon='AttachFile'
											size='lg'
											className='h-100'
											color='primary'
											isOutline
											rounded={0}
											isDisable={profile?.tariff.name === ETariffsNames.Free}
											onClick={() => {
												setOpenModal(true);
											}}
										/>
									</Tooltips>
									<Button
										icon='Send'
										size='lg'
										className='h-100'
										color='primary'
										isDisable={!text.trim() || isSendingMsg}
										onClick={handleSubmit}
									/>
								</ButtonGroup>
							</CardFooterRight>
						</CardFooter>
					</>
				)}
			</Card>
			{openModal && (
				<SendFileToChatModal
					openModal={openModal}
					setOpenModal={setOpenModal}
					handleSendPhoto={handleSendPhoto}
				/>
			)}
		</>
	);
};
