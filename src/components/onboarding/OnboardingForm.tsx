'use client'

import { useState } from 'react'
import { createTenant } from '@/app/actions/tenant'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CardContent, CardFooter } from '@/components/ui/card'

export function OnboardingForm() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    const formData = new FormData(e.currentTarget)
    const result = await createTenant(formData)
    
    if (result && result.error) {
      setError(result.error)
      setLoading(false)
    }
    // if successful, the server action will redirect, so we don't need to do anything here
  }

  return (
    <form onSubmit={handleSubmit}>
      <CardContent className="grid gap-6">
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-200">
            {error}
          </div>
        )}
        <div className="grid gap-2">
          <Label htmlFor="businessName">Business Name</Label>
          <Input
            id="businessName"
            name="businessName"
            placeholder="e.g. Apex Clinic, Luigi's Pizza"
            required
            disabled={loading}
          />
        </div>

        <div className="grid gap-3">
          <Label>What type of business do you run?</Label>
          <div className="grid grid-cols-3 gap-3">
            <label className="cursor-pointer">
              <input type="radio" name="vertical" value="restaurant" defaultChecked className="peer sr-only" disabled={loading} />
              <div className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-zinc-200 dark:border-zinc-800 peer-checked:border-blue-600 peer-checked:bg-blue-50 dark:peer-checked:bg-blue-950/30 transition-all opacity-100 peer-disabled:opacity-50">
                <span className="text-2xl">🍽️</span>
                <span className="text-sm font-medium">Restaurant</span>
              </div>
            </label>
            <label className="cursor-pointer">
              <input type="radio" name="vertical" value="clinic" className="peer sr-only" disabled={loading} />
              <div className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-zinc-200 dark:border-zinc-800 peer-checked:border-blue-600 peer-checked:bg-blue-50 dark:peer-checked:bg-blue-950/30 transition-all opacity-100 peer-disabled:opacity-50">
                <span className="text-2xl">🏥</span>
                <span className="text-sm font-medium">Clinic</span>
              </div>
            </label>
            <label className="cursor-pointer">
              <input type="radio" name="vertical" value="retail" className="peer sr-only" disabled={loading} />
              <div className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-zinc-200 dark:border-zinc-800 peer-checked:border-blue-600 peer-checked:bg-blue-50 dark:peer-checked:bg-blue-950/30 transition-all opacity-100 peer-disabled:opacity-50">
                <span className="text-2xl">🛍️</span>
                <span className="text-sm font-medium">Retail</span>
              </div>
            </label>
          </div>
          <p className="text-xs text-zinc-500">We'll set up a starter automation flow tailored to your business type.</p>
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full" type="submit" disabled={loading}>
          {loading ? 'Creating Workspace...' : 'Create Workspace'}
        </Button>
      </CardFooter>
    </form>
  )
}
