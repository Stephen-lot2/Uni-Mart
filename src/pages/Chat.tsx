import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Send, MessageCircle, Mic, MicOff, Image, Video, Trash2, MoreVertical, X, Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { compressToBase64 } from "@/lib/imageUpload";

const Chat = () => {
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [activeConvo, setActiveConvo] = useState<string | null>(searchParams.get("conversation"));
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voice recording
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [micBlocked, setMicBlocked] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Image preview lightbox
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  // Playback state per message
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});

  const { data: conversations, refetch: refetchConvos } = useQuery({
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

      // Fetch unread counts per conversation
      const { data: unreadData } = await supabase
        .from("messages")
        .select("conversation_id")
        .eq("is_read", false)
        .neq("sender_id", user.id)
        .in("conversation_id", data.map(c => c.id));

      const unreadMap: Record<string, number> = {};
      (unreadData || []).forEach((m: any) => {
        unreadMap[m.conversation_id] = (unreadMap[m.conversation_id] || 0) + 1;
      });

      return data.map((c) => {
        const otherId = c.participant_one === user.id ? c.participant_two : c.participant_one;
        return { ...c, other_profile: profileMap[otherId], unread_count: unreadMap[c.id] || 0 };
      });
    },
    enabled: !!user,
    refetchInterval: 5000,
  });

  const { data: messages, refetch: refetchMessages } = useQuery({
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

  useEffect(() => {
    if (!activeConvo) return;
    const channel = supabase
      .channel(`messages-${activeConvo}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `conversation_id=eq.${activeConvo}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["messages", activeConvo] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeConvo, queryClient]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!activeConvo || !user || !messages) return;
    const unread = messages.filter((m: any) => m.sender_id !== user.id && !m.is_read);
    if (unread.length > 0) {
      supabase.from("messages").update({ is_read: true }).in("id", unread.map((m: any) => m.id)).then(() => {
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
      });
    }
  }, [messages, activeConvo, user]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || !activeConvo || !user) return;
    await supabase.from("messages").insert({ conversation_id: activeConvo, sender_id: user.id, content });
    await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", activeConvo);
    queryClient.invalidateQueries({ queryKey: ["messages", activeConvo] });
    queryClient.invalidateQueries({ queryKey: ["conversations"] });
  };

  const handleSendText = async () => {
    if (!message.trim()) return;
    const text = message.trim();
    setMessage("");
    await sendMessage(text);
  };

  // Delete single message
  const deleteMessage = async (id: string) => {
    const { error } = await supabase.from("messages").delete().eq("id", id);
    if (error) { toast.error("Failed to delete message"); return; }
    queryClient.invalidateQueries({ queryKey: ["messages", activeConvo] });
  };

  // Clear all messages in conversation
  const clearChat = async () => {
    if (!activeConvo) return;
    if (!confirm("Clear all messages in this conversation?")) return;
    const { error } = await supabase.from("messages").delete().eq("conversation_id", activeConvo);
    if (error) { toast.error("Failed to clear chat"); return; }
    queryClient.invalidateQueries({ queryKey: ["messages", activeConvo] });
    toast.success("Chat cleared");
  };

  // Delete entire conversation
  const deleteConversation = async (id: string) => {
    if (!confirm("Delete this conversation? This cannot be undone.")) return;
    const { error: msgErr } = await supabase.from("messages").delete().eq("conversation_id", id);
    if (msgErr) { toast.error("Failed to delete messages"); return; }
    const { error: convoErr } = await supabase.from("conversations").delete().eq("id", id);
    if (convoErr) { toast.error("Failed to delete conversation"); return; }
    if (activeConvo === id) setActiveConvo(null);
    queryClient.invalidateQueries({ queryKey: ["conversations"] });
    toast.success("Conversation deleted");
  };

  // File upload (image/video) — compress images, send video as base64
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConvo || !user) return;
    e.target.value = "";

    try {
      if (file.type.startsWith("image/")) {
        toast.loading("Uploading image...", { id: "upload" });
        const base64 = await compressToBase64(file, 800, 0.7);
        await sendMessage(`[img]${base64}[/img]`);
        toast.dismiss("upload");
      } else if (file.type.startsWith("video/")) {
        if (file.size > 10 * 1024 * 1024) { toast.error("Video must be under 10MB"); return; }
        toast.loading("Uploading video...", { id: "upload" });
        const reader = new FileReader();
        reader.onload = async () => {
          await sendMessage(`[video]${reader.result}[/video]`);
          toast.dismiss("upload");
        };
        reader.readAsDataURL(file);
      } else {
        toast.error("Only images and videos are supported");
      }
    } catch {
      toast.dismiss("upload");
      toast.error("Upload failed");
    }
  };

  // Voice recording
  const startRecording = async () => {
    // Check if permission was previously denied
    try {
      const permStatus = await navigator.permissions.query({ name: "microphone" as PermissionName });
      if (permStatus.state === "denied") {
        setMicBlocked(true);
        return;
      }
    } catch {
      // permissions API not supported, proceed anyway
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Pick a supported MIME type
      const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"]
        .find(t => MediaRecorder.isTypeSupported(t)) || "";

      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: mr.mimeType || "audio/webm" });
        const reader = new FileReader();
        reader.onload = async () => {
          await sendMessage(`[audio]${reader.result}[/audio]`);
        };
        reader.readAsDataURL(blob);
      };
      mr.start(250); // collect data every 250ms
      mediaRecorderRef.current = mr;
      setRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000);
    } catch (err: any) {
      console.error("Recording error:", err);
      setMicBlocked(true);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setRecording(false);
    setRecordingSeconds(0);
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream?.getTracks().forEach(t => t.stop());
    }
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setRecording(false);
    setRecordingSeconds(0);
  };

  const toggleAudio = (id: string, src: string) => {
    if (playingId === id) {
      audioRefs.current[id]?.pause();
      setPlayingId(null);
    } else {
      if (playingId && audioRefs.current[playingId]) {
        audioRefs.current[playingId].pause();
      }
      if (!audioRefs.current[id]) {
        const audio = new Audio(src);
        audio.onended = () => setPlayingId(null);
        audioRefs.current[id] = audio;
      }
      audioRefs.current[id].play();
      setPlayingId(id);
    }
  };

  // Render message content (text, image, video, audio)
  const renderContent = (msg: any) => {
    const c = msg.content as string;
    const isMine = msg.sender_id === user?.id;

    if (c.startsWith("[img]") && c.endsWith("[/img]")) {
      const src = c.slice(5, -6);
      return (
        <img
          src={src} alt="image"
          className="max-w-[220px] rounded-xl object-cover cursor-zoom-in"
          onClick={() => setPreviewSrc(src)}
        />
      );
    }
    if (c.startsWith("[video]") && c.endsWith("[/video]")) {
      const src = c.slice(7, -8);
      return <video src={src} controls className="max-w-[220px] rounded-xl" />;
    }
    if (c.startsWith("[audio]") && c.endsWith("[/audio]")) {
      const src = c.slice(7, -8);
      const isPlaying = playingId === msg.id;
      return (
        <div className="flex items-center gap-2">
          <button onClick={() => toggleAudio(msg.id, src)}
            className={cn("flex h-8 w-8 items-center justify-center rounded-full", isMine ? "bg-primary-foreground/20" : "bg-primary/10")}>
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <span className="text-xs opacity-70">Voice message</span>
        </div>
      );
    }
    return <p className="whitespace-pre-wrap break-words">{c}</p>;
  };

  if (!user) return <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">Please log in to view messages.</div>;

  const activeConversation = conversations?.find((c: any) => c.id === activeConvo);

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Image preview lightbox */}
      {previewSrc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setPreviewSrc(null)}
        >
          <button
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={() => setPreviewSrc(null)}
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={previewSrc}
            alt="preview"
            className="max-h-[90vh] max-w-full rounded-xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Mic blocked dialog */}
      <Dialog open={micBlocked} onOpenChange={setMicBlocked}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MicOff className="h-5 w-5 text-destructive" /> Microphone Access Needed
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>UniMart needs microphone access to record voice messages. Your browser has blocked it.</p>
            <p className="font-medium text-foreground">To fix this:</p>
            <ol className="list-decimal pl-4 space-y-1">
              <li>Click the <strong>lock icon 🔒</strong> in your browser's address bar</li>
              <li>Find <strong>Microphone</strong> and set it to <strong>Allow</strong></li>
              <li>Refresh the page and try again</li>
            </ol>
          </div>
          <Button className="w-full mt-2" onClick={() => setMicBlocked(false)}>Got it</Button>
        </DialogContent>
      </Dialog>

      {/* Conversations List */}
      <div className={cn("w-full border-r md:w-80 md:block flex flex-col", activeConvo ? "hidden md:flex" : "flex")}>
        <div className="sticky top-0 z-10 flex h-14 shrink-0 items-center border-b bg-card px-4">
          <h2 className="font-display font-semibold">Messages</h2>
        </div>
        <ScrollArea className="flex-1">
          {conversations && conversations.length > 0 ? (
            conversations.map((convo: any) => (
              <div key={convo.id} className={cn("group flex w-full items-center gap-3 border-b px-4 py-3 transition-colors hover:bg-muted", activeConvo === convo.id && "bg-muted")}>
                <button className="flex flex-1 items-center gap-3 text-left overflow-hidden" onClick={() => setActiveConvo(convo.id)}>
                  <div className="relative shrink-0">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={convo.other_profile?.avatar_url} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {convo.other_profile?.full_name?.[0] || "?"}
                      </AvatarFallback>
                    </Avatar>
                    {convo.unread_count > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
                        {convo.unread_count > 99 ? "99+" : convo.unread_count}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className={cn("truncate text-sm", convo.unread_count > 0 ? "font-bold text-foreground" : "font-medium")}>
                      {convo.other_profile?.full_name || "Unknown"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{new Date(convo.updated_at).toLocaleDateString()}</p>
                  </div>
                </button>
                <button onClick={() => deleteConversation(convo.id)}
                  className="hidden group-hover:flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
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
      <div className={cn("relative flex flex-1 flex-col overflow-hidden", !activeConvo ? "hidden md:flex" : "flex")}>
        {activeConvo && activeConversation ? (
          <>
            {/* Header — fixed at top */}
            <div className="absolute inset-x-0 top-0 z-10 flex h-14 items-center gap-3 border-b bg-card px-4">
              <Button variant="ghost" size="sm" className="fixed left-4 top-20 z-40 gap-1 rounded-full bg-card/80 shadow-md backdrop-blur border md:hidden" onClick={() => setActiveConvo(null)}>← Back</Button>
              <Avatar className="h-8 w-8">
                <AvatarImage src={activeConversation.other_profile?.avatar_url} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {activeConversation.other_profile?.full_name?.[0]}
                </AvatarFallback>
              </Avatar>
              <span className="flex-1 font-medium">{activeConversation.other_profile?.full_name}</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={clearChat}>
                    <X className="mr-2 h-4 w-4" /> Clear chat
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive" onClick={() => deleteConversation(activeConvo)}>
                    <Trash2 className="mr-2 h-4 w-4" /> Delete conversation
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Messages — scrollable middle */}
            <div className="absolute inset-x-0 bottom-[65px] top-14 overflow-y-auto p-4">
              <div className="space-y-3">
                {messages?.map((msg: any) => {
                  const isMine = msg.sender_id === user.id;
                  return (
                    <div key={msg.id} className={cn("group flex items-end gap-1", isMine ? "justify-end" : "justify-start")}>
                      {isMine && (
                        <button onClick={() => deleteMessage(msg.id)}
                          className="hidden group-hover:flex mb-1 h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                      <div className={cn(
                        "max-w-[75%] rounded-2xl px-4 py-2 text-sm",
                        isMine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted rounded-bl-sm"
                      )}>
                        {renderContent(msg)}
                        <p className={cn("mt-1 text-[10px]", isMine ? "text-primary-foreground/60" : "text-muted-foreground")}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input — fixed at bottom */}
            <div className="absolute inset-x-0 bottom-0 border-t bg-card p-3">
              {recording ? (
                <div className="flex items-center gap-2">
                  <div className="flex flex-1 items-center gap-2 rounded-full border bg-destructive/10 px-4 py-2">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-destructive" />
                    <span className="text-sm text-destructive font-medium">
                      Recording {Math.floor(recordingSeconds / 60).toString().padStart(2, "0")}:{(recordingSeconds % 60).toString().padStart(2, "0")}
                    </span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={cancelRecording} className="text-muted-foreground">
                    <X className="h-4 w-4" />
                  </Button>
                  <Button size="icon" onClick={stopRecording} className="rounded-full bg-destructive hover:bg-destructive/90">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <form onSubmit={(e) => { e.preventDefault(); handleSendText(); }} className="flex items-center gap-2">
                  <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileUpload} />
                  <Button type="button" variant="ghost" size="icon" className="shrink-0 h-9 w-9 rounded-full"
                    onClick={() => fileInputRef.current?.click()}>
                    <Image className="h-4 w-4" />
                  </Button>
                  <Input
                    placeholder="Type a message..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="flex-1 rounded-full"
                  />
                  {message.trim() ? (
                    <Button type="submit" size="icon" className="shrink-0 rounded-full">
                      <Send className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button type="button" size="icon" variant="ghost" className="shrink-0 rounded-full"
                      onClick={startRecording}>
                      <Mic className="h-4 w-4" />
                    </Button>
                  )}
                </form>
              )}
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
