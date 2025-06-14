
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  teamId: string;
  teamName: string;
  contact: string;
  contactType: 'email' | 'phone';
  role: 'team_lead' | 'team_organizer' | 'team_user';
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { teamId, teamName, contact, contactType, role }: InvitationRequest = await req.json();

    // Create invitation record
    const invitationData = {
      team_id: teamId,
      invited_by: user.id,
      role: role,
      ...(contactType === 'email' ? { email: contact } : { phone_number: contact })
    };

    const { data: invitation, error: inviteError } = await supabase
      .from('team_invitations')
      .insert(invitationData)
      .select()
      .single();

    if (inviteError) {
      throw inviteError;
    }

    const inviteUrl = `${req.headers.get('origin')}/invite/${invitation.invitation_code}`;

    if (contactType === 'email') {
      // Send email invitation
      const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
      
      await resend.emails.send({
        from: "SecureChat <onboarding@resend.dev>",
        to: [contact],
        subject: `You've been invited to join ${teamName}`,
        html: `
          <h1>Team Invitation</h1>
          <p>You've been invited to join the team "${teamName}" on SecureChat.</p>
          <p>Click the link below to accept the invitation:</p>
          <a href="${inviteUrl}" style="background-color: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Join Team</a>
          <p>This invitation will expire in 7 days.</p>
        `,
      });
    } else {
      // For SMS, we'll use Twilio (placeholder - user will need to configure)
      console.log(`SMS invitation would be sent to ${contact}: Join ${teamName} on SecureChat: ${inviteUrl}`);
      
      // Note: Implement Twilio SMS sending here when user provides API keys
      // const twilioResponse = await fetch('https://api.twilio.com/2010-04-01/Accounts/YOUR_SID/Messages.json', {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Basic ${btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`)}`,
      //     'Content-Type': 'application/x-www-form-urlencoded',
      //   },
      //   body: new URLSearchParams({
      //     From: TWILIO_PHONE,
      //     To: contact,
      //     Body: `Join ${teamName} on SecureChat: ${inviteUrl}`
      //   })
      // });
    }

    return new Response(
      JSON.stringify({ success: true, invitationCode: invitation.invitation_code }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error) {
    console.error("Error sending invitation:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
