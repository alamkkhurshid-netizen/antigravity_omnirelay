'use client'

import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Send, User, Loader2 } from 'lucide-react'
import { getMessages, sendManualReply } from '@/app/actions/inbox'

type Contact = {
  id: string
  name: string | null
  phone_number: string | null
  instagram_id: string | null
  updated_at: string
}

type Message = {
  id: string
  contact_id: string
  direction: 'inbound' | 'outbound'
  content: string
  status: string
  channel?: string
  created_at: string
}

export default function InboxClient({ contacts }: { contacts: Contact[] }) {
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Load messages when a contact is selected
  useEffect(() => {
    if (!selectedContact) return
    setLoadingMessages(true)
    setError(null)
    getMessages(selectedContact.id).then(result => {
      if (result.error) {
        setError(result.error)
      } else {
        setMessages(result.messages || [])
      }
      setLoadingMessages(false)
    })
  }, [selectedContact])

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!replyText.trim() || !selectedContact) return

    setSending(true)
    setError(null)
    const result = await sendManualReply(selectedContact.id, replyText.trim())

    if (result.error) {
      setError(result.error)
    } else {
      // Optimistically add the message
      setMessages(prev => [...prev, {
        id: `temp-${Date.now()}`,
        contact_id: selectedContact.id,
        direction: 'outbound',
        content: replyText.trim(),
        status: 'sent',
        channel: 'whatsapp',
        created_at: new Date().toISOString()
      }])
      setReplyText('')
    }
    setSending(false)
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex rounded-lg border overflow-hidden bg-white dark:bg-zinc-950">
      {/* Left Pane: Contacts List */}
      <div className="w-1/3 border-r bg-zinc-50 dark:bg-zinc-900 flex flex-col">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-lg">Inbox</h2>
          <p className="text-xs text-zinc-500 mt-0.5">{contacts.length} conversations</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {contacts.length === 0 ? (
            <div className="p-4 text-center text-sm text-zinc-500">No active conversations.</div>
          ) : (
            contacts.map(contact => (
              <button 
                key={contact.id}
                onClick={() => setSelectedContact(contact)}
                className={`w-full text-left p-4 border-b hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-3 ${
                  selectedContact?.id === contact.id ? 'bg-zinc-100 dark:bg-zinc-800' : ''
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-zinc-500" />
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="flex items-center justify-between">
                    <p className="font-medium truncate">{contact.name || contact.phone_number || contact.instagram_id}</p>
                    <span className="text-[10px] uppercase font-bold text-zinc-400 bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                      {contact.instagram_id ? 'IG' : 'WA'}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 truncate">
                    {contact.phone_number || contact.instagram_id}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right Pane: Chat History */}
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b bg-zinc-50 dark:bg-zinc-900">
          {selectedContact ? (
            <div>
              <h3 className="font-medium">{selectedContact.name || selectedContact.phone_number}</h3>
              <p className="text-xs text-zinc-500">{selectedContact.phone_number}</p>
            </div>
          ) : (
            <h3 className="font-medium text-zinc-400">Select a conversation</h3>
          )}
        </div>
        
        <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3">
          {!selectedContact && (
            <div className="flex-1 flex items-center justify-center">
              <span className="text-sm text-zinc-400">Select a contact to view their messages</span>
            </div>
          )}

          {loadingMessages && (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
            </div>
          )}

          {selectedContact && !loadingMessages && messages.length === 0 && (
            <div className="flex-1 flex items-center justify-center">
              <span className="text-sm text-zinc-400">No messages yet</span>
            </div>
          )}

          {messages.map(msg => (
            <div
              key={msg.id}
              className={`max-w-[75%] rounded-2xl p-3 ${
                msg.direction === 'inbound'
                  ? 'self-start bg-zinc-100 dark:bg-zinc-800 rounded-tl-none'
                  : 'self-end bg-blue-600 text-white rounded-tr-none'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              <p className={`text-[10px] mt-1 ${msg.direction === 'inbound' ? 'text-zinc-400' : 'text-blue-200'}`}>
                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {msg.direction === 'outbound' && ` · ${msg.status}`}
              </p>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Error display */}
        {error && (
          <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm border-t">
            {error}
          </div>
        )}

        {/* Chat Input */}
        <div className="p-4 border-t bg-white dark:bg-zinc-950">
          <form className="flex gap-2" onSubmit={handleSend}>
            <Input
              placeholder={selectedContact ? "Type your reply..." : "Select a conversation first"}
              className="flex-1"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              disabled={!selectedContact || sending}
            />
            <Button type="submit" size="icon" disabled={!selectedContact || sending || !replyText.trim()}>
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
