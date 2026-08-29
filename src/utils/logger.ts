/**
 * Omnirelay Logger Utility
 * In Phase 9 MVP, this wraps console methods.
 * In Stage 9 (Scale), this will be replaced with DataDog, Sentry, or Winston.
 */

export const logger = {
  info: (message: string, meta?: any) => {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, meta ? meta : '')
  },
  
  warn: (message: string, meta?: any) => {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, meta ? meta : '')
  },
  
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, error ? error : '')
  },
  
  // Specific logger for Meta Webhooks to track message volume
  webhook: (event: string, meta?: any) => {
    console.log(`[WEBHOOK] ${new Date().toISOString()} - ${event}`, meta ? meta : '')
  }
}
