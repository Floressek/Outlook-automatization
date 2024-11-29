# Outlook Email Fetcher

A TypeScript application for fetching emails from Microsoft Outlook using Microsoft Graph API.

## Prerequisites

- Node.js (v14 or higher)
- npm (Node Package Manager)
- Microsoft Azure Account with registered application
- Required Microsoft Graph API permissions:
    - User.Read.All (application permission)
    - Mail.Read or Mail.ReadBasic.All (application permission)

## Installation

1. Clone the repository:
```bash
git clone [your-repository-url]
cd [your-repository-name]
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file in the root directory with your Azure credentials:
```plaintext
CLIENT_ID=your_client_id
CLIENT_SECRET=your_client_secret
TENANT_ID=your_tenant_id
```

## Configuration

```
Alter-oferty-mailowe/
├── src/                      # Source files
│   ├── config/              # Configuration files
│   │   └── environment.ts   # Environment configuration
│   ├── interfaces/          # TypeScript interfaces
│   │   ├── email.ts
│   │   ├── credentials.ts
│   │   └── graph.ts
│   ├── services/           # Business logic services
│   │   ├── graphClient.ts  # Microsoft Graph client setup
│   │   └── mailService.ts  # Email fetching logic
│   ├── utils/              # Utility functions
│   │   ├── logger.ts
│   │   └── fileSystem.ts
│   └── index.ts            # Application entry point
├── dist/                   # Compiled JavaScript files
├── tests/                  # Test files
├── data/                   # Output directory for emails
├── .env                    # Environment variables
├── .env.example           # Example environment file
├── .gitignore
├── package.json
├── package-lock.json
├── tsconfig.json
└── README.md
```

Make sure your Azure Application has the required API permissions in Azure Portal:
1. Go to Azure Portal
2. Navigate to Azure Active Directory → App registrations
3. Select your application
4. Go to "API permissions"
5. Add necessary permissions (User.Read.All and Mail.Read)
6. Grant admin consent

## Usage

1. Build the project:
```bash
npm run build
```

2. Run the application:
```bash
npm start
```

The application will:
1. List all available users in your organization
2. Fetch emails from the first user's inbox
3. Save emails as JSON files in the `data` directory

## Project Structure

- `mail-fetcher.ts` - Main application file
- `data/` - Directory where emails are saved
- `.env` - Environment variables configuration
- `tsconfig.json` - TypeScript configuration
- `package.json` - Project dependencies and scripts

## Dependencies

- @microsoft/microsoft-graph-client
- @azure/identity
- dotenv
- TypeScript (dev dependency)

## Security Note

- Never commit your `.env` file to version control
- Keep your Azure credentials secure
- Follow the principle of least privilege when assigning permissions

