import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {createMotionServer} from './server';
const server=createMotionServer();
await server.connect(new StdioServerTransport());
console.error('motion-debugger MCP ready on stdio');
