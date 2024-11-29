import {JSDOM} from 'jsdom';
import {EmailData} from '../interfaces/email.js';
import {logger} from './logger.js';

export class EmailParser {
    private static extractLinks(html: string): Array<{ text: string; url: string }> {
        try {
            logger.info('Rozpoczynam ekstrakcję linków...');
            const dom = new JSDOM(html);
            const links: Array<{ text: string; url: string }> = [];

            dom.window.document.querySelectorAll('a').forEach(link => {
                try {
                    const url = link.getAttribute('href');
                    if (url && !url.startsWith('mailto:')) {
                        links.push({
                            text: link.textContent || '',
                            url: url
                        });
                        logger.debug(`Znaleziony link: ${url}`);
                    }
                } catch (error) {
                    logger.error(`Błąd podczas przetwarzania pojedynczego linku: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            });

            logger.info(`Zakończono ekstrakcję linków. Znaleziono: ${links.length}`);
            return links;
        } catch (error) {
            logger.error(`Błąd podczas ekstrakcji linków: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return [];
        }
    }

    private static extractAttachments(html: string): Array<{ name: string; url: string }> {
        try {
            logger.info('Rozpoczynam ekstrakcję załączników...');
            const dom = new JSDOM(html);
            const attachments: Array<{ name: string; url: string }> = [];
            // Szukamy linkow do google drive bo takie przychodza ༼ つ ◕_◕ ༽つ
            dom.window.document.querySelectorAll('a[href*="drive.google.com"]').forEach(link => {
                try {
                    const url = link.getAttribute('href');
                    const name = link.textContent || 'Załącznik';
                    if (url) {
                        attachments.push({
                            name: name,
                            url: url
                        });
                        logger.debug(`Znaleziony załącznik: ${name} (${url})`);
                    }
                } catch (error) {
                    logger.error(`Błąd podczas przetwarzania pojedynczego załącznika: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            });

            logger.info(`Zakończono ekstrakcję załączników. Znaleziono: ${attachments.length}`);
            return attachments;
        } catch (error) {
            logger.error(`Błąd podczas ekstrakcji załączników: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return [];
        }
    }

    private static extractPlainText(html: string): string {
        try {
            logger.info('Rozpoczynam ekstrakcję tekstu...');
            // Create the JSDOM instance without beforeParse
            const dom = new JSDOM(html, {
                contentType: 'text/html'
            });

            // Usuń style i skrypty przed ekstrakcją tekstu
            dom.window.document.querySelectorAll('style, script').forEach(el => el.remove());

            const text = dom.window.document.body?.textContent || '';
            const normalizedText = text
                .replace(/\u00A0/g, ' ')    // Zamień NBSP na zwykłą spację
                .replace(/\s+/g, ' ')       // Zamień wielokrotne białe znaki na pojedynczą spację
                .trim();                    // Usuń białe znaki z początku i końca

            logger.info(`Zakończono ekstrakcję tekstu. Długość: ${normalizedText.length} znaków`);
            return normalizedText;
        } catch (error) {
            logger.error(`Błąd podczas ekstrakcji tekstu: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return '[Błąd podczas ekstrakcji tekstu]';
        }
    }

    private static extractForwardChain(html: string): Array<{ from: string; to: string; date: string }> {
        try {
            logger.info('Rozpoczynam ekstrakcję łańcucha przekazań...');
            const forwardChain: Array<{ from: string; to: string; date: string }> = [];
            const dom = new JSDOM(html);

            // Szukamy wzorcow przekazywwania maili
            dom.window.document.querySelectorAll('div').forEach(div => {
                try {
                    const text = div.textContent || '';
                    const fromMatch = text.match(/Od:\s*(.+?)(?=\n|$)/);
                    const toMatch = text.match(/Do:\s*(.+?)(?=\n|$)/);
                    const dateMatch = text.match(/Wysłane:\s*(.+?)(?=\n|$)/);

                    if (fromMatch && toMatch && dateMatch) {
                        const from = fromMatch[1].trim();
                        const to = toMatch[1].trim();
                        const date = dateMatch[1].trim();

                        if (from && to && date) {
                            forwardChain.push({from, to, date});
                            // Pelna wersja logowania przekazania !!!!
                            // logger.debug(`Znaleziono przekazanie: Od ${from} Do ${to} Data: ${date}`);
                            logger.debug(`Znaleziono przekazanie: Od ${from.substring(0, 50)} Do ${to.substring(0, 50)} Data: ${date.substring(0, 50)}`);
                        }
                    }
                } catch (error) {
                    logger.error(`Błąd podczas przetwarzania pojedynczego przekazania: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            });

            logger.info(`Zakończono ekstrakcję łańcucha przekazań. Znaleziono ${forwardChain.length} przekazań`);
            return forwardChain;
        } catch (error) {
            logger.error(`Błąd podczas ekstrakcji łańcucha przekazań: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return [];
        }
    }

    static parse(message: any): EmailData {
        try {
            if (!message?.body?.content) {
                logger.error('Brak wymaganej zawartości wiadomości');
            }

            logger.info(`Rozpoczynam parsowanie maila o temacie: "${message.subject || 'Brak tematu'}"`);
            const html = message.body.content;

            const parsedData = {
                subject: message.subject || 'Brak tematu',
                content: {
                    // Treść bez HTML, this jest wymagane bo extractPlainText jest metodą statyczną
                    plainText: this.extractPlainText(html),
                    links: this.extractLinks(html),
                    attachments: this.extractAttachments(html),
                    physicalAttachments: []  // Puste pole, będzie wypełnione później przez MailService
                },
                metadata: {
                    // Konstruowanie adresu email z nazwy i adresu
                    from: message.from?.emailAddress?.name && message.from?.emailAddress?.address
                        ? `${message.from.emailAddress.name} <${message.from.emailAddress.address}>`
                        : 'Nieznany nadawca',
                    to: message.toRecipients?.length
                        ? message.toRecipients.map((r: any) =>
                            `${r.emailAddress?.name || ''} <${r.emailAddress?.address || ''}>`
                        ).filter(Boolean).join(', ')
                        : 'Nieznany odbiorca',
                    receivedDateTime: message.receivedDateTime || new Date().toISOString(),
                    forwardChain: this.extractForwardChain(html)
                }
            };

            logger.info('Zakończono parsowanie maila');
            logger.debug('Sparsowane dane:', parsedData);

            return parsedData;
        } catch (error) {
            logger.error(`Błąd podczas parsowania maila: ${error instanceof Error ? error.message : 'Unknown error'}`);

            // Zwracamy podstawową strukturę w przypadku błędu
            return {
                subject: 'Błąd parsowania',
                content: {
                    plainText: '[Błąd podczas przetwarzania treści]',
                    links: [],
                    attachments: [],
                    physicalAttachments: []  // Puste pole
                },
                metadata: {
                    from: 'Nieznany nadawca',
                    to: 'Nieznany odbiorca',
                    receivedDateTime: new Date().toISOString(),
                    forwardChain: []
                }
            };
        }
    }
}