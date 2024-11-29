import { Client } from '@microsoft/microsoft-graph-client';
import { ClientSecretCredential } from '@azure/identity';
import { Credentials } from '../interfaces/credentials.js';
import { getCredentials } from '../config/environment.js';
import { createLogger } from '../utils/logger.js';
const logger = createLogger(import.meta.url);

export async function initializeGraphClient(): Promise<Client> {
    const credentials: Credentials = getCredentials();

    const credential = new ClientSecretCredential(
        credentials.tenantId,
        credentials.clientId,
        credentials.clientSecret
    );

    return Client.init({
        authProvider: async (done) => {
            try {
                const token = await credential.getToken(['https://graph.microsoft.com/.default']);
                if (!token?.token) {
                    logger.error('Failed to obtain token');
                }
                done(null, token.token);
            } catch (error) {
                done(error as Error, null);
            }
        },
    });
}