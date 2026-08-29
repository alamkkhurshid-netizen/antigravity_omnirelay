'use client'
 
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { AlertTriangle } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to our logging utility (which would send to Sentry in Prod)
    console.error('[GlobalErrorBoundary]', error)
  }, [error])
 
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <Card className="max-w-md w-full border-red-200 dark:border-red-900 bg-red-50/30 dark:bg-red-950/20">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-xl">Something went wrong</CardTitle>
          <CardDescription className="text-zinc-600 dark:text-zinc-400 mt-2">
            We encountered an unexpected error while processing your request. 
            Our team has been notified.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm">
          <div className="bg-white dark:bg-zinc-950 p-3 rounded border text-red-600 dark:text-red-400 font-mono text-xs overflow-auto max-h-32">
            {error.message || 'Unknown error occurred'}
          </div>
        </CardContent>
        <CardFooter className="flex justify-center gap-4">
          <Button variant="outline" onClick={() => window.location.reload()}>
            Refresh Page
          </Button>
          <Button onClick={() => reset()} className="bg-red-600 hover:bg-red-700 text-white">
            Try Again
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
