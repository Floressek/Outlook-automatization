import winston from "winston";
import type {TransformableInfo} from 'logform';
import path from 'path';
import chalk from 'chalk';
import {fileURLToPath} from 'url';
import {dirname} from 'path';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Constants
const DEFAULT_LOG_LEVEL = 'debug';
const TIME_ZONE = 'Europe/Warsaw';
const DATE_FORMAT = 'en-GB';

type LogLevel = 'info' | 'warn' | 'error' | 'debug' | 'http' | 'verbose' | 'silly';

interface ColorMap {
    [key: string]: typeof chalk.green;
}

const CONSOLE_COLOR_MAP: ColorMap = {
    info: chalk.green,
    warn: chalk.yellow,
    error: chalk.red,
    debug: chalk.blue,
    http: chalk.cyan,
    verbose: chalk.magenta,
    silly: chalk.grey
};

// Force colors
chalk.level = 3;

const formatDateInTimeZone = (date: Date, timeZone: string): string => {
    const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: timeZone,
        hour12: false
    };
    const formatted = new Intl.DateTimeFormat(DATE_FORMAT, options).format(date);
    const ms = date.getMilliseconds().toString().padStart(3, '0');
    return `${formatted}.${ms}`;
};

const logFormat = winston.format.combine(
    winston.format.timestamp({
        format: () => formatDateInTimeZone(new Date(), TIME_ZONE)
    }),
    winston.format.errors({stack: true}),
    winston.format.splat(),
    winston.format.json()
);

const getLogFilePath = (filename: string): string =>
    path.join(__dirname, '..', '..', 'logs', filename);

const fileTransport = (filename: string, level: string = 'debug'): winston.transport =>
    new winston.transports.File({
        filename: getLogFilePath(filename),
        level,
        format: logFormat
    });

const consoleFormat = winston.format.printf((info: TransformableInfo): string => {
    const colorizerFn = CONSOLE_COLOR_MAP[info.level] ?? chalk.white;
    const colorizedLevel = colorizerFn(info.level);
    const colorizedTimestamp = chalk.gray(info.timestamp || '');
    const colorizedLabel = chalk.hex('#FFA500')(info.label || ''); // Orange
    const colorizedFilename = chalk.hex('#00CED1')(info.filename || ''); // Dark Turquoise
    return `${colorizedTimestamp} [${colorizedLevel}] [${colorizedLabel}] [${colorizedFilename}]: ${info.message}`;
});

const consoleTransport = new winston.transports.Console({
    format: winston.format.combine(
        winston.format.colorize(),
        consoleFormat
    )
});

export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || DEFAULT_LOG_LEVEL,
    format: logFormat,
    transports: [
        fileTransport('combined.log'),
        fileTransport('error.log', 'error'),
        consoleTransport
    ]
});

interface WrapperLogger {
    [key: string]: (message: string | object, ...meta: unknown[]) => void;
}

export function createLogger(filePath: string): WrapperLogger {
    // Convert file:// URL to path if necessary
    const actualPath = filePath.startsWith('file:')
        ? fileURLToPath(filePath)
        : filePath;

    const projectRoot = path.resolve(__dirname, '..', '..');
    const relativePath = path.relative(projectRoot, actualPath);
    const folderStructure = path.dirname(relativePath).replace(/\\/g, '/');
    const filename = path.basename(actualPath);

    const childLogger = logger.child({
        label: folderStructure,
        filename: filename
    });

    const wrapperLogger: WrapperLogger = {};

    (['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'] as const).forEach(level => {
        wrapperLogger[level] = (message: string | object, ...meta: unknown[]) => {
            const formattedMessage = typeof message === 'object'
                ? JSON.stringify(message, null, 2)
                : message;
            childLogger[level](formattedMessage, ...meta);
        };
    });

    return wrapperLogger;
}