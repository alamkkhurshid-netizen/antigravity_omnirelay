import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { FileText, BrainCircuit, Trash2, CheckCircle2 } from 'lucide-react'
import { uploadDocument, deleteDocument } from '@/app/actions/knowledge'

export default async function KnowledgePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: members } = await supabase
    .from('tenant_members')
    .select('tenant_id')
    .eq('user_id', user?.id)
    .limit(1)

  const tenantId = members?.[0]?.tenant_id

  // Get uploaded documents
  const { data: documents } = await supabase
    .from('knowledge_documents')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">AI Knowledge Base</h1>
      </div>
      <p className="text-zinc-500 max-w-3xl">
        Upload your restaurant menus, clinic FAQs, or retail policies here. The AI will automatically read these documents and use them to answer customer questions on WhatsApp.
      </p>

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        {/* Upload Pane */}
        <Card className="h-fit border-blue-200 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-950/20">
          <form action={uploadDocument as any}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-300">
                <BrainCircuit className="w-5 h-5" />
                Train the AI
              </CardTitle>
              <CardDescription>Paste your knowledge text below.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Document Title</label>
                <Input name="filename" placeholder="e.g. Return Policy 2026" required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Content</label>
                <Textarea 
                  name="textContent" 
                  placeholder="Paste the text here. e.g. 'Our return policy is 30 days...'" 
                  className="min-h-[150px]"
                  required 
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2">
                Save & Generate Embeddings
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* History Pane */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Active Documents</h2>
          {documents?.length === 0 ? (
            <Card className="border-dashed bg-zinc-50/50">
              <CardContent className="p-12 text-center flex flex-col items-center text-zinc-500">
                <FileText className="w-10 h-10 mb-4 text-zinc-300" />
                <p>No documents uploaded yet.</p>
                <p className="text-sm">The AI will only rely on basic Flow rules.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {documents?.map(doc => (
                <Card key={doc.id}>
                  <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-zinc-500" />
                      <CardTitle className="text-base truncate max-w-[150px]" title={doc.filename}>
                        {doc.filename}
                      </CardTitle>
                    </div>
                    <form action={deleteDocument as any}>
                      <input type="hidden" name="documentId" value={doc.id} />
                      <Button type="submit" variant="ghost" size="icon" className="h-6 w-6 text-zinc-400 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </form>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-end">
                      <p className="text-xs text-zinc-500">
                        {new Date(doc.created_at).toLocaleDateString()}
                      </p>
                      {doc.status === 'ready' && (
                        <div className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> Ready
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
