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
  const [vertical, setVertical] = useState('health')
  const [subCategory, setSubCategory] = useState('clinic')

  const getSubCategories = () => {
    switch(vertical) {
      case 'health': return ['Clinic', 'Hospital', 'Dental', 'Diagnostic Lab', 'Physiotherapy', 'Veterinary']
      case 'food': return ['Dine-in Restaurant', 'Quick Service', 'Cafe', 'Cloud Kitchen']
      case 'beauty': return ['Hair Salon', 'Spa', 'Gym', 'Nail Bar']
      case 'retail': return ['Clothing', 'Electronics', 'Groceries', 'Jewelry']
      case 'home': return ['Plumbing/Electrical', 'Cleaning Services', 'Real Estate', 'Movers']
      case 'auto': return ['Car Wash', 'Repair Shop', 'Car Rentals']
      default: return []
    }
  }

  // Handle vertical change to reset subcategory
  const handleVerticalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVertical(e.target.value)
    const newSubcats = getSubCategories() // This will return old state if called immediately, so we hardcode logic or just pick index 0
    // Actually, just let React re-render, and we'll enforce the first subcategory selection later, or let the user choose.
    // For simplicity, we can set it to an empty string to force selection.
    setSubCategory('')
  }

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
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <label className="cursor-pointer">
              <input type="radio" name="vertical" value="health" checked={vertical === 'health'} onChange={handleVerticalChange} className="peer sr-only" disabled={loading} />
              <div className="flex flex-col items-center justify-center text-center gap-2 p-3 rounded-lg border-2 border-zinc-200 dark:border-zinc-800 peer-checked:border-blue-600 peer-checked:bg-blue-50 dark:peer-checked:bg-blue-950/30 transition-all opacity-100 peer-disabled:opacity-50 h-full">
                <span className="text-xl">🩺</span>
                <span className="text-xs font-medium">Health</span>
              </div>
            </label>
            <label className="cursor-pointer">
              <input type="radio" name="vertical" value="food" checked={vertical === 'food'} onChange={handleVerticalChange} className="peer sr-only" disabled={loading} />
              <div className="flex flex-col items-center justify-center text-center gap-2 p-3 rounded-lg border-2 border-zinc-200 dark:border-zinc-800 peer-checked:border-blue-600 peer-checked:bg-blue-50 dark:peer-checked:bg-blue-950/30 transition-all opacity-100 peer-disabled:opacity-50 h-full">
                <span className="text-xl">🍽️</span>
                <span className="text-xs font-medium">Food</span>
              </div>
            </label>
            <label className="cursor-pointer">
              <input type="radio" name="vertical" value="beauty" checked={vertical === 'beauty'} onChange={handleVerticalChange} className="peer sr-only" disabled={loading} />
              <div className="flex flex-col items-center justify-center text-center gap-2 p-3 rounded-lg border-2 border-zinc-200 dark:border-zinc-800 peer-checked:border-blue-600 peer-checked:bg-blue-50 dark:peer-checked:bg-blue-950/30 transition-all opacity-100 peer-disabled:opacity-50 h-full">
                <span className="text-xl">💅</span>
                <span className="text-xs font-medium">Beauty</span>
              </div>
            </label>
            <label className="cursor-pointer">
              <input type="radio" name="vertical" value="retail" checked={vertical === 'retail'} onChange={handleVerticalChange} className="peer sr-only" disabled={loading} />
              <div className="flex flex-col items-center justify-center text-center gap-2 p-3 rounded-lg border-2 border-zinc-200 dark:border-zinc-800 peer-checked:border-blue-600 peer-checked:bg-blue-50 dark:peer-checked:bg-blue-950/30 transition-all opacity-100 peer-disabled:opacity-50 h-full">
                <span className="text-xl">🛍️</span>
                <span className="text-xs font-medium">Retail</span>
              </div>
            </label>
            <label className="cursor-pointer">
              <input type="radio" name="vertical" value="home" checked={vertical === 'home'} onChange={handleVerticalChange} className="peer sr-only" disabled={loading} />
              <div className="flex flex-col items-center justify-center text-center gap-2 p-3 rounded-lg border-2 border-zinc-200 dark:border-zinc-800 peer-checked:border-blue-600 peer-checked:bg-blue-50 dark:peer-checked:bg-blue-950/30 transition-all opacity-100 peer-disabled:opacity-50 h-full">
                <span className="text-xl">🛠️</span>
                <span className="text-xs font-medium">Home Services</span>
              </div>
            </label>
            <label className="cursor-pointer">
              <input type="radio" name="vertical" value="auto" checked={vertical === 'auto'} onChange={handleVerticalChange} className="peer sr-only" disabled={loading} />
              <div className="flex flex-col items-center justify-center text-center gap-2 p-3 rounded-lg border-2 border-zinc-200 dark:border-zinc-800 peer-checked:border-blue-600 peer-checked:bg-blue-50 dark:peer-checked:bg-blue-950/30 transition-all opacity-100 peer-disabled:opacity-50 h-full">
                <span className="text-xl">🚗</span>
                <span className="text-xs font-medium">Automotive</span>
              </div>
            </label>
          </div>
        </div>

        {vertical && (
          <div className="grid gap-2">
            <Label htmlFor="subCategory">Specific Category</Label>
            <select 
              name="subCategory" 
              id="subCategory" 
              className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:ring-offset-zinc-950 dark:placeholder:text-zinc-400 dark:focus-visible:ring-zinc-300"
              required
              disabled={loading}
              value={subCategory}
              onChange={(e) => setSubCategory(e.target.value)}
            >
              <option value="" disabled>Select an option</option>
              {getSubCategories().map(sub => (
                <option key={sub} value={sub.toLowerCase().replace(/[\/\s]+/g, '_')}>{sub}</option>
              ))}
            </select>
          </div>
        )}

        <p className="text-xs text-zinc-500">We'll set up a starter automation flow tailored precisely to your specific business type.</p>
      </CardContent>
      <CardFooter>
        <Button className="w-full" type="submit" disabled={loading}>
          {loading ? 'Creating Workspace...' : 'Create Workspace'}
        </Button>
      </CardFooter>
    </form>
  )
}
