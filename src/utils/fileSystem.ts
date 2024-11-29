import {promises as fsPromises} from 'fs';
import {join} from 'path';
import {Attachment, EmailData} from '../interfaces/email.js';
import {createLogger} from './logger.js';

const logger = createLogger(import.meta.url);
import {existsSync} from 'fs';

const DATA_DIR = join(process.cwd(), 'data');

// Funkcja do tworzenia bezpiecznej nazwy folderu/pliku
function sanitizeFileName(name: string): string {

    const cleanName = name
        .replace(/^(RE:|FW:|FWD:|PD:)\s*/i, '') // Usuń przedrostki związane z odpowiedziami/forwardami
        .trim();                                 // Usuń białe znaki z początku i końca

    // Sanityzacja nazwy pliku
    return cleanName
        .replace(/[/\\?%*:|"<>]/g, '-') // zamień niedozwolone znaki na myślnik
        .replace(/\s+/g, '_')           // zamień spacje na podkreślniki
        .replace(/\.+/g, '.')           // usuń wielokrotne kropki
        .toLowerCase();                 // zmień na małe litery
}

// Funkcja do generowania unikalnej nazwy pliku
async function generateUniqueFileName(folderPath: string, baseName: string): Promise<string> {
    let counter = 1;
    let fileName = `${sanitizeFileName(baseName)}.json`;

    // Sprawdź czy plik już istnieje, jeśli tak, dodaj licznik
    while (existsSync(join(folderPath, fileName))) {
        fileName = `${sanitizeFileName(baseName)}_${counter}.json`;
        counter++;
    }

    return fileName;
}

export async function initializeDataDirectory(): Promise<void> {
    try {
        await fsPromises.mkdir(DATA_DIR, {recursive: true});
        logger.info('Utworzono główny katalog data');
    } catch (error) {
        logger.error('Błąd podczas tworzenia katalogu data:', error);
        throw error;
    }
}

export async function resetDataDirectory(): Promise<void> {
    try {
        if (existsSync(DATA_DIR)) {
            await fsPromises.rm(DATA_DIR, {recursive: true, force: true});
            logger.info('Usunięto folder data z zapisanymi mailami');
        }
        await initializeDataDirectory();
        logger.info('Utworzono nowy pusty folder data');
    } catch (error) {
        logger.error('Błąd podczas resetowania katalogu data:', error);
        throw error;
    }
}

async function getEmailFolderPath(emailSubject: string): Promise<string> {
    const subjectFolder = emailSubject
        ? sanitizeFileName(emailSubject)
        : 'no_subject';
    const folderPath = join(DATA_DIR, subjectFolder);
    await fsPromises.mkdir(folderPath, {recursive: true});
    return folderPath;
}

export async function saveAttachment(messageId: string, emailSubject: string, attachment: Attachment): Promise<void> {
    try {
        // Uzywamy tej samej nazwy folderu co temat maila
        const emailFolderPath = await getEmailFolderPath(emailSubject);
        const attachmentDir = join(emailFolderPath, 'attachments', messageId);
        await fsPromises.mkdir(attachmentDir, {recursive: true});

        // Przygotuj nazwe pliku
        const fileName = sanitizeFileName(attachment.name);
        const filePath = join(attachmentDir, fileName);

        if (attachment.contentBytes) {
            // Zapisz zawartość załącznika do pliku jezeli jest dostępna
            const buffer = Buffer.from(attachment.contentBytes, 'base64'); // Konwersja base64 do bufora
            await fsPromises.writeFile(filePath, buffer);
            logger.info(`Zapisano załącznik: ${fileName} dla wiadomości: ${messageId}`);
        } else {
            logger.warn(`Załącznik: ${fileName} dla wiadomości: ${messageId} nie zawiera danych`);
        }
    } catch (error) {
        logger.error(`Błąd podczas zapisywania załącznika ${messageId}:`, error);
        throw error;
    }
}

export async function saveEmailToFile(messageId: string, emailData: EmailData): Promise<void> {
    try {
        const folderPath = await getEmailFolderPath(emailData.subject);
        const fileName = await generateUniqueFileName(
            folderPath,
            `${emailData.subject}_${new Date(emailData.metadata.receivedDateTime).toISOString().split('T')[0]}`
        );

        const filePath = join(folderPath, fileName);

        await fsPromises.writeFile(
            filePath,
            JSON.stringify(emailData, null, 2),
            'utf-8'
        );

        logger.info(`Zapisano wiadomość: ${fileName}`);
    } catch (error) {
        logger.error(`Błąd podczas zapisywania wiadomości ${messageId}:`, error);
    }
}