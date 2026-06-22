import chalk from 'chalk';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const SYMBOLS: Record<LogLevel, string> = {
  debug: '◦',
  info: '●',
  warn: '▲',
  error: '✖',
};

const COLORS: Record<LogLevel, (text: string) => string> = {
  debug: chalk.gray,
  info: chalk.cyan,
  warn: chalk.yellow,
  error: chalk.red,
};

type SummaryValue = string | number;

class Logger {
  private level: LogLevel = 'info';

  setLevel(level: LogLevel) {
    this.level = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return LEVELS[level] >= LEVELS[this.level];
  }

  private format(level: LogLevel, message: string, data?: any): string {
    const timestamp = chalk.dim(new Date().toISOString().split('T')[1].split('.')[0]);
    const symbol = COLORS[level](SYMBOLS[level]);
    const base = `${timestamp} ${symbol} ${message}`;
    return data !== undefined ? `${base} ${chalk.dim(JSON.stringify(data))}` : base;
  }

  debug(message: string, data?: any) {
    if (this.shouldLog('debug')) {
      console.log(this.format('debug', message, data));
    }
  }

  info(message: string, data?: any) {
    if (this.shouldLog('info')) {
      console.log(this.format('info', message, data));
    }
  }

  warn(message: string, data?: any) {
    if (this.shouldLog('warn')) {
      console.warn(this.format('warn', message, data));
    }
  }

  error(message: string, data?: any) {
    if (this.shouldLog('error')) {
      console.error(this.format('error', message, data));
    }
  }

  stageHeader(name: string, description?: string) {
    if (!this.shouldLog('info')) return;
    const width = 50;
    const nameStr = ` ${name} `;
    const remaining = Math.max(0, width - nameStr.length);
    const line = chalk.dim('──') + chalk.bold.cyan(nameStr) + chalk.dim('─'.repeat(remaining));
    console.log('');
    console.log(line);
    if (description) {
      console.log(chalk.dim(`  ${description}`));
    }
  }

  summary(data: Record<string, SummaryValue>) {
    if (!this.shouldLog('info')) return;
    const entries = Object.entries(data);
    if (entries.length === 0) return;
    const maxKeyLen = Math.max(...entries.map(([k]) => k.length));
    const maxValLen = Math.max(...entries.map(([, v]) => String(v).length));
    for (const [key, value] of entries) {
      const paddedKey = chalk.dim(key.padEnd(maxKeyLen));
      const paddedVal = chalk.white(String(value).padStart(maxValLen));
      console.log(`  ${paddedKey}  ${paddedVal}`);
    }
  }

  table(headers: string[], rows: string[][]) {
    if (!this.shouldLog('info')) return;
    const colWidths: number[] = headers.map((h, i) =>
      Math.max(h.length, ...rows.map(r => (r[i] || '').length))
    );

    const formatRow = (cells: string[], alignRight?: boolean[]) => {
      return '  ' + cells.map((cell, i) => {
        const w = colWidths[i];
        if (alignRight?.[i]) return cell.padStart(w);
        return cell.padEnd(w);
      }).join('  ');
    };

    const separator = '  ' + colWidths.map(w => chalk.dim('─'.repeat(w))).join(chalk.dim('──'));

    console.log('');
    console.log(chalk.bold(formatRow(headers)));
    console.log(separator);
    for (const row of rows) {
      console.log(formatRow(row, headers.map((_, i) => i > 0)));
    }
  }

  stage(name: string, before: number, after: number) {
    const diff = after - before;
    const arrow = chalk.dim('→');
    const change = diff === 0
      ? chalk.dim('(0)')
      : diff > 0
        ? chalk.green(`(+${diff})`)
        : chalk.red(`(${diff})`);
    console.log(`${chalk.bold(name)}: ${before} ${arrow} ${after} ${change}`);
  }

  progress(current: number, total: number, label?: string) {
    const pct = Math.round((current / total) * 100);
    const prefix = label ? `${label}: ` : '';
    process.stdout.write(`\r${prefix}${current}/${total} (${pct}%)`);
    if (current === total) {
      console.log();
    }
  }
}

export const logger = new Logger();
