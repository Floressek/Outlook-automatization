import {config} from 'dotenv';
import {Credentials} from '../interfaces/credentials.js';

config();

export function getCredentials(): Credentials {
    const credentials: Credentials = {
        clientId: process.env.CLIENT_ID ?? '',
        clientSecret: process.env.CLIENT_SECRET ?? '',
        tenantId: process.env.TENANT_ID ?? ''
    };

    if (!credentials.clientId || !credentials.clientSecret || !credentials.tenantId) {
        throw new Error('Missing required environment variables. Please check your .env file');
    }

    return credentials;
}