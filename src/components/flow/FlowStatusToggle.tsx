'use client'

import { Button } from '@/components/ui/button'
import { toggleFlowStatus } from '@/app/actions/flows'
import { useState } from 'react'
import { Power } from 'lucide-react'

export function FlowStatusToggle({ flowId, currentStatus }: { flowId: string, currentStatus: string }) {
  const [status, setStatus] = useState(currentStatus)
  const [loading, setLoading] = useState(false)

  const handleToggle = async () => {
    setLoading(true)
    const result = await toggleFlowStatus(flowId)
    if (result.success && result.newStatus) {
      setStatus(result.newStatus)
    }
    setLoading(false)
  }

  const isActive = status === 'active'

  return (
    <Button
      variant={isActive ? 'default' : 'outline'}
      size="sm"
      onClick={handleToggle}
      disabled={loading}
      className={isActive ? 'bg-green-600 hover:bg-green-700 text-white' : ''}
    >
      <Power className="w-3.5 h-3.5 mr-1.5" />
      {loading ? 'Updating...' : isActive ? 'Active' : 'Activate'}
    </Button>
  )
}
