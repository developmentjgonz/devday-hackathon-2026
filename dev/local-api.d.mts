import type { IncomingMessage, ServerResponse } from 'node:http';
export function createLocalApi(root: string, config?: Record<string, string>): Promise<{ middleware: (request: IncomingMessage, response: ServerResponse, next: () => void) => Promise<void>; close: () => void }>;
