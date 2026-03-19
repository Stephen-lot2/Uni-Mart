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

    const { email, amount, orderId, metadata, callback_url } = await req.json();

    if (!email || !amount) throw new Error("Missing required fields: email, amount");

    const isWalletDeposit = !orderId && metadata?.type === "wallet_deposit";
    const reference = `unimart_${isWalletDeposit ? "deposit" : orderId}_${Date.now()}`;
    const callbackUrl = callback_url ||
      `${req.headers.get("origin") || "https://unimart.lovable.app"}/payment/callback`;

    const paystackBody: Record<string, unknown> = {
      email,
      amount: Math.round(amount),
      reference,
      callback_url: callbackUrl,
      metadata: {
        ...metadata,
        ...(orderId && {
          custom_fields: [{ display_name: "Order ID", variable_name: "order_id", value: orderId }],
        }),
      },
    };

    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(paystackBody),
    });

    const data = await response.json();
    if (!response.ok || !data.status) throw new Error(data.message || "Paystack initialization failed");

    // For order payments, store the reference on the order
    if (orderId) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await supabase.from("orders").update({ paystack_reference: data.data.reference }).eq("id", orderId);
    }

    return new Response(
      JSON.stringify({ data: { authorization_url: data.data.authorization_url, reference: data.data.reference, access_code: data.data.access_code } }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Paystack initialize error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
