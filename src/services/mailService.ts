import {Client} from '@microsoft/microsoft-graph-client';
import {EmailData, MessageResponse, UserResponse, Attachment} from '../interfaces/email.js';
import {EmailParser} from '../utils/emailParser.js';
import {saveEmailToFile, saveAttachment, resetDataDirectory} from '../utils/fileSystem.js';
import {createLogger} from '../utils/logger.js';

const logger = createLogger(import.meta.url);

export class MailService {
    constructor(private client: Client) {
    }

    // Metody prywatne dla pobierania zalacznikow i odznaczania maili jako przeczytane
    private async getAttachment(userId: undefined | string, messageId: string): Promise<Attachment[]> {
        try {
            const response = await this.client
                .api(`/users/${userId}/messages/${messageId}/attachments`)
                .get();

            logger.info(`Pobrano listę ${response.value.length} załączników dla maila ${messageId}`);
            // Poprzez GRAPH API pobieramy liste zalacznikow dla danego maila
            return response.value;
        } catch (error) {
            logger.error(`Wystąpił błąd podczas pobierania załącznika: ${error}`);
            return [];
        }
    }

    private async downloadAttachment(userId: undefined | string, messageId: string, attachmentId: string): Promise<Attachment | null> {
        try {
            const attachment = await this.client
                .api(`/users/${userId}/messages/${messageId}/attachments/${attachmentId}`)
                .get();

            logger.info(`Pobrano załącznik ${attachmentId} dla maila ${messageId}`);
            return attachment;
        } catch (error) {
            logger.error(`Wystąpił błąd podczas pobierania załącznika: ${error}`);
            return null;
        }
    }

    // private async markAsUnread(userId: string, messageId: string): Promise<void> {
    //     try {
    //         logger.info(`Próba oznaczenia maila ${messageId} jako nieprzeczytany...`);
    //         const response = await this.client
    //             .api(`/users/${userId}/messages/${messageId}`)
    //             .header('Prefer', 'return=minimal')
    //             .patch({
    //                 isRead: false,
    //                 isReadReceiptRequested: false,
    //                 // flags: {
    //                 //     flagStatus: 'notFlagged'
    //                 // }
    //             });
    //
    //         logger.info(`Mail ${messageId} oznaczony jako nieprzeczytany. Odpowiedź:`, response);
    //     } catch (error) {
    //         logger.error(`Błąd podczas oznaczania maila jako nieprzeczytany: ${error}`, {
    //             userId,
    //             messageId,
    //             errorDetails: error instanceof Error ? error.message : 'Unknown error'
    //         });
    //         throw error; // TODO usunac throw
    //     }
    // }

    private async markAsRead(userId: undefined | string, messageId: string): Promise<void> {
        try {
            logger.info(`Oznaczanie maila ${messageId} jako przeczytany...`);

            await this.client
                .api(`/users/${userId}/messages/${messageId}`)
                .update({
                    isRead: true  // Zmieniamy na true!
                });

            logger.info(`Mail ${messageId} oznaczono jako przeczytany`);
        } catch (error) {
            logger.error(`Nie udało się oznaczyć maila ${messageId} jako przeczytany: ${error}`);
        }
    }

    async listUsers(): Promise<UserResponse[]> {
        try {
            const response = await this.client
                .api('/users')
                .select('id,displayName,userPrincipalName,mail')
                .get();

            const users: UserResponse[] = response.value;
            logger.info('\nDostępni użytkownicy:');
            users.forEach((user, index) => {
                logger.info(`${index + 1}. ${user.displayName} (${user.mail || user.userPrincipalName})`);
                logger.info(`   ID: ${user.id}\n`);
            });

            return users;
        } catch (error) {
            logger.error('Błąd podczas pobierania listy użytkowników:', error);
            throw error;
        }
    }

    async fetchUserEmails(userId: undefined | string): Promise<void> {
        try {
            logger.info(`\nPobieram nieprzeczytane maile dla użytkownika o ID: ${userId}`);

            const response = await this.client
                .api(`/users/${userId}/messages`)
                .select('id,subject,body,from,toRecipients,ccRecipients,receivedDateTime,hasAttachments,isRead')
                .filter('isRead eq false')  // Tylko nieprzeczytane
                .top(50)
                .get();

            const messages: MessageResponse[] = response.value;

            for (const message of messages) {
                try {
                    // Pobierz załączniki jeśli są
                    let attachments: Attachment[] = [];
                    if (message.hasAttachments) {
                        attachments = await this.getAttachment(userId, message.id);

                        // Pobierz fizycznie kazdy zalacznik
                        for (const attachment of attachments) {
                            const fullAttachment = await this.downloadAttachment(userId, message.id, attachment.id);
                            if (fullAttachment) {
                                await saveAttachment(message.id, message.subject, fullAttachment);
                            }
                        }
                    }

                    // Parsuj tresc maila
                    const emailData = EmailParser.parse(message);
                    emailData.content.physicalAttachments = attachments;
                    await saveEmailToFile(message.id, emailData);

                    // Oznacz maila jako nieprzeczytanego
                    await this.markAsRead(userId, message.id);
                    logger.info(`Przetworzono maila: ${message.id} oraz oznaczono jako nieprzeczytanego`);
                } catch (error) {
                    logger.error(`Błąd podczas przetwarzania maila ${message.id}: ${error}`);
                }
            }

            logger.info(`Zakończono pobieranie wiadomości. Przetworzono ${messages.length} maili`);
        } catch (error) {
            logger.error('Wystąpił błąd:', error);
            throw error;
        }
    }

    async resetAllEmailsToUnread(userId: undefined | string): Promise<void> {
        try {
            logger.info(`\nResetowanie wszystkich maili do nieprzeczytanych dla użytkownika o ID: ${userId}`);

            const response = await this.client
                .api(`/users/${userId}/messages`)
                .select('id,isRead')
                .filter('isRead eq true')  // Tylko przeczytane
                .top(999) // Maksymalnie 999 maili
                .get();

            const messages: MessageResponse[] = response.value;
            logger.info(`Znaleziono ${messages.length} maili do zresetowania`);

            let successCount = 0;
            let errorCount = 0;

            for (const message of messages) {
                try {
                    await this.client
                        .api(`/users/${userId}/messages/${message.id}`)
                        .update({
                            isRead: false
                        });
                    successCount++;
                    logger.debug(`Mail ${message.id} oznaczono jako nieprzeczytany`);
                } catch (error) {
                    errorCount++;
                    logger.error(`Błąd podczas resetowania maila ${message.id}: ${error}`);
                }
            }
        } catch (error) {
            logger.error(`Błąd podczas resetowania oznaczen wiadomosci: ${error}`);
        }
    }

    async resetAll(userId: undefined | string): Promise<void> {
        try {
            // Resetuj pliki
            await resetDataDirectory();
            // Resetuj status maili
            await this.resetAllEmailsToUnread(userId);
            logger.info('Reset zakończony pomyślnie');
        } catch (error) {
            logger.error('Błąd podczas pełnego resetu:', error);
        }
    }
}
