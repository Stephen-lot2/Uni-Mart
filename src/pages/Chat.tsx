import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const Chat = () => {
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [activeConvo, setActiveConvo] = useState<string | null>(searchParams.get("conversation"));
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversations } = useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("conversations")
        .select("*")
        .or(`participant_one.eq.${user.id},participant_two.eq.${user.id}`)
        .order("updated_at", { ascending: false });
      if (!data || data.length === 0) return [];

      const otherUserIds = data.map((c) => c.participant_one === user.id ? c.participant_two : c.participant_one);
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", otherUserIds);
      const profileMap = Object.fromEntries((profiles || []).map((p) => [p.user_id, p]));

      return data.map((c) => {
        const otherId = c.participant_one === user.id ? c.participant_two : c.participant_one;
        return { ...c, other_profile: profileMap[otherId] };
      });
    },
    enabled: !!user,
  });

  const { data: messages } = useQuery({
    queryKey: ["messages", activeConvo],
    queryFn: async () => {
      if (!activeConvo) return [];
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", activeConvo)
        .order("created_at", { ascending: true });
      return data || [];
    },
    enabled: !!activeConvo,
    refetchInterval: 3000,
  });

  // Subscribe to realtime
  useEffect(() => {
    if (!activeConvo) return;
    const channel = supabase
      .channel(`messages-${activeConvo}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${activeConvo}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["messages", activeConvo] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeConvo, queryClient]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark messages as read
  useEffect(() => {
    if (!activeConvo || !user || !messages) return;
    const unread = messages.filter((m) => m.sender_id !== user.id && !m.is_read);
    if (unread.length > 0) {
      supabase.from("messages").update({ is_read: true }).in("id", unread.map((m) => m.id)).then(() => {});
    }
  }, [messages, activeConvo, user]);

  const sendMessage = async () => {
    if (!message.trim() || !activeConvo || !user) return;
    const content = message.trim();
    setMessage("");
    await supabase.from("messages").insert({
      conversation_id: activeConvo,
      sender_id: user.id,
      content,
    });
    await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", activeConvo);
    queryClient.invalidateQueries({ queryKey: ["messages", activeConvo] });
    queryClient.invalidateQueries({ queryKey: ["conversations"] });
  };

  if (!user) return <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">Please log in to view messages.</div>;

  const activeConversation = conversations?.find((c: any) => c.id === activeConvo);

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Conversations List */}
      <div className={cn(
        "w-full border-r md:w-80 md:block",
        activeConvo ? "hidden md:block" : "block"
      )}>
        <div className="flex h-14 items-center border-b px-4">
          <h2 className="font-display font-semibold">Messages</h2>
        </div>
        <ScrollArea className="h-[calc(100%-3.5rem)]">
          {conversations && conversations.length > 0 ? (
            conversations.map((convo: any) => (
              <button
                key={convo.id}
                onClick={() => setActiveConvo(convo.id)}
                className={cn(
                  "flex w-full items-center gap-3 border-b px-4 py-3 text-left transition-colors hover:bg-muted",
                  activeConvo === convo.id && "bg-muted"
                )}
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={convo.other_profile?.avatar_url} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {convo.other_profile?.full_name?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 overflow-hidden">
                  <p className="truncate font-medium text-sm">{convo.other_profile?.full_name || "Unknown"}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {new Date(convo.updated_at).toLocaleDateString()}
                  </p>
                </div>
              </button>
            ))
          ) : (
            <div className="p-6 text-center text-sm text-muted-foreground">
              <MessageCircle className="mx-auto h-8 w-8 mb-2 opacity-50" />
              No conversations yet
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className={cn(
        "flex flex-1 flex-col",
        !activeConvo ? "hidden md:flex" : "flex"
      )}>
        {activeConvo && activeConversation ? (
          <>
            <div className="flex h-14 items-center gap-3 border-b px-4">
              <Button variant="ghost" size="sm" className="md:hidden" onClick={() => setActiveConvo(null)}>←</Button>
              <Avatar className="h-8 w-8">
                <AvatarImage src={activeConversation.other_profile?.avatar_url} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {activeConversation.other_profile?.full_name?.[0]}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium">{activeConversation.other_profile?.full_name}</span>
            </div>
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {messages?.map((msg: any) => (
                  <div key={msg.id} className={cn("flex", msg.sender_id === user.id ? "justify-end" : "justify-start")}>
                    <div className={cn(
                      "max-w-[75%] rounded-2xl px-4 py-2 text-sm",
                      msg.sender_id === user.id
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted rounded-bl-sm"
                    )}>
                      <p>{msg.content}</p>
                      <p className={cn(
                        "mt-1 text-[10px]",
                        msg.sender_id === user.id ? "text-primary-foreground/60" : "text-muted-foreground"
                      )}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
            <div className="border-t p-3">
              <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" size="icon" disabled={!message.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageCircle className="mx-auto h-12 w-12 opacity-30" />
              <p className="mt-2">Select a conversation to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
