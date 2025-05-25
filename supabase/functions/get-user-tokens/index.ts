// follow Deno and Supabase Edge Functions conventions
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Define response type for better TypeScript support
interface TokenResponse {
  tokens: number;
  userId: string;
}

/**
 * Edge function to securely retrieve user tokens
 * 
 * Security notes:
 * - Uses proper JWT validation with admin client (getUser)
 * - Authenticates requests before accessing any token data
 * - Requires valid Authorization header with Bearer token
 * - Never uses getSession() directly for auth (avoid Auth Object Injection risks)
 * 
 * The client should always:
 * 1. Get the authenticated user with auth.getUser() first
 * 2. Only then use getSession to get the access token if needed
 * 3. Send the token in Authorization header
 */
serve(async (req: Request) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Content-Type": "application/json"
  };

  try {
    // Handle preflight OPTIONS request
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    // Only allow POST requests for security
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Only POST requests are supported" }),
        { status: 405, headers: corsHeaders }
      );
    }

    // Create admin client with service role key for database access
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    
    // Get Authorization header
    const authHeader = req.headers.get("Authorization");
    
    // Log request info for debugging
    console.log("Request headers:", Object.fromEntries(req.headers.entries()));
    
    // Verify auth header exists
    if (!authHeader) {
      console.error("No Authorization header provided");
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        { status: 401, headers: corsHeaders }
      );
    }
    
    // Extract the JWT token
    const token = authHeader.replace("Bearer ", "");
    
    // Verify the token with admin client
    let authenticatedUser;
    try {
      const { data, error } = await supabaseAdmin.auth.getUser(token);
      
      if (error || !data.user) {
        console.error("Invalid JWT token:", error);
        return new Response(
          JSON.stringify({ error: "Invalid JWT token", details: error?.message }),
          { status: 401, headers: corsHeaders }
        );
      }
      
      authenticatedUser = data.user;
      console.log("Authenticated as:", authenticatedUser.email, "role:", authenticatedUser.role);
    } catch (tokenError) {
      console.error("Error verifying token:", tokenError);
      return new Response(
        JSON.stringify({ error: "Failed to verify token" }),
        { status: 401, headers: corsHeaders }
      );
    }
    
    // Parse request body
    let requestBody;
    try {
      requestBody = await req.json();
      console.log("Request body:", requestBody);
    } catch (e) {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: corsHeaders }
      );
    }
    
    const { userId } = requestBody;

    // Validate userId
    if (!userId || typeof userId !== "string") {
      return new Response(
        JSON.stringify({ error: "Valid userId is required" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Use admin client to access user token data
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("id, tokens, email")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error fetching user tokens:", error);
      return new Response(
        JSON.stringify({ 
          error: "Failed to retrieve user tokens", 
          details: error.message 
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    if (!data) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Log success info
    console.log(`Successfully retrieved tokens for user ${data.email} (${data.id}): ${data.tokens || 0}`);

    // Return the tokens information
    const response: TokenResponse = {
      tokens: data.tokens || 0,
      userId: data.id
    };

    return new Response(
      JSON.stringify(response),
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error", 
        details: String(error),
        stack: error instanceof Error ? error.stack : undefined
      }),
      { status: 500, headers: corsHeaders }
    );
  }
}); 