import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    const audienceId = process.env.RESEND_AUDIENCE_ID;

    if (audienceId) {
        const { error: contactError } = await resend.contacts.create({
            email: email,
            firstName: '', 
            unsubscribed: false,
            audienceId: audienceId
        });
        if (contactError) console.error("Contact Error:", contactError);
    }

    const { data, error: emailError } = await resend.emails.send({
      from: 'PolyPulseBets Team <team@mail.polypulsebets.com>',
      to: email,
      subject: 'Welcome to the Alpha! 🚀',
      headers: {
        'List-Unsubscribe': '<{{ unsubscribe_url }}>',
      },
      html: `
        <div style="font-family: sans-serif; background-color: #0f172a; color: #e2e8f0; padding: 40px; border-radius: 12px;">
          
          <h1 style="margin-bottom: 24px; font-size: 24px;">
            Welcome to 
            <span style="color: #ffffff;">Poly</span><span style="color: #3b82f6;">Pulse</span><span style="color: #d4af37;">Bets</span>!
          </h1>

          <p style="font-size: 16px; line-height: 1.6;">You've secured your spot on the list.</p>
          <p style="font-size: 16px; line-height: 1.6;">Here is what you can expect:</p>
          
          <ul style="font-size: 16px; line-height: 1.6; color: #cbd5e1;">
            <li style="margin-bottom: 8px;">Monthly Market recaps 📊</li>
            <li style="margin-bottom: 8px;">Alpha on new features ⚡</li>
            <li style="margin-bottom: 8px;">Early access to Mainnet 🔓</li>
          </ul>

          <p style="font-size: 16px; margin-top: 32px;">See you on the leaderboard!</p>
          
          <hr style="border: 0; border-top: 1px solid #334155; margin: 32px 0;" />
          
          <p style="font-size: 12px; color: #64748b;">
             - The PolyPulseBets Team
          </p>
          <p style="font-size: 12px; color: #64748b; margin-top: 10px;">
             <a href="{{ unsubscribe_url }}" style="color: #64748b; text-decoration: underline;">Unsubscribe</a>
          </p>
        </div>
      `
    });

    if (emailError) {
      console.error("Email Error:", emailError);
      return NextResponse.json({ error: emailError }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error("Server Error:", error);
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}