import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/lib/store";

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

  // ── New messages ──
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`user-notifications-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, async (payload) => {
        const msg = payload.new as any;
        if (msg.sender_id === user.id) return;

        const { data: convo } = await supabase
          .from("conversations")
          .select("id, participant_one, participant_two")
          .eq("id", msg.conversation_id)
          .or(`participant_one.eq.${user.id},participant_two.eq.${user.id}`)
          .maybeSingle();

        if (!convo) return;

        queryClient.invalidateQueries({ queryKey: ["unread-count", user.id] });
        queryClient.invalidateQueries({ queryKey: ["conversations", user.id] });

        if (document.visibilityState === "visible") return;
        if (!("Notification" in window) || Notification.permission !== "granted") return;

        const { data: sender } = await supabase
          .from("profiles").select("full_name").eq("user_id", msg.sender_id).maybeSingle();

        const senderName = sender?.full_name || "Someone";
        const body = msg.content.startsWith("[img]") ? "📷 Sent you an image"
          : msg.content.startsWith("[video]") ? "🎥 Sent you a video"
          : msg.content.startsWith("[audio]") ? "🎤 Sent you a voice message"
          : msg.content.startsWith("[offer]") ? "💰 Sent you an offer"
          : msg.content.length > 80 ? msg.content.slice(0, 80) + "…"
          : msg.content;

        const notif = new Notification(`💬 ${senderName}`, {
          body,
          icon: "/favicon.png",
          badge: "/favicon.png",
          tag: `chat-${convo.id}`,
        } as NotificationOptions);

        notif.onclick = () => { window.focus(); window.location.href = `/chat?conversation=${convo.id}`; };
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  // ── Order status changes ──
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`order-notifications-${user.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, async (payload) => {
        const order = payload.new as any;
        const oldOrder = payload.old as any;

        // Only notify the buyer or seller involved
        const isBuyer = order.buyer_id === user.id;
        const isSeller = order.seller_id === user.id;
        if (!isBuyer && !isSeller) return;

        // Only fire when status actually changed
        if (order.status === oldOrder.status) return;

        queryClient.invalidateQueries({ queryKey: ["orders"] });

        if (document.visibilityState === "visible") return;
        if (!("Notification" in window) || Notification.permission !== "granted") return;

        const statusMessages: Record<string, { title: string; body: string }> = {
          paid: {
            title: "💳 Payment Received",
            body: isSeller ? "A buyer just paid for your listing. Prepare for delivery!" : "Your payment was confirmed.",
          },
          delivered: {
            title: "📦 Order Delivered",
            body: isBuyer ? "Seller marked your order as delivered. Confirm to release payment." : "You marked the order as delivered.",
          },
          completed: {
            title: "✅ Order Completed",
            body: isSeller ? "Payment has been released to your wallet!" : "Order completed. Enjoy your item!",
          },
          disputed: {
            title: "⚠️ Order Disputed",
            body: "A dispute was raised on your order. Our team will review it.",
          },
          cancelled: {
            title: "❌ Order Cancelled",
            body: "An order has been cancelled.",
          },
        };

        const msg = statusMessages[order.status];
        if (!msg) return;

        const notif = new Notification(msg.title, {
          body: msg.body,
          icon: "/favicon.png",
          badge: "/favicon.png",
          tag: `order-${order.id}`,
        } as NotificationOptions);

        notif.onclick = () => { window.focus(); window.location.href = `/orders`; };
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  // ── New listing from followed sellers ──
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`follow-notifications-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "listings" }, async (payload) => {
        const listing = payload.new as any;
        if (listing.seller_id === user.id) return;

        const { data: follow } = await supabase
          .from("follows")
          .select("id")
          .eq("follower_id", user.id)
          .eq("following_id", listing.seller_id)
          .maybeSingle();

        if (!follow) return;

        queryClient.invalidateQueries({ queryKey: ["home-listings"] });
        queryClient.invalidateQueries({ queryKey: ["marketplace"] });

        if (document.visibilityState === "visible") return;
        if (!("Notification" in window) || Notification.permission !== "granted") return;

        const { data: seller } = await supabase
          .from("profiles").select("full_name").eq("user_id", listing.seller_id).maybeSingle();

        const notif = new Notification(`🛍️ New listing from ${seller?.full_name || "someone you follow"}`, {
          body: `${listing.title} — ₦${Number(listing.price).toLocaleString()}`,
          icon: "/favicon.png",
          badge: "/favicon.png",
          tag: `new-listing-${listing.id}`,
        } as NotificationOptions);

        notif.onclick = () => { window.focus(); window.location.href = `/listing/${listing.id}`; };
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);
}
