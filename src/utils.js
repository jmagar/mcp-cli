import traverse from '@json-schema-tools/traverse'
import { isEmpty, set as setPath } from 'lodash-es'
import { Console } from 'node:console'
import { homedir } from 'os'
import { join } from 'path'
import prompts from 'prompts'
import yoctoSpinner from 'yocto-spinner'
import colors from 'yoctocolors'
import { parse } from "uri-template"
import readline from 'readline';

export const logger = new Console({ stdout: process.stderr, stderr: process.stderr })

export function prettyPrint(obj) {
  logger.dir(obj, { depth: null, colors: true })
}

export function createSpinner(text) {
  return yoctoSpinner({ text, stream: process.stderr }).start()
}

export function getClaudeConfigPath() {
  if (process.platform === 'win32') {
    return join(homedir(), 'AppData', 'Roaming', 'Claude', 'claude_desktop_config.json')
  }
  if (process.platform === 'darwin') {
    return join(homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json')
  }
}

export async function readPromptArgumentInputs(args) {
  if (!args || args.length === 0) {
    return {}
  }
  return prompts(
    args.map((arg) => ({
      type: 'text',
      name: arg.name,
      message: colors.dim((arg.required ? '* ' : '') + `${arg.name}: ${arg.description}`),
    })),
  )
}

export async function readJSONSchemaInputs(schema) {
  if (!schema || isEmpty(schema)) {
    return {}
  }
  const questions = []
  traverse.default(schema, (s, _isCycle, path, parent) => {
    const key = path.replace('$.properties.', '').replace('.properties', '')
    const required = parent?.required?.includes(key.split('.').at(-1))
    if (parent && parent.type === 'array') {
      return
    }
    if (s.type === 'string') {
      questions.push({ key, type: 'text', required, initial: s.default })
    } else if (s.type === 'integer' || s.type === 'number') {
      questions.push({
        key,
        type: 'number',
        required,
        initial: s.default,
        max: s.maximum ?? s.exclusiveMaximum,
        min: s.minimum ?? s.exclusiveMinimum,
      })
    } else if (s.type === 'boolean') {
      questions.push({ type: 'confirm', key, required, initial: s.default })
    }
  })
  const results = {}
  for (const q of questions) {
    const { key, required, ...options } = q
    const { value } = await prompts({
      name: 'value',
      message: colors.dim(`${required ? '* ' : ''}${key}`),
      ...options,
    })
    if (value !== '') {
      setPath(results, q.key, value)
    }
  }
  return results
}

export async function populateURITemplateParts(uriTemplate) {
  // Populate template
  const template = parse(uriTemplate)
  let uri = "", values = {}
  for (let part of template.ast.parts) {
    if (part.type === "literal") {
      uri += part.value
    } else if (part.type == "expression") {
      for (let variable of part.variables) {
        const { value } = await prompts({
          type: 'text',
          name: 'value',
          message: `Template: ${uriTemplate || '..'}\n` +
            colors.dim('Constructed: ') +
            colors.inverse(uri || '..') +
            colors.dim(` | Enter value of \`${variable.name}': `),
        })
        values[variable.name] = value
      }
    } else {
      assert(false, "unreachable")
    }
  }
  let expanded = template.expand(values)
  expanded = await prompts(
    {
      name: 'confirm',
      type: 'autocomplete',
      message: 'Confirm:',
      choices: [{ title: colors.bold(expanded), value: expanded }, { title: "Skip", value: null }],
    },
    {
      onCancel: async () => {
        await client.close()
        process.exit(0)
      },
    },
  )
  return (expanded.confirm !== null && expanded.confirm !== "Skip") ? expanded.confirm : null;
}
