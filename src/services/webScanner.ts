import puppeteer from "puppeteer";
import {promises as fs} from "fs";
import {join} from "path";

import {createLogger} from '../utils/logger.js';

const logger = createLogger(import.meta.url);

export class WebScanner {
    private readonly scanDir: string; // folder do zapisu zrzutów ekranu
    // private browser: puppeteer.Browser | null = null;
    // private maxConcurrentScans = 4; // Ile stron na raz
    // private semaphore = new Semaphore(this.maxConcurrentScans);

    constructor(baseDir: string) {
        this.scanDir = join(baseDir, 'scanned_pages');
    }

    async initializeScanDirectory(): Promise<void> {
        await fs.mkdir(this.scanDir, {recursive: true});
    }

    async scanPage(url: string, pageName: string, outputDir : string): Promise<void> {
        try {
            logger.info(`Próba zeskanowania strony ${url}...`);

            const browser = await puppeteer.launch({headless: true});  // headless: true - uruchomienie przeglądarki w trybie bez GUI
            const page = await browser.newPage();

            // Ustaw timeout na 30 sekund
            await page.setDefaultNavigationTimeout(30000);

            // Przejdz do strony
            // waitUntil: 'networkidle0' - czekaj aż nie będzie żadnych aktywnych połączeń sieciowych,
            // networkidle2 - czekaj aż nie będzie więcej niż 2 aktywnych połączeń sieciowych
            await page.goto(url, {waitUntil: 'networkidle0'});

            // Pobierz zawartosc strony
            const content = await page.content();
            const title = await page.title();
            const text = await page.evaluate(() => document.body.innerText);

            // Tworzenie folderu scanned_pages w katalogu maila
            const scanDir = join(outputDir, 'scanned_pages');
            await fs.mkdir(scanDir, {recursive: true});

            // Użyj tytułu strony lub URL jako nazwy pliku
            const safeFileName = this.createSafeFileName(title || new URL(url).hostname);
            const screenshotPath = join(scanDir, `${safeFileName}_screenshot.png`);

            await page.screenshot({path: screenshotPath, fullPage: true});

            // const pageData = {
            //     url,
            //     title,
            //     content: text,
            //     scannedAt: new Date().toISOString(),
            //     screenshotPath
            // }
            //
            // await fs.writeFile(
            //     join(this.scanDir, `${pageName}.json`),
            //     JSON.stringify(pageData, null, 2),
            //     'utf-8'
            // )


            await fs.writeFile(
                join(scanDir, `${safeFileName}.json`),
                JSON.stringify({url, title, content: text, scannedAt: new Date().toISOString()}, null, 2),
                'utf-8'
            );
            await browser.close();
            logger.info(`Zakonczono skanowanie strony ${url}`);

        } catch (error) {
            logger.error(`Wystąpił błąd podczas skanowania strony ${url}: ${error}`);
        }
    }

    async scanLinksFromEmail(emailPath: string): Promise<void> {
        try {
            // Wczytaj plik z maila
            const emailContent = await fs.readFile(emailPath, 'utf-8');
            const emailData = JSON.parse(emailContent);
            const emailDir = join(emailPath, '..');

            if (!emailData.content.links?.length) {
                logger.info(`Brak linków w ${emailPath}`);
                return;
            }

            logger.info(`Znaleziono ${emailData.content.links.length} linków`);
            for (const link of emailData.content.links) {
                try {
                    const safeName = this.createSafeFileName(link.text || new URL(link.url).hostname);
                    await this.scanPage(link.url, safeName, emailDir);
                } catch (error) {
                    logger.error(`Błąd skanowania ${link.url}: ${error}`);
                }
            }
        } catch (error) {
            logger.error(`Błąd skanowania linków z ${emailPath}: ${error}`);
        }
    }

    private createSafeFileName(name: string): string {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '')
            .substring(0, 50);
    }
}