import {join} from 'path';
import {promises as fs} from 'fs';
import {WebScanner} from '../services/webScanner.js';
import {createLogger} from '../utils/logger.js';

const logger = createLogger(import.meta.url);

async function scanAllEmailLinks() {
    try {
        const dataDir = join(process.cwd(), 'data');
        const scanner = new WebScanner(dataDir);

        await scanner.initializeScanDirectory();

        // Przejdź przez wszystkie foldery w data
        const folders = await fs.readdir(dataDir);

        for (const folder of folders) {
            if (folder === 'scanned_pages') {
                continue;
            }

            const folderPath = join(dataDir, folder);
            const stat = await fs.stat(folderPath);

            if (stat.isDirectory()) {
                // Przejdź przez wszystkie pliki JSON w folderze
                const files = await fs.readdir(folderPath);
                for (const file of files) {
                    if (file.endsWith('.json')) {
                        const emailPath = join(folderPath, file);
                        logger.info(`Skanowanie linków z: ${emailPath}`);
                        await scanner.scanLinksFromEmail(emailPath);
                    }
                }
            }
        }

        logger.info('Zakończono skanowanie wszystkich linków');

    } catch (error) {
        logger.error('Wystąpił błąd podczas skanowania:', error);
    }
}

// Uruchom skanowanie
scanAllEmailLinks();