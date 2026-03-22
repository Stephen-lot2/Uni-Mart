import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Send, MessageCircle, Mic, MicOff, ImageIcon, Trash2,
  MoreVertical, X, Play, Pause, ArrowLeft, Check, CheckCheck, Smile, Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { compressToBase64 } from "@/lib/imageUpload";

/* ── helpers ── */
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function formatDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { day: "numeric", month: "long", year: "numeric" });
}
function shouldShowDate(msgs: any[], idx: number) {
  if (idx === 0) return true;
  return formatDate(msgs[idx].created_at) !== formatDate(msgs[idx - 1].created_at);
}

const EMOJIS = ["😀","😂","❤️","👍","🙏","😍","🔥","😭","😊","🥺","💯","🎉","😅","🤣","✅","👏","🤔","😢","💪","🙌"];

const Chat = () => {
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeConvo, setActiveConvo] = useState<string | null>(searchParams.get("conversation"));
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Voice
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [micBlocked, setMicBlocked] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Lightbox
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<"image" | "video">("image");

  const openPreview = (src: string, type: "image" | "video") => { setPreviewSrc(src); setPreviewType(type); };

  const downloadMedia = (src: string, type: "image" | "video") => {
    const ext = type === "video" ? "mp4" : "jpg";
    const a = document.createElement("a");
    a.href = src;
    a.download = `unimart-media-${Date.now()}.${ext}`;
    a.click();
  };
  // Audio playback
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});
  // Emoji picker
  const [showEmoji, setShowEmoji] = useState(false);
  // Typing
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingThrottleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── queries ── */
  const { data: conversations } = useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("conversations").select("*")
        .or(`participant_one.eq.${user.id},participant_two.eq.${user.id}`)
        .order("updated_at", { ascending: false });
      if (!data?.length) return [];
      const otherIds = data.map(c => c.participant_one === user.id ? c.participant_two : c.participant_one);
      const { data: profiles } = await supabase.from("profiles").select("user_id,full_name,avatar_url").in("user_id", otherIds);
      const pm = Object.fromEntries((profiles || []).map(p => [p.user_id, p]));
      const { data: unreadData } = await supabase.from("messages")
        .select("conversation_id").eq("is_read", false).neq("sender_id", user.id)
        .in("conversation_id", data.map(c => c.id));
      const unreadMap: Record<string, number> = {};
      (unreadData || []).forEach((m: any) => { unreadMap[m.conversation_id] = (unreadMap[m.conversation_id] || 0) + 1; });
      // last message per convo
      const { data: lastMsgs } = await supabase.from("messages")
        .select("conversation_id,content,created_at")
        .in("conversation_id", data.map(c => c.id))
        .order("created_at", { ascending: false });
      const lastMap: Record<string, any> = {};
      (lastMsgs || []).forEach((m: any) => { if (!lastMap[m.conversation_id]) lastMap[m.conversation_id] = m; });
      return data.map(c => {
        const otherId = c.participant_one === user.id ? c.participant_two : c.participant_one;
        return { ...c, other_profile: pm[otherId], unread_count: unreadMap[c.id] || 0, last_message: lastMap[c.id] };
      });
    },
    enabled: !!user,
    // no polling — realtime channel handles live updates
  });

  const { data: messages } = useQuery({
    queryKey: ["messages", activeConvo],
    queryFn: async () => {
      if (!activeConvo) return [];
      const { data } = await supabase.from("messages").select("*")
        .eq("conversation_id", activeConvo).order("created_at", { ascending: true });
      return data || [];
    },
    enabled: !!activeConvo,
    // no polling — realtime channel handles live updates
  });

  /* ── realtime messages ── */
  useEffect(() => {
    if (!activeConvo) return;
    const ch = supabase.channel(`msgs-${activeConvo}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `conversation_id=eq.${activeConvo}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["messages", activeConvo] });
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [activeConvo, queryClient]);

  /* ── realtime conversations (sidebar updates) ── */
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`convos-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        queryClient.invalidateQueries({ queryKey: ["conversations", user.id] });
        queryClient.invalidateQueries({ queryKey: ["unread-count", user.id] });
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, queryClient]);

  /* ── typing channel ── */
  useEffect(() => {
    if (!activeConvo || !user) return;
    const ch = supabase.channel(`typing-${activeConvo}`, { config: { broadcast: { self: false } } });
    ch.on("broadcast", { event: "typing" }, ({ payload }: any) => {
      if (payload.user_id !== user.id) {
        setIsTyping(true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 3000);
      }
    }).subscribe((status) => {
      // Only assign ref once channel is live so sends don't silently fail
      if (status === "SUBSCRIBED") typingChannelRef.current = ch;
    });
    return () => {
      typingChannelRef.current = null;
      supabase.removeChannel(ch);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (typingThrottleRef.current) clearTimeout(typingThrottleRef.current);
      setIsTyping(false);
    };
  }, [activeConvo, user]);

  /* ── scroll to bottom ── */
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isTyping]);

  /* ── mark read ── */
  useEffect(() => {
    if (!activeConvo || !user || !messages) return;
    const unread = messages.filter((m: any) => m.sender_id !== user.id && !m.is_read);
    if (unread.length > 0) {
      supabase.from("messages").update({ is_read: true }).in("id", unread.map((m: any) => m.id))
        .then(() => queryClient.invalidateQueries({ queryKey: ["conversations"] }));
    }
  }, [messages, activeConvo, user, queryClient]);

  /* ── actions ── */
  const sendMessage = async (content: string) => {
    if (!content.trim() || !activeConvo || !user) return;
    await supabase.from("messages").insert({ conversation_id: activeConvo, sender_id: user.id, content });
    await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", activeConvo);
    queryClient.invalidateQueries({ queryKey: ["messages", activeConvo] });
    queryClient.invalidateQueries({ queryKey: ["conversations"] });
  };

  const handleSend = async () => {
    if (!message.trim()) return;
    const t = message.trim(); setMessage(""); setShowEmoji(false);
    await sendMessage(t);
  };

  const handleTyping = (val: string) => {
    setMessage(val);
    // Throttle: only broadcast once every 1.5s to avoid rate limits
    if (!typingThrottleRef.current) {
      typingChannelRef.current?.send({ type: "broadcast", event: "typing", payload: { user_id: user?.id } });
      typingThrottleRef.current = setTimeout(() => { typingThrottleRef.current = null; }, 1500);
    }
  };

  const deleteMessage = async (id: string) => {
    const { error } = await supabase.from("messages").delete().eq("id", id);
    if (error) { toast.error("Failed to delete"); return; }
    queryClient.invalidateQueries({ queryKey: ["messages", activeConvo] });
  };

  const clearChat = async () => {
    if (!activeConvo || !confirm("Clear all messages?")) return;
    const { error } = await supabase.from("messages").delete().eq("conversation_id", activeConvo);
    if (error) { toast.error("Failed"); return; }
    queryClient.invalidateQueries({ queryKey: ["messages", activeConvo] });
    toast.success("Chat cleared");
  };

  const deleteConversation = async (id: string) => {
    if (!confirm("Delete this conversation?")) return;
    await supabase.from("messages").delete().eq("conversation_id", id);
    await supabase.from("conversations").delete().eq("id", id);
    if (activeConvo === id) setActiveConvo(null);
    queryClient.invalidateQueries({ queryKey: ["conversations"] });
    toast.success("Deleted");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return; e.target.value = "";
    try {
      if (file.type.startsWith("image/")) {
        toast.loading("Sending...", { id: "up" });
        const b64 = await compressToBase64(file, 800, 0.7);
        await sendMessage(`[img]${b64}[/img]`); toast.dismiss("up");
      } else if (file.type.startsWith("video/")) {
        if (file.size > 10 * 1024 * 1024) { toast.error("Max 10MB"); return; }
        toast.loading("Sending...", { id: "up" });
        const reader = new FileReader();
        reader.onload = async () => { await sendMessage(`[video]${reader.result}[/video]`); toast.dismiss("up"); };
        reader.readAsDataURL(file);
      }
    } catch { toast.dismiss("up"); toast.error("Upload failed"); }
  };

  const startRecording = async () => {
    try {
      const perm = await navigator.permissions.query({ name: "microphone" as PermissionName });
      if (perm.state === "denied") { setMicBlocked(true); return; }
    } catch {}
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = ["audio/webm;codecs=opus","audio/webm","audio/ogg;codecs=opus","audio/mp4"].find(t => MediaRecorder.isTypeSupported(t)) || "";
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      audioChunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: mr.mimeType || "audio/webm" });
        const reader = new FileReader();
        reader.onload = async () => { await sendMessage(`[audio]${reader.result}[/audio]`); };
        reader.readAsDataURL(blob);
      };
      mr.start(250); mediaRecorderRef.current = mr;
      setRecording(true); setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000);
    } catch { setMicBlocked(true); }
  };

  const stopRecording = () => { mediaRecorderRef.current?.stop(); if (recordingTimerRef.current) clearInterval(recordingTimerRef.current); setRecording(false); setRecordingSeconds(0); };
  const cancelRecording = () => {
    if (mediaRecorderRef.current) { mediaRecorderRef.current.ondataavailable = null; mediaRecorderRef.current.onstop = null; mediaRecorderRef.current.stop(); mediaRecorderRef.current.stream?.getTracks().forEach(t => t.stop()); }
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setRecording(false); setRecordingSeconds(0);
  };

  const toggleAudio = (id: string, src: string) => {
    if (playingId === id) { audioRefs.current[id]?.pause(); setPlayingId(null); return; }
    if (playingId && audioRefs.current[playingId]) audioRefs.current[playingId].pause();
    if (!audioRefs.current[id]) { const a = new Audio(src); a.onended = () => setPlayingId(null); audioRefs.current[id] = a; }
    audioRefs.current[id].play(); setPlayingId(id);
  };

  /* ── render message content ── */
  const renderContent = (msg: any) => {
    const c = msg.content as string;
    const isMine = msg.sender_id === user?.id;
    if (c.startsWith("[img]") && c.endsWith("[/img]")) {
      const src = c.slice(5,-6);
      return (
        <div className="relative group/media">
          <img
            src={src} alt=""
            className="max-w-[220px] rounded-lg cursor-zoom-in object-cover"
            onClick={() => openPreview(src, "image")}
          />
          <button
            onClick={() => downloadMedia(src, "image")}
            className="absolute bottom-2 right-2 hidden group-hover/media:flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
            title="Download"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
        </div>
      );
    }
    if (c.startsWith("[video]") && c.endsWith("[/video]")) {
      const src = c.slice(7,-8);
      return (
        <div className="relative group/media">
          <video
            src={src}
            className="max-w-[220px] rounded-lg cursor-pointer"
            onClick={() => openPreview(src, "video")}
          />
          <div
            className="absolute inset-0 flex items-center justify-center cursor-pointer"
            onClick={() => openPreview(src, "video")}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white">
              <Play className="h-5 w-5 ml-0.5" />
            </div>
          </div>
          <button
            onClick={() => downloadMedia(src, "video")}
            className="absolute bottom-2 right-2 hidden group-hover/media:flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
            title="Download"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
        </div>
      );
    }
    if (c.startsWith("[audio]") && c.endsWith("[/audio]")) {
      const src = c.slice(7,-8); const playing = playingId === msg.id;
      return (
        <div className="flex items-center gap-2 min-w-[140px]">
          <button onClick={() => toggleAudio(msg.id, src)}
            className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", isMine ? "bg-white/20" : "bg-primary/15")}>
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <div className="flex-1 h-1 rounded-full bg-current opacity-30" />
          <span className="text-[11px] opacity-70">Voice</span>
        </div>
      );
    }
    return <p className="whitespace-pre-wrap break-words leading-relaxed">{c}</p>;
  };

  if (!user) return null;
  const activeConversation = conversations?.find((c: any) => c.id === activeConvo);

  /* ── last message preview text ── */
  const previewText = (msg: any) => {
    if (!msg) return "";
    const c = msg.content as string;
    if (c.startsWith("[img]")) return "📷 Photo";
    if (c.startsWith("[video]")) return "🎥 Video";
    if (c.startsWith("[audio]")) return "🎤 Voice message";
    return c.length > 40 ? c.slice(0, 40) + "…" : c;
  };

  return (
    <div className="fixed inset-0 flex overflow-hidden bg-background">

      {/* ── Lightbox ── */}
      {previewSrc && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95" onClick={() => setPreviewSrc(null)}>
          {/* Close */}
          <button className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors" onClick={() => setPreviewSrc(null)}>
            <X className="h-5 w-5" />
          </button>
          {/* Download */}
          <button
            className="absolute right-16 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            onClick={e => { e.stopPropagation(); downloadMedia(previewSrc, previewType); }}
            title="Download"
          >
            <Download className="h-5 w-5" />
          </button>
          {previewType === "image" ? (
            <img src={previewSrc} alt="" className="max-h-[90vh] max-w-full rounded-xl object-contain shadow-2xl" onClick={e => e.stopPropagation()} />
          ) : (
            <video src={previewSrc} controls autoPlay className="max-h-[90vh] max-w-full rounded-xl shadow-2xl" onClick={e => e.stopPropagation()} />
          )}
        </div>
      )}

      {/* ── Mic blocked dialog ── */}
      <Dialog open={micBlocked} onOpenChange={setMicBlocked}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><MicOff className="h-5 w-5 text-destructive" /> Microphone Blocked</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Allow microphone access in your browser settings, then refresh.</p>
          <Button className="w-full mt-2" onClick={() => setMicBlocked(false)}>Got it</Button>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════
          CONVERSATIONS SIDEBAR
      ════════════════════════════════════════ */}
      <div className={cn(
        "flex flex-col border-r bg-card",
        "w-full md:w-[340px] md:flex",
        activeConvo ? "hidden md:flex" : "flex"
      )}>
        {/* Sidebar header */}
        <div className="flex h-[60px] shrink-0 items-center justify-between bg-[hsl(var(--primary))] px-4">
          <button
            onClick={() => navigate(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-primary-foreground hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="font-display text-lg font-bold text-primary-foreground">Chats</span>
          <div className="w-9" />
        </div>

        {/* Search bar */}
        <div className="px-3 py-2 bg-card border-b">
          <div className="flex h-9 items-center gap-2 rounded-full bg-muted px-3">
            <MessageCircle className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground">Search or start new chat</span>
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {!conversations ? (
            /* skeleton while loading */
            <div className="space-y-0">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 border-b px-4 py-3">
                  <div className="h-12 w-12 shrink-0 animate-pulse rounded-full bg-muted/60" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-2/3 animate-pulse rounded-full bg-muted/60" />
                    <div className="h-3 w-1/2 animate-pulse rounded-full bg-muted/60" />
                  </div>
                </div>
              ))}
            </div>
          ) : conversations.length > 0 ? conversations.map((convo: any) => (
            <div
              key={convo.id}
              onClick={() => setActiveConvo(convo.id)}
              className={cn(
                "group flex cursor-pointer items-center gap-3 border-b px-4 py-3 transition-colors hover:bg-muted/60",
                activeConvo === convo.id && "bg-muted"
              )}
            >
              <div className="relative shrink-0">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={convo.other_profile?.avatar_url} />
                  <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                    {convo.other_profile?.full_name?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="truncate text-sm font-semibold text-foreground">{convo.other_profile?.full_name || "Unknown"}</p>
                  <span className={cn("text-[11px] shrink-0 ml-2", convo.unread_count > 0 ? "text-primary font-semibold" : "text-muted-foreground")}>
                    {convo.last_message ? formatTime(convo.last_message.created_at) : ""}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <p className={cn("truncate text-xs", convo.unread_count > 0 ? "text-foreground font-medium" : "text-muted-foreground")}>
                    {previewText(convo.last_message)}
                  </p>
                  {convo.unread_count > 0 && (
                    <span className="ml-2 flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                      {convo.unread_count > 99 ? "99+" : convo.unread_count}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={e => { e.stopPropagation(); deleteConversation(convo.id); }}
                className="hidden group-hover:flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )) : (
            <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
              <MessageCircle className="h-12 w-12 opacity-20 mb-3" />
              <p className="text-sm">No conversations yet</p>
              <p className="text-xs mt-1 opacity-60">Message a seller from any listing</p>
            </div>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════
          CHAT AREA
      ════════════════════════════════════════ */}
      <div className={cn("flex flex-1 flex-col overflow-hidden", !activeConvo ? "hidden md:flex" : "flex")}>
        {activeConvo && activeConversation ? (
          <>
            {/* ── Chat header (WhatsApp green) ── */}
            <div className="shrink-0 flex h-[60px] items-center gap-3 bg-[hsl(var(--primary))] px-3 shadow-md z-20">
              <button
                onClick={() => setActiveConvo(null)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-primary-foreground hover:bg-white/10 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <Avatar className="h-9 w-9 shrink-0 ring-2 ring-white/30">
                <AvatarImage src={activeConversation.other_profile?.avatar_url} />
                <AvatarFallback className="bg-white/20 text-primary-foreground font-bold text-sm">
                  {activeConversation.other_profile?.full_name?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-primary-foreground text-sm truncate leading-tight">
                  {activeConversation.other_profile?.full_name}
                </p>
                <p className="text-[11px] text-primary-foreground/70 leading-tight">
                  {isTyping ? "typing..." : "online"}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex h-9 w-9 items-center justify-center rounded-full text-primary-foreground hover:bg-white/10 transition-colors">
                    <MoreVertical className="h-5 w-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-xl">
                  <DropdownMenuItem onClick={clearChat}><X className="mr-2 h-4 w-4" /> Clear chat</DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive" onClick={() => deleteConversation(activeConvo)}>
                    <Trash2 className="mr-2 h-4 w-4" /> Delete conversation
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* ── Messages area with WhatsApp wallpaper ── */}
            <div
              className="flex-1 overflow-y-auto px-3 py-4 space-y-1"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                backgroundColor: "hsl(var(--muted)/0.3)",
              }}
            >
              {messages?.map((msg: any, idx: number) => {
                const isMine = msg.sender_id === user.id;
                const showDate = shouldShowDate(messages, idx);
                return (
                  <div key={msg.id}>
                    {/* Date separator */}
                    {showDate && (
                      <div className="flex justify-center my-3">
                        <span className="rounded-full bg-card/80 backdrop-blur px-3 py-1 text-[11px] text-muted-foreground shadow-sm border">
                          {formatDate(msg.created_at)}
                        </span>
                      </div>
                    )}

                    {/* Message bubble */}
                    <div className={cn("group flex items-end gap-1 mb-0.5", isMine ? "justify-end" : "justify-start")}>
                      {/* Delete button (own messages) */}
                      {isMine && (
                        <button
                          onClick={() => deleteMessage(msg.id)}
                          className="hidden group-hover:flex mb-1 h-6 w-6 items-center justify-center rounded-full bg-background/80 text-muted-foreground hover:text-destructive shadow-sm transition-colors"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}

                      <div className={cn(
                        "relative max-w-[72%] rounded-2xl px-3 py-2 text-sm shadow-sm",
                        isMine
                          ? "bg-[hsl(var(--primary))] text-primary-foreground rounded-br-[4px]"
                          : "bg-card text-foreground rounded-bl-[4px] border"
                      )}>
                        {/* Tail */}
                        {isMine ? (
                          <span className="absolute -right-[6px] bottom-0 h-3 w-3 overflow-hidden">
                            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-bl-full bg-[hsl(var(--primary))]" />
                          </span>
                        ) : (
                          <span className="absolute -left-[6px] bottom-0 h-3 w-3 overflow-hidden">
                            <span className="absolute bottom-0 left-0 h-3 w-3 rounded-br-full bg-card border-b border-l" />
                          </span>
                        )}

                        {renderContent(msg)}

                        {/* Time + ticks */}
                        <div className={cn("mt-0.5 flex items-center justify-end gap-1", isMine ? "text-primary-foreground/60" : "text-muted-foreground")}>
                          <span className="text-[10px]">{formatTime(msg.created_at)}</span>
                          {isMine && (
                            msg.is_read
                              ? <CheckCheck className="h-3 w-3 text-blue-300" />
                              : <Check className="h-3 w-3 opacity-60" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Typing bubble */}
              {isTyping && (
                <div className="flex items-end gap-1 justify-start mb-1">
                  <div className="rounded-2xl rounded-bl-[4px] bg-card border px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-1">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:0ms]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:150ms]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:300ms]" />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* ── Emoji picker ── */}
            {showEmoji && (
              <div className="shrink-0 border-t bg-card px-3 py-2 flex flex-wrap gap-2">
                {EMOJIS.map(e => (
                  <button key={e} onClick={() => { setMessage(m => m + e); inputRef.current?.focus(); }}
                    className="text-xl hover:scale-125 transition-transform active:scale-95">
                    {e}
                  </button>
                ))}
              </div>
            )}

            {/* ── Input bar ── */}
            <div className="shrink-0 z-20 bg-[hsl(var(--muted)/0.5)] px-2 py-2 border-t">
              {recording ? (
                <div className="flex items-center gap-2 rounded-full bg-card border px-4 py-2 shadow-sm">
                  <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-destructive" />
                  <span className="flex-1 text-sm font-medium text-destructive">
                    {Math.floor(recordingSeconds / 60).toString().padStart(2,"0")}:{(recordingSeconds % 60).toString().padStart(2,"0")}
                  </span>
                  <button onClick={cancelRecording} className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted">
                    <X className="h-4 w-4" />
                  </button>
                  <button onClick={stopRecording} className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <form onSubmit={e => { e.preventDefault(); handleSend(); }} className="flex items-end gap-2">
                  {/* Left actions */}
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => setShowEmoji(v => !v)}
                      className={cn("flex h-9 w-9 items-center justify-center rounded-full transition-colors", showEmoji ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")}>
                      <Smile className="h-5 w-5" />
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileUpload} />
                    <button type="button" onClick={() => fileInputRef.current?.click()}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted transition-colors">
                      <ImageIcon className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Input */}
                  <div className="flex-1 rounded-3xl bg-card border shadow-sm overflow-hidden">
                    <Input
                      ref={inputRef}
                      placeholder="Message"
                      value={message}
                      onChange={e => handleTyping(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                      className="border-none bg-transparent px-4 py-2.5 text-sm focus-visible:ring-0 focus-visible:ring-offset-0 h-auto"
                    />
                  </div>

                  {/* Send / Mic */}
                  {message.trim() ? (
                    <button type="submit"
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md hover:bg-primary/90 transition-colors">
                      <Send className="h-5 w-5" />
                    </button>
                  ) : (
                    <button type="button" onClick={startRecording}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md hover:bg-primary/90 transition-colors">
                      <Mic className="h-5 w-5" />
                    </button>
                  )}
                </form>
              )}
            </div>
          </>
        ) : (
          /* ── Empty state ── */
          <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-muted/20">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
              <MessageCircle className="h-12 w-12 text-primary opacity-60" />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-foreground">UniMart Chats</p>
              <p className="mt-1 text-sm text-muted-foreground">Select a conversation to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
