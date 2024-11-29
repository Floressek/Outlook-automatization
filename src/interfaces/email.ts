export interface EmailData {
    subject: string;
    content: {
        plainText: string;
        links: Array<{ text: string; url: string }>;
        attachments: Array<{ name: string; url: string }>;
        physicalAttachments: Array<Attachment>;
    };
    metadata: {
        from: string;
        to: string;
        cc?: string[];
        receivedDateTime: string;
        forwardChain?: Array<{  // Historia przekazywania
            from: string;
            to: string;
            date: string;
        }>;
    };
}

export interface Attachment {
    id: string;
    name: string;
    contentType: string;
    size: number;
    contentBytes?: string;
}

export interface MessageResponse {
    id: string;
    subject: string;
    body: {
        content: string;
    };
    from: {
        emailAddress: {
            name: string;
            address: string;
        };
    };
    toRecipients: Array<{
        emailAddress: {
            name: string;
            address: string;
        };
    }>;
    ccRecipients?: Array<{
        emailAddress: {
            name: string;
            address: string;
        };
    }>;
    receivedDateTime: string;
    hasAttachments: boolean; // Czy mail posiada zalaczniki
}

export interface UserResponse {
    id: string;
    displayName: string;
    userPrincipalName: string;
    mail: string;
}