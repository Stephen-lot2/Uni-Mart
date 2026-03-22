import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/lib/store";

/**
 * Requests browser push permission once, then subscribes to realtime
 * new messages. When a message arrives for the current user (they are
 * NOT the sender and the app is NOT focused), fires a Web Notification.
 * Also invalidates the unread-count query so BottomNav badge updates.
 */
export function useNotifications() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const permissionAsked = useRef(false);

  // Ask for notification permission once after login
  useEffect(() => {
    if (!user || permissionAsked.current) return;
    if (!("Notification" in window)) return;
    if (Notification.permission === "default") {
      permissionAsked.current = true;
      Notification.requestPermission();
    }
  }, [user]);

  // Subscribe to ALL new messages where the current user is a participant
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`user-notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        async (payload) => {
          const msg = payload.new as any;

          // Ignore messages sent by the current user
          if (msg.sender_id === user.id) return;

          // Check the message belongs to a conversation the user is in
          const { data: convo } = await supabase
            .from("conversations")
            .select("id, participant_one, participant_two")
            .eq("id", msg.conversation_id)
            .or(`participant_one.eq.${user.id},participant_two.eq.${user.id}`)
            .maybeSingle();

          if (!convo) return; // not their conversation

          // Invalidate unread count so badge updates everywhere
          queryClient.invalidateQueries({ queryKey: ["unread-count", user.id] });
          queryClient.invalidateQueries({ queryKey: ["conversations", user.id] });

          // Fire browser notification only when app is not focused
          if (document.visibilityState === "visible") return;
          if (!("Notification" in window)) return;
          if (Notification.permission !== "granted") return;

          // Get sender name
          const { data: sender } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", msg.sender_id)
            .maybeSingle();

          const senderName = sender?.full_name || "Someone";
          const body = msg.content.startsWith("[img]")
            ? "📷 Sent you an image"
            : msg.content.startsWith("[video]")
            ? "🎥 Sent you a video"
            : msg.content.startsWith("[audio]")
            ? "🎤 Sent you a voice message"
            : msg.content.length > 80
            ? msg.content.slice(0, 80) + "…"
            : msg.content;

          const notif = new Notification(`💬 ${senderName}`, {
            body,
            icon: "/favicon.png",
            badge: "/favicon.png",
            tag: `chat-${convo.id}`, // replaces previous notif from same convo
          } as NotificationOptions);

          // Clicking the notification opens the chat
          notif.onclick = () => {
            window.focus();
            window.location.href = `/chat?conversation=${convo.id}`;
          };
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);
}
