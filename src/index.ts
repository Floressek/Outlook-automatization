import { initializeGraphClient } from './services/graphClient.js';
import { MailService } from './services/mailService.js';
import { initializeDataDirectory } from './utils/fileSystem.js';
import { createLogger } from './utils/logger.js';
const logger = createLogger(import.meta.url);
import { resetDataDirectory } from './utils/fileSystem.js';

async function main() {
    try {

        const args = process.argv.slice(2);
        const shouldReset = args.includes('--reset');

        // ID użytkownika do konfiguracji
        const userId = process.env.USER_ID;


        if (!userId) {
            logger.error('Nie znaleziono USER_ID w zmiennych środowiskowych');
        }

        const client = await initializeGraphClient();
        const mailService = new MailService(client);

        // Pokazuje wszystkich użytkowników
        logger.info('Pobieram listę użytkowników...');
        const users = await mailService.listUsers();

        if (users.length === 0) {
            logger.info('Nie znaleziono żadnych użytkowników');
            return;
        }

        if (shouldReset) {
            logger.info('Rozpoczynam pełny reset...');
            await mailService.resetAll(userId);
            logger.info('Reset zakończony');
            return;
        }

        await mailService.fetchUserEmails(userId);

        const selectedUser = users[users.length - 1];
        logger.info(`\nPobieram maile dla użytkownika: ${selectedUser.displayName}`);
        await mailService.fetchUserEmails(selectedUser.id);

    } catch (error) {
        logger.error('Wystąpił błąd:', error);
    }
}

main().catch(logger.error);