'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

export async function uploadDocument(formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const textContent = formData.get('textContent') as string
  const filename = formData.get('filename') as string

  if (!textContent || !filename) {
    return { error: 'Filename and content are required' }
  }

  // Get user's tenant
  const { data: members } = await supabase
    .from('tenant_members')
    .select('tenant_id')
    .eq('user_id', user.id)
    .limit(1)

  if (!members || members.length === 0) {
    return { error: 'User does not belong to a workspace' }
  }

  const tenantId = members[0].tenant_id

  // 1. Create Document Record
  const { data: doc, error } = await supabase
    .from('knowledge_documents')
    .insert([{ 
      tenant_id: tenantId, 
      filename,
      status: 'ready' 
    }])
    .select('id')
    .single()

  if (error || !doc) {
    return { error: 'Failed to create document record' }
  }

  // 2. Mock Chunking & Embedding (Simulating the RAG pipeline)
  // In production, we would pass `textContent` to an LLM like OpenAI to get real vectors.
  // For MVP, we insert a dummy 1536-dimensional array of zeros to prove the pgvector architecture works.
  const dummyEmbedding = Array(1536).fill(0).map(() => Math.random() * 0.1)
  
  const { error: chunkError } = await supabase
    .from('document_chunks')
    .insert([{
      tenant_id: tenantId,
      document_id: doc.id,
      content: textContent.substring(0, 500), // First 500 chars as a single mock chunk
      embedding: `[${dummyEmbedding.join(',')}]`
    }])

  if (chunkError) {
    console.error('Failed to save chunks:', chunkError)
    // We don't fail the whole request for MVP simulation
  }

  revalidatePath('/dashboard/knowledge')
  return { success: true }
}

export async function deleteDocument(formData: FormData) {
  const supabase = await createClient()
  const documentId = formData.get('documentId') as string
  
  if (documentId) {
    await supabase.from('knowledge_documents').delete().eq('id', documentId)
    revalidatePath('/dashboard/knowledge')
  }
}
