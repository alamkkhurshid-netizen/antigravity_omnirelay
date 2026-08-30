'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { createRazorpayOrder } from '@/app/actions/billing'
import Script from 'next/script'
import { Zap, CreditCard } from 'lucide-react'

interface RazorpayCheckoutProps {
  amountINR: number
  buttonText: string
  variant?: "default" | "outline" | "destructive" | "secondary" | "ghost" | "link"
  className?: string
  icon?: 'zap' | 'credit-card'
}

export function RazorpayCheckout({ amountINR, buttonText, variant = "default", className = "", icon }: RazorpayCheckoutProps) {
  const [loading, setLoading] = useState(false)

  const handlePayment = async () => {
    setLoading(true)
    
    try {
      const result = await createRazorpayOrder(amountINR)
      
      if (result.error || !result.orderId) {
        alert(result.error || 'Failed to create order')
        setLoading(false)
        return
      }

      const options = {
        key: result.keyId,
        amount: result.amount,
        currency: "INR",
        name: "Omnirelay",
        description: "Wallet Recharge",
        order_id: result.orderId,
        // The webhook handles the actual top-up, but we can redirect or show success here
        handler: function (response: any) {
          alert("Payment Successful! Your wallet will be updated momentarily.")
          // Reload page to reflect new balance
          window.location.reload()
        },
        prefill: {
          name: "Omnirelay User", // Could pass actual user name
        },
        theme: {
          color: "#2563EB" // blue-600
        }
      }

      const rzp = new (window as any).Razorpay(options)
      
      rzp.on('payment.failed', function (response: any){
        alert("Payment Failed. Reason: " + response.error.description)
      })

      rzp.open()
      
    } catch (error) {
      console.error(error)
      alert("Something went wrong.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />
      <Button 
        onClick={handlePayment} 
        disabled={loading} 
        variant={variant} 
        className={`gap-2 ${className}`}
      >
        {icon === 'credit-card' && <CreditCard className="w-4 h-4" />}
        {icon === 'zap' && <Zap className="w-4 h-4" />}
        {loading ? 'Processing...' : buttonText}
      </Button>
    </>
  )
}
