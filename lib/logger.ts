// lib/logger.ts
export function safeLog(level: "error" | "info", ...args: any[]) {
  const message = `[${level.toUpperCase()}] ${args.join(" ")}\n`;
  try {
    process.stderr.write(message);
  } catch (error) {
    if (error.code !== 'EPIPE') {
      // If it's not an EPIPE error, rethrow it
      throw error;
    }
    // Silently ignore EPIPE errors on stderr
  }
}