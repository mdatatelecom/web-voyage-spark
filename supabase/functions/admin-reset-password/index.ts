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
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: requestingUser }, error: authError } =
      await supabaseAdmin.auth.getUser(token);

    if (authError || !requestingUser) throw new Error('Unauthorized');

    // Verifica se é admin
    const { data: roles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUser.id)
      .eq('role', 'admin');

    if (rolesError || !roles || roles.length === 0) {
      throw new Error('Apenas administradores podem redefinir senhas');
    }

    const { userId, newPassword } = await req.json();

    if (!userId || typeof userId !== 'string') {
      throw new Error('userId é obrigatório');
    }
    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      throw new Error('A senha deve ter no mínimo 6 caracteres');
    }
    if (newPassword.length > 72) {
      throw new Error('A senha deve ter no máximo 72 caracteres');
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (updateError) {
      console.error('Erro ao atualizar senha:', updateError);
      throw updateError;
    }

    await supabaseAdmin.from('access_logs').insert({
      user_id: requestingUser.id,
      action: 'password_reset',
      details: { target_user_id: userId },
    });

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('admin-reset-password error:', error);
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: msg }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
