import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Send, User } from 'lucide-react'

export default async function InboxPage() {
  const supabase = await createClient()

  // Get tenant ID
  const { data: { user } } = await supabase.auth.getUser()
  const { data: members } = await supabase
    .from('tenant_members')
    .select('tenant_id')
    .eq('user_id', user?.id)
    .limit(1)

  const tenantId = members?.[0]?.tenant_id

  // Get contacts
  const { data: contacts } = await supabase
    .from('contacts')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('updated_at', { ascending: false })

  // Since this is a simple Server Component MVP, we'll just show the static UI structure.
  // In a full implementation, this would be a Client Component using Supabase Realtime subscriptions.

  return (
    <div className="h-[calc(100vh-8rem)] flex rounded-lg border overflow-hidden bg-white dark:bg-zinc-950">
      {/* Left Pane: Contacts List */}
      <div className="w-1/3 border-r bg-zinc-50 dark:bg-zinc-900 flex flex-col">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-lg">Inbox</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {contacts?.length === 0 ? (
            <div className="p-4 text-center text-sm text-zinc-500">No active conversations.</div>
          ) : (
            contacts?.map(contact => (
              <button 
                key={contact.id} 
                className="w-full text-left p-4 border-b hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center">
                  <User className="w-5 h-5 text-zinc-500" />
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="flex items-center justify-between">
                    <p className="font-medium truncate">{contact.name || contact.phone_number || contact.instagram_id}</p>
                    <span className="text-[10px] uppercase font-bold text-zinc-400 bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                      {contact.instagram_id ? 'IG' : 'WA'}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 truncate">Tap to view chat history...</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right Pane: Chat History */}
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b bg-zinc-50 dark:bg-zinc-900">
          <h3 className="font-medium">Select a conversation</h3>
        </div>
        
        <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-4">
          <div className="flex justify-center">
            <span className="text-xs text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-full">
              Your messages will appear here
            </span>
          </div>
          
          {/* Mock messages for structural preview */}
          <div className="self-start max-w-[80%] bg-zinc-100 dark:bg-zinc-800 rounded-2xl rounded-tl-none p-3">
            <p className="text-sm">Hi, I would like to book a table for tonight.</p>
          </div>
          <div className="self-end max-w-[80%] bg-blue-600 text-white rounded-2xl rounded-tr-none p-3">
            <p className="text-sm">Of course! How many people in your party?</p>
          </div>
        </div>

        {/* Chat Input */}
        <div className="p-4 border-t bg-white dark:bg-zinc-950">
          <form className="flex gap-2">
            <Input placeholder="Type your message..." className="flex-1" />
            <Button type="button" size="icon">
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
