import FlowBuilder from '@/components/flow/FlowBuilder'

export default function PreviewFlowPage() {
  const dummyInitialState = {
    nodes: [
      { id: '1', type: 'trigger', position: { x: 250, y: 100 }, data: { label: 'When a user messages' } },
      { id: '2', type: 'message', position: { x: 250, y: 300 }, data: { label: 'Send Welcome Template' } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2' }
    ]
  }

  return (
    <div className="h-screen w-full flex flex-col space-y-4 p-4 bg-zinc-50 dark:bg-zinc-950">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Flow Builder Preview (No Auth Required)</h1>
        <p className="text-sm text-zinc-500">
          This is a purely front-end demo. Saving will not work until you connect a real database.
        </p>
      </div>
      
      <FlowBuilder initialFlowState={dummyInitialState} flowId="dummy-123" />
    </div>
  )
}
