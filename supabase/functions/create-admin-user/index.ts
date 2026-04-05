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

    // Verify the calling user is a super admin
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
        JSON.stringify({ error: 'Only super admins can create new admins' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { email, password, full_name, phone, city, state } = await req.json()

    if (!email || !password || !full_name || !phone || !city || !state) {
      return new Response(
        JSON.stringify({ error: 'All fields are required: email, password, full_name, phone, city, state' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create the user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (createError) {
      console.error('Error creating user:', createError)
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const newUserId = newUser.user?.id

    // Add admin role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({ user_id: newUserId, role: 'admin' })

    if (roleError) {
      console.error('Error adding admin role:', roleError)
      // Cleanup: delete the user if role assignment fails
      await supabaseAdmin.auth.admin.deleteUser(newUserId!)
      return new Response(
        JSON.stringify({ error: 'Failed to assign admin role: ' + roleError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create admin profile
    const { error: profileError } = await supabaseAdmin
      .from('admin_profiles')
      .insert({
        user_id: newUserId,
        full_name,
        email,
        phone,
        city,
        state,
        is_super_admin: false,
        created_by: callingUser.id,
      })

    if (profileError) {
      console.error('Error creating admin profile:', profileError)
      return new Response(
        JSON.stringify({ error: 'User created but profile failed: ' + profileError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        message: 'Admin user created successfully',
        user_id: newUserId,
        email: newUser.user?.email,
      }),
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
