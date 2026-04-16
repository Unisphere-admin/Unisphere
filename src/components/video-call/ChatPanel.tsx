"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useVideoCall } from './VideoCallProvider';
import { SidePanelProps } from './types';
import { X, Send, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

const ChatPanel: React.FC<SidePanelProps> = ({ isOpen, onClose, title }) => {
  const { messages, isLoadingMessages, onSendMessage, user } = useVideoCall();
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || isSending) return;
    
    setIsSending(true);
    try {
      await onSendMessage(messageText);
      setMessageText('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-[#1D1D1D] border-l border-[#333333] flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#333333]">
        <h3 className="text-white font-semibold">Chat</h3>
        <button
          onClick={onClose}
          className="w-8 h-8 bg-[#222222] hover:bg-[#333333] rounded-full flex items-center justify-center transition-colors"
        >
          <X className="h-4 w-4 text-white" />
        </button>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoadingMessages ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-[#00AEFC]" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-[#808080]">
            <div className="w-16 h-16 bg-[#222222] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[#808080]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-lg">No messages yet</p>
            <p className="text-sm">Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div 
              key={message.id} 
              className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.sender_id === user?.id
                    ? 'bg-[#00AEFC] text-white'
                    : 'bg-[#222222] text-white'
                }`}
              >
                <p className="text-sm font-medium mb-1">
                  {message.sender_id === user?.id ? 'You' : message.sender?.display_name || 'Other'}
                </p>
                <p className="text-sm whitespace-pre-wrap break-words" style={{ overflowWrap: 'anywhere' }}>{message.content}</p>
                <p className="text-xs opacity-70 text-right mt-1">
                  {new Date(message.created_at).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Message input */}
      <div className="p-4 border-t border-[#333333]">
        <div className="flex space-x-2">
          <input
            type="text"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 bg-[#222222] border border-[#333333] rounded-lg px-3 py-2 text-white placeholder-[#808080] focus:outline-none focus:border-[#00AEFC]"
            disabled={isSending}
          />
          <button
            onClick={handleSendMessage}
            disabled={!messageText.trim() || isSending}
            className="w-10 h-10 bg-[#00AEFC] hover:bg-[#0095E0] disabled:bg-[#333333] rounded-lg flex items-center justify-center transition-colors"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin text-white" />
            ) : (
              <Send className="h-4 w-4 text-white" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;
