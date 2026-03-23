import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // allow all origins; you can restrict to your frontend URL
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// Serve the Edge Function
serve(async (req) => {
  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Make request to AI gateway
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: "You are a helpful, friendly AI assistant. Keep your answers clear, concise, and helpful. If you don't know something, say so honestly."
          },
          ...messages,
        ],
        stream: true,
      }),
    });

    // Handle gateway errors
    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);

      let status = 500;
      let errorMsg = "AI gateway error";

      if (response.status === 429) {
        status = 429;
        errorMsg = "Rate limit exceeded. Please try again later.";
      } else if (response.status === 402) {
        status = 402;
        errorMsg = "Payment required. Please add credits to your workspace.";
      }

      return new Response(JSON.stringify({ error: errorMsg }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Stream response with CORS headers
    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});