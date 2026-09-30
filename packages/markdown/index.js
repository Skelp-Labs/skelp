/**
 * A ultra-lightweight, customizable terminal markdown formatter.
 * Renders common markdown elements using ANSI escape codes for local styling inside the terminal.
 */

const ESC = '\x1b['
const RESET = `${ESC}0m`
const BOLD = `${ESC}1m`
const DIM = `${ESC}2m`
const ITALIC = `${ESC}3m`
const UNDERLINE = `${ESC}4m`

const FG = {
  cyan: `${ESC}36m`,
  blue: `${ESC}34m`,
  magenta: `${ESC}35m`,
  yellow: `${ESC}33m`,
  green: `${ESC}32m`,
  brightBlack: `${ESC}90m`,
  brightWhite: `${ESC}97m`
}

export const formatterStyles = {
  default: {
    heading1: FG.cyan,
    heading2: FG.blue,
    heading3: FG.magenta,
    bullet: FG.yellow,
    number: FG.green,
    link: `${UNDERLINE}${FG.blue}`,
    quote: FG.brightWhite,
    code: FG.brightWhite,
    inlineCode: FG.brightWhite,
    muted: FG.brightBlack
  },
  monochrome: {
    heading1: BOLD,
    heading2: BOLD,
    heading3: BOLD,
    bullet: '',
    number: '',
    link: UNDERLINE,
    quote: FG.brightWhite,
    code: FG.brightWhite,
    inlineCode: FG.brightWhite,
    muted: DIM
  }
}

function formatInline (text, style) {
  let result = text
  result = result.replace(/`([^`]+)`/g, `${style.inlineCode}$1${RESET}`)
  result = result.replace(/\*\*(.+?)\*\*/g, `${BOLD}$1${RESET}`)
  result = result.replace(/__(.+?)__/g, `${BOLD}$1${RESET}`)
  result = result.replace(/(?<!\*)(?!\*)(.+?)(?<!\*)\*(?!\*)/g, `${ITALIC}$1${RESET}`)
  result = result.replace(/(?<!_)(?!_)(.+?)(?<!_)_(?!_)/g, `${ITALIC}$1${RESET}`)
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, `${style.link}$1${RESET} ${DIM}($2)${RESET}`)
  return result
}

function resolveStyle (options) {
  return typeof options.style === 'string'
    ? formatterStyles[options.style] || formatterStyles.default
    : { ...formatterStyles.default, ...options.style }
}

export function createMarkdownStream (options = {}) {
  const style = resolveStyle(options)
  let insideCodeBlock = false
  let pending = ''

  function formatLine (line) {
    const codeBlockMatch = line.match(/^```(\w*)/)
    if (codeBlockMatch) {
      if (!insideCodeBlock) {
        insideCodeBlock = true
        const langLabel = codeBlockMatch[1] ? ` ${codeBlockMatch[1]}` : ''
        return `---${langLabel} ---`
      }
      insideCodeBlock = false
      return '---'
    }
    if (insideCodeBlock) return `  ${style.code}${line}${RESET}`
    return formatMarkdown(line, { style })
  }

  return {
    push (text) {
      pending += text
      const lines = pending.split('\n')
      pending = lines.pop()
      return lines.map(formatLine).join('\n') + (lines.length ? '\n' : '')
    },
    end () {
      const output = pending ? formatLine(pending) : ''
      pending = ''
      return output
    }
  }
}

export function formatMarkdown (text, options = {}) {
  if (!text) return ''

  const style = resolveStyle(options)
  let insideCodeBlock = false
  let codeBlockLang = ''

  return text.split('\n').map((line) => {
    const codeBlockMatch = line.match(/^```(\w*)/)
    if (codeBlockMatch) {
      if (!insideCodeBlock) {
        insideCodeBlock = true
        codeBlockLang = codeBlockMatch[1]
        const langLabel = codeBlockLang ? ` ${codeBlockLang}` : ''
        return `---${langLabel} ---`
      }
      insideCodeBlock = false
      codeBlockLang = ''
      return '---'
    }

    if (insideCodeBlock) return `  ${style.code}${line}${RESET}`
    if (line.startsWith('### ')) return `\n${BOLD}${style.heading3}▸ ${line.slice(4)}${RESET}`
    if (line.startsWith('## ')) return `\n${BOLD}${style.heading2}◆ ${line.slice(3)}${RESET}`
    if (line.startsWith('# ')) return `\n${BOLD}${style.heading1}■ ${line.slice(2).toUpperCase()}${RESET}`
    if (line.startsWith('> ')) return `${DIM}${style.quote}  ▏${RESET} ${ITALIC}${style.quote}${line.slice(2)}${RESET}`
    if (/^[-*_]{3,}\s*$/.test(line.trim())) return `${DIM}${'─'.repeat(40)}${RESET}`

    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      const indent = line.match(/^(\s*)/)[1]
      return `${indent}${style.bullet}•${RESET} ${formatInline(line.trim().slice(2), style)}`
    }

    const numberedMatch = line.match(/^(\s*)(\d+)\.\s(.*)/)
    if (numberedMatch) {
      const [, indent, num, content] = numberedMatch
      return `${indent}${style.number}${num}.${RESET} ${formatInline(content, style)}`
    }

    return formatInline(line, style)
  }).join('\n')
}
