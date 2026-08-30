'use client'

import { useCallback, useEffect } from 'react'
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { TriggerNode, MessageNode, ConditionNode, InteractiveListNode, InputCaptureNode, DatabaseActionNode } from '@/components/flow/nodes'
import { useFlowStore } from '@/stores/flowStore'
import { Button } from '@/components/ui/button'
import { saveFlowVersion } from '@/app/actions/flows'

const nodeTypes = {
  trigger: TriggerNode,
  message: MessageNode,
  condition: ConditionNode,
  interactiveList: InteractiveListNode,
  inputCapture: InputCaptureNode,
  databaseAction: DatabaseActionNode,
}

// Initial nodes if the flow is empty
const initialNodes: Node[] = [
  { id: '1', type: 'trigger', position: { x: 250, y: 100 }, data: { label: 'When a user messages' } },
]

export default function FlowBuilder({ initialFlowState, flowId }: { initialFlowState: any, flowId: string }) {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, setNodes, setEdges, addNode } = useFlowStore()

  useEffect(() => {
    if (initialFlowState?.nodes?.length > 0) {
      setNodes(initialFlowState.nodes)
      setEdges(initialFlowState.edges)
    } else {
      setNodes(initialNodes)
    }
  }, [initialFlowState, setNodes, setEdges])

  const handleAddNode = (type: string) => {
    const newNode: Node = {
      id: `${type}-${Date.now()}`,
      type,
      position: { x: 250, y: nodes.length * 150 + 100 },
      data: { label: `New ${type} node` },
    }
    addNode(newNode)
  }

  const handleSave = async () => {
    const result = await saveFlowVersion(flowId, nodes, edges)
    if (result.error) {
      alert(result.error)
    } else {
      alert('Flow state saved successfully!')
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] w-full flex-col border rounded-lg overflow-hidden bg-white dark:bg-zinc-950">
      <div className="flex items-center justify-between p-4 border-b bg-zinc-50 dark:bg-zinc-900">
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleAddNode('message')}>+ Message</Button>
          <Button variant="outline" onClick={() => handleAddNode('condition')}>+ Condition</Button>
          <Button variant="outline" onClick={() => handleAddNode('interactiveList')}>+ List</Button>
          <Button variant="outline" onClick={() => handleAddNode('inputCapture')}>+ Input</Button>
          <Button variant="outline" onClick={() => handleAddNode('databaseAction')}>+ DB Save</Button>
        </div>
        <Button onClick={handleSave}>Save Flow</Button>
      </div>
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
        >
          <Controls />
          <MiniMap />
          <Background gap={12} size={1} />
        </ReactFlow>
      </div>
    </div>
  )
}
