/**
 * Logger Utility
 * 
 * Consistent logging across all examples
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

class Logger {
  private level: LogLevel = LogLevel.INFO;
  private prefix: string = '';

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  setPrefix(prefix: string): void {
    this.prefix = prefix;
  }

  private log(level: LogLevel, emoji: string, message: string, ...args: any[]): void {
    if (level < this.level) return;

    const prefix = this.prefix ? `${this.prefix} ` : '';
    const timestamp = new Date().toISOString();
    const levelName = LogLevel[level];

    console.log(`${emoji} [${timestamp}] [${levelName}] ${prefix}${message}`, ...args);
  }

  debug(message: string, ...args: any[]): void {
    this.log(LogLevel.DEBUG, '🔍', message, ...args);
  }

  info(message: string, ...args: any[]): void {
    this.log(LogLevel.INFO, 'ℹ️ ', message, ...args);
  }

  success(message: string, ...args: any[]): void {
    this.log(LogLevel.INFO, '✅', message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    this.log(LogLevel.WARN, '⚠️ ', message, ...args);
  }

  error(message: string, ...args: any[]): void {
    this.log(LogLevel.ERROR, '❌', message, ...args);
  }

  section(title: string): void {
    console.log('\n' + '='.repeat(60));
    console.log(`  ${title}`);
    console.log('='.repeat(60) + '\n');
  }

  step(step: number, title: string): void {
    console.log(`\n📍 Step ${step}: ${title}\n`);
  }
}

export const logger = new Logger();

