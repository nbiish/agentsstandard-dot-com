// formatters.js — Output formatters: table, JSON, YAML
// Zero dependencies. Node.js >=16 built-ins only.

/**
 * Format data as a pretty-printed JSON string.
 */
function formatJSON(data) {
  return JSON.stringify(data, null, 2);
}

/**
 * Format a list of objects as a simple aligned table.
 * @param {object[]} rows — array of objects
 * @param {string[]} columns — column keys to display
 * @param {object} [opts]
 * @param {string[]} [opts.headers] — column headers (defaults to uppercase column keys)
 * @param {boolean} [opts.noHeader] — suppress header row
 * @returns {string}
 */
function formatTable(rows, columns, opts = {}) {
  if (!rows || rows.length === 0) return '(empty)';

  const headers = opts.headers || columns.map(c => c.toUpperCase());
  const pad = opts.pad || 2;

  // Calculate column widths
  const widths = columns.map((col, i) => {
    let max = headers[i].length;
    for (const row of rows) {
      const val = String(row[col] ?? '');
      if (val.length > max) max = val.length;
    }
    return max;
  });

  const lines = [];

  if (!opts.noHeader) {
    const headerLine = headers.map((h, i) => h.padEnd(widths[i])).join(' '.repeat(pad));
    lines.push(headerLine);
    lines.push('─'.repeat(headerLine.length));
  }

  for (const row of rows) {
    const line = columns.map((col, i) => {
      const val = String(row[col] ?? '');
      return val.padEnd(widths[i]);
    }).join(' '.repeat(pad));
    lines.push(line);
  }

  return lines.join('\n');
}

/**
 * Format a simple key-value list.
 * @param {object} obj
 * @returns {string}
 */
function formatKeyValue(obj, indent = 0) {
  const prefix = ' '.repeat(indent);
  const lines = [];
  const maxKeyLen = Math.max(...Object.keys(obj).map(k => k.length));
  for (const [key, value] of Object.entries(obj)) {
    const val = typeof value === 'object' ? JSON.stringify(value) : String(value);
    lines.push(`${prefix}${key.padEnd(maxKeyLen + 2)} ${val}`);
  }
  return lines.join('\n');
}

/**
 * Format a status line with a colored indicator.
 * Supports: ✓ (ok), ✗ (error), ! (warning), · (info)
 * @param {string} status — one of 'ok', 'error', 'warn', 'info'
 * @param {string} message
 * @param {object} [opts]
 * @param {boolean} [opts.color] — enable ANSI colors (default true)
 * @returns {string}
 */
function formatStatus(status, message, opts = {}) {
  const color = opts.color !== false;
  const icons = {
    ok: color ? '\x1b[32m✓\x1b[0m' : '✓',
    error: color ? '\x1b[31m✗\x1b[0m' : '✗',
    warn: color ? '\x1b[33m!\x1b[0m' : '!',
    info: color ? '\x1b[36m·\x1b[0m' : '·',
  };
  return `${icons[status] || icons.info} ${message}`;
}

/**
 * Format a section header.
 */
function formatSection(title) {
  const line = '─'.repeat(Math.max(40, title.length + 4));
  return `\n${title}\n${line}`;
}

/**
 * Render output based on --json flag.
 * @param {object} data — data to output
 * @param {boolean} asJson — if true, output JSON
 * @param {Function} textFormatter — function that returns a string for text mode
 * @returns {string}
 */
function renderOutput(data, asJson, textFormatter) {
  if (asJson) return formatJSON(data);
  if (textFormatter) return textFormatter(data);
  return formatJSON(data);
}

module.exports = {
  formatJSON,
  formatTable,
  formatKeyValue,
  formatStatus,
  formatSection,
  renderOutput,
};
