import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user: callingUser }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !callingUser) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if calling user is super admin
    const { data: callerProfile } = await supabaseAdmin
      .from('admin_profiles')
      .select('is_super_admin')
      .eq('user_id', callingUser.id)
      .single()

    if (!callerProfile?.is_super_admin) {
      return new Response(
        JSON.stringify({ error: 'Only super admins can delete admins' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { admin_user_id } = await req.json()

    if (!admin_user_id) {
      return new Response(
        JSON.stringify({ error: 'admin_user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Prevent deleting super admin
    const { data: targetProfile } = await supabaseAdmin
      .from('admin_profiles')
      .select('is_super_admin')
      .eq('user_id', admin_user_id)
      .single()

    if (targetProfile?.is_super_admin) {
      return new Response(
        JSON.stringify({ error: 'Cannot delete super admin' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Delete all admin data
    await supabaseAdmin.from('admin_mp_credentials').delete().eq('user_id', admin_user_id)
    await supabaseAdmin.from('admin_profiles').delete().eq('user_id', admin_user_id)
    await supabaseAdmin.from('customer_records').delete().eq('created_by', admin_user_id)
    await supabaseAdmin.from('monthly_statements').delete().eq('created_by', admin_user_id)
    await supabaseAdmin.from('spreadsheet_settings').delete().eq('created_by', admin_user_id)
    await supabaseAdmin.from('payments').delete().eq('admin_id', admin_user_id)
    await supabaseAdmin.from('iptv_users').delete().eq('created_by', admin_user_id)
    await supabaseAdmin.from('plans').delete().eq('created_by', admin_user_id)
    await supabaseAdmin.from('iptv_panels').delete().eq('created_by', admin_user_id)
    await supabaseAdmin.from('user_roles').delete().eq('user_id', admin_user_id)

    // Delete auth user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(admin_user_id)

    if (deleteError) {
      console.error('Error deleting auth user:', deleteError)
      return new Response(
        JSON.stringify({ error: 'Failed to delete auth user: ' + deleteError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ message: 'Admin deleted successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
