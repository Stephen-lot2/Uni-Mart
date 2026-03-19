import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!PAYSTACK_SECRET_KEY) throw new Error("PAYSTACK_SECRET_KEY is not configured");

    const { reference } = await req.json();
    if (!reference) throw new Error("Missing reference");

    const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
    });

    const data = await response.json();
    if (!response.ok || !data.status || data.data.status !== "success") {
      return new Response(
        JSON.stringify({ success: false, message: "Payment verification failed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const metadata = data.data.metadata || {};
    const amountNaira = data.data.amount / 100;

    // Wallet deposit
    if (metadata.type === "wallet_deposit" && metadata.user_id) {
      const { data: wallet, error: fetchErr } = await supabase
        .from("seller_wallets")
        .select("balance")
        .eq("user_id", metadata.user_id)
        .single();

      if (fetchErr) throw new Error("Wallet not found");

      const { error } = await supabase
        .from("seller_wallets")
        .update({ balance: Number(wallet.balance) + amountNaira })
        .eq("user_id", metadata.user_id);

      if (error) throw new Error("Failed to credit wallet");

      return new Response(
        JSON.stringify({ success: true, type: "deposit", amount: amountNaira }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Order payment
    const orderId = metadata.order_id ||
      metadata.custom_fields?.find((f: any) => f.variable_name === "order_id")?.value;

    if (!orderId) throw new Error("Order ID not found in payment metadata");

    const { error } = await supabase
      .from("orders")
      .update({ status: "paid", payment_reference: reference })
      .eq("id", orderId);

    if (error) throw new Error("Failed to update order status");

    return new Response(
      JSON.stringify({ success: true, type: "order", order_id: orderId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Paystack verify error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
