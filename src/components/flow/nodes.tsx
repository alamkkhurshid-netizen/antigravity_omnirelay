import { Handle, Position, NodeProps } from '@xyflow/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MessageSquare, Zap, Split, List, Database, Save } from 'lucide-react'

export function TriggerNode({ data }: NodeProps) {
  return (
    <Card className="w-[250px] border-green-500/50 shadow-sm">
      <CardHeader className="flex flex-row items-center gap-2 space-y-0 p-4 pb-2">
        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-md text-green-600 dark:text-green-400">
          <Zap className="w-4 h-4" />
        </div>
        <CardTitle className="text-sm font-semibold">Trigger</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <p className="text-xs text-zinc-500">
          {data.label as string || 'When a user sends a message'}
        </p>
      </CardContent>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-zinc-400" />
    </Card>
  )
}

export function MessageNode({ data }: NodeProps) {
  return (
    <Card className="w-[250px] border-blue-500/50 shadow-sm">
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-zinc-400" />
      <CardHeader className="flex flex-row items-center gap-2 space-y-0 p-4 pb-2">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-md text-blue-600 dark:text-blue-400">
          <MessageSquare className="w-4 h-4" />
        </div>
        <CardTitle className="text-sm font-semibold">Send Message</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <p className="text-xs text-zinc-500 truncate">
          {data.label as string || 'Select a template...'}
        </p>
      </CardContent>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-zinc-400" />
    </Card>
  )
}

export function ConditionNode({ data }: NodeProps) {
  return (
    <Card className="w-[250px] border-orange-500/50 shadow-sm">
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-zinc-400" />
      <CardHeader className="flex flex-row items-center gap-2 space-y-0 p-4 pb-2">
        <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-md text-orange-600 dark:text-orange-400">
          <Split className="w-4 h-4" />
        </div>
        <CardTitle className="text-sm font-semibold">Condition</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <p className="text-xs text-zinc-500">
          {data.label as string || 'If message contains...'}
        </p>
      </CardContent>
      <Handle type="source" position={Position.Bottom} id="true" className="w-3 h-3 bg-green-500 left-1/4" />
      <Handle type="source" position={Position.Bottom} id="false" className="w-3 h-3 bg-red-500 left-3/4" />
    </Card>
  )
}

export function InteractiveListNode({ data }: NodeProps) {
  return (
    <Card className="w-[250px] border-purple-500/50 shadow-sm">
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-zinc-400" />
      <CardHeader className="flex flex-row items-center gap-2 space-y-0 p-4 pb-2">
        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-md text-purple-600 dark:text-purple-400">
          <List className="w-4 h-4" />
        </div>
        <CardTitle className="text-sm font-semibold">Interactive List</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <p className="text-xs text-zinc-500 truncate">
          {data.label as string || 'Options list...'}
        </p>
      </CardContent>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-zinc-400" />
    </Card>
  )
}

export function InputCaptureNode({ data }: NodeProps) {
  return (
    <Card className="w-[250px] border-indigo-500/50 shadow-sm">
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-zinc-400" />
      <CardHeader className="flex flex-row items-center gap-2 space-y-0 p-4 pb-2">
        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-md text-indigo-600 dark:text-indigo-400">
          <Database className="w-4 h-4" />
        </div>
        <CardTitle className="text-sm font-semibold">Input Capture</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <p className="text-xs text-zinc-500 truncate">
          Save response as: <span className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-[10px]">{data.variable as string || 'var'}</span>
        </p>
      </CardContent>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-zinc-400" />
    </Card>
  )
}

export function DatabaseActionNode({ data }: NodeProps) {
  return (
    <Card className="w-[250px] border-emerald-500/50 shadow-sm">
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-zinc-400" />
      <CardHeader className="flex flex-row items-center gap-2 space-y-0 p-4 pb-2">
        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-md text-emerald-600 dark:text-emerald-400">
          <Save className="w-4 h-4" />
        </div>
        <CardTitle className="text-sm font-semibold">Save to Database</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <p className="text-xs text-zinc-500 truncate">
          Target: <span className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-[10px]">{data.table as string || 'Table'}</span>
        </p>
      </CardContent>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-zinc-400" />
    </Card>
  )
}
