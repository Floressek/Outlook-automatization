import { initializeGraphClient } from './services/graphClient.js';
import { MailService } from './services/mailService.js';
import { initializeDataDirectory } from './utils/fileSystem.js';
import { createLogger } from './utils/logger.js';
const logger = createLogger(import.meta.url);
import { resetDataDirectory } from './utils/fileSystem.js';

async function main() {
    try {

        const shouldReset = process.argv.includes('--reset');

        if(shouldReset) {
            await resetDataDirectory();
            logger.info('Zresetowano folder data z zapisanymi mailami');
            return;
        }
        await initializeDataDirectory();

        const client = await initializeGraphClient();
        const mailService = new MailService(client);

        logger.info('Pobieram listę użytkowników...');
        const users = await mailService.listUsers();

        if (users.length === 0) {
            logger.info('Nie znaleziono żadnych użytkowników');
            return;
        }

        const selectedUser = users[users.length - 1];
        logger.info(`\nPobieram maile dla użytkownika: ${selectedUser.displayName}`);
        await mailService.fetchUserEmails(selectedUser.id);

    } catch (error) {
        logger.error('Wystąpił błąd:', error);
    }
}

main().catch(logger.error);