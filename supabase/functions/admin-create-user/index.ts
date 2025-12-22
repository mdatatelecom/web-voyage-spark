import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !requestingUser) {
      throw new Error('Unauthorized');
    }

    // Check if requesting user is admin
    const { data: roles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUser.id)
      .eq('role', 'admin');

    if (rolesError || !roles || roles.length === 0) {
      throw new Error('Only admins can create users');
    }

    const { email, password, fullName, phone, role } = await req.json();

    if (!email || !password || !fullName || !role) {
      throw new Error('Missing required fields');
    }

    console.log('Creating user:', { email, fullName, phone, role });

    // Create the user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
      },
    });

    if (createError) {
      console.error('Error creating user:', createError);
      throw createError;
    }

    console.log('User created successfully:', newUser.user.id);

    // Update profile with phone number if provided
    if (phone) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({ phone, full_name: fullName })
        .eq('id', newUser.user.id);

      if (profileError) {
        console.error('Error updating profile:', profileError);
        // Don't throw - profile update is not critical
      } else {
        console.log('Profile updated with phone:', phone);
      }
    }

    // Assign role to the new user
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        role: role,
        assigned_by: requestingUser.id,
      });

    if (roleError) {
      console.error('Error assigning role:', roleError);
      throw roleError;
    }

    console.log('Role assigned successfully');

    // Try to fetch WhatsApp profile picture if phone is provided
    let avatarUrl = null;
    if (phone) {
      try {
        console.log('Attempting to fetch WhatsApp profile picture for:', phone);
        
        const whatsappResponse = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-whatsapp`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              action: 'fetch-profile-picture',
              phone: phone,
            }),
          }
        );

        if (whatsappResponse.ok) {
          const pictureData = await whatsappResponse.json();
          
          if (pictureData?.success && pictureData?.profilePictureUrl) {
            avatarUrl = pictureData.profilePictureUrl;
            
            // Update profile with avatar
            const { error: avatarError } = await supabaseAdmin
              .from('profiles')
              .update({ 
                avatar_url: avatarUrl,
                avatar_updated_at: new Date().toISOString()
              })
              .eq('id', newUser.user.id);

            if (avatarError) {
              console.error('Error updating avatar:', avatarError);
            } else {
              console.log('✅ WhatsApp avatar saved for new user');
            }
          } else {
            console.log('No WhatsApp profile picture available');
          }
        } else {
          console.log('WhatsApp function returned error:', whatsappResponse.status);
        }
      } catch (whatsappError) {
        console.log('Could not fetch WhatsApp profile picture:', whatsappError);
        // Don't throw - this is optional functionality
      }
    }

    // Log the action
    await supabaseAdmin.from('access_logs').insert({
      user_id: requestingUser.id,
      action: 'user_created',
      details: { 
        created_user_id: newUser.user.id, 
        email: email,
        role: role,
        has_avatar: !!avatarUrl
      },
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: {
          id: newUser.user.id,
          email: newUser.user.email,
          created_at: newUser.user.created_at,
          avatar_url: avatarUrl,
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in admin-create-user function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
