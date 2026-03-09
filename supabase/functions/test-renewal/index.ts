import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    // Get full swagger JSON and extract P2P schemas
    const r = await fetch('https://api-new.paineloffice.click/api-docs-json', {
      headers: { 'Authorization': 'Bearer 7222a544a4eddc1fadcfb1fa679fa2fb' }
    });
    const swagger = await r.json();
    
    // Extract P2P extend path and schemas
    const p2pExtend = swagger.paths?.['/p2p/extend/{id}'];
    const schemas = swagger.components?.schemas;
    const updateP2P = schemas?.UpdateUserP2PDto;
    const createP2P = schemas?.CreateUserP2PDto;

    return new Response(JSON.stringify({
      p2pExtend,
      UpdateUserP2PDto: updateP2P,
      CreateUserP2PDto: createP2P,
      allSchemaNames: schemas ? Object.keys(schemas) : [],
    }, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
