#!/usr/bin/env node

import meow from 'meow'
import './eventsource-polyfill.js'
import {
  runWithCommand,
  runWithConfig,
  runWithConfigNonInteractive,
  runWithSSE,
  runWithURL,
  runListToolsNonInteractive,
} from './mcp.js'
import { purge } from './config.js'

const cli = meow(
  `
	Usage
    $ mcp-cli
    $ mcp-cli --config [config.json]
    $ mcp-cli [--pass-env] npx <package-name> <args>
    $ mcp-cli [--pass-env] node path/to/server/index.js args...
    $ mcp-cli --url http://localhost:8000/mcp
    $ mcp-cli --sse http://localhost:8000/sse
    $ mcp-cli purge
    $ mcp-cli [--config config.json] call-tool <server_name>:<tool_name> [--args '{"key":"value"}']
    $ mcp-cli [--config config.json] read-resource <server_name>:<resource_uri>
    $ mcp-cli [--config config.json] get-prompt <server_name>:<prompt_name> [--args '{"key":"value"}']
    $ mcp-cli [--config config.json] list-tools-for <server_name>

	Options
	  --config, -c    Path to the config file
    --pass-env, -e  Pass environment variables in current shell to stdio server
    --url           Streamable HTTP endpoint
    --sse           SSE endpoint
    --args          JSON arguments for tools and prompts (non-interactive mode)
`,
  {
    importMeta: import.meta,
    flags: {
      config: {
        type: 'string',
        shortFlag: 'c',
      },
      passEnv: {
        type: 'boolean',
        shortFlag: 'e',
      },
      url: {
        type: 'string',
      },
      sse: {
        type: 'string',
      },
      args: {
        type: 'string',
      },
    },
  },
)

if (cli.input[0] === 'call-tool' || cli.input[0] === 'read-resource' || cli.input[0] === 'get-prompt') {
  runWithConfigNonInteractive(cli.flags.config, cli.input[0], cli.input[1], cli.flags.args);
} else if (cli.input[0] === 'list-tools-for') {
  runListToolsNonInteractive(cli.flags.config, cli.input[1]);
} else if (cli.input[0] === 'npx' || cli.input[0] === 'node') {
  const [command, ...args] = cli.input;
  runWithCommand(command, args, cli.flags.passEnv ? process.env : undefined);
} else if (cli.input[0] === 'purge') {
  purge();
} else if (cli.input.length > 0) {
  const [command, ...args] = cli.input;
  runWithCommand(command, args, cli.flags.passEnv ? process.env : undefined);
} else if (cli.flags.url) {
  runWithURL(cli.flags.url);
} else if (cli.flags.sse) {
  runWithSSE(cli.flags.sse);
} else {
  runWithConfig(cli.flags.config);
}
