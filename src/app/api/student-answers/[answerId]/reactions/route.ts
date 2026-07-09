import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { createRouteHandlerClient, createAdminClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ answerId: string }> }
) {
  try {
    const { answerId } = await params;
    const { reaction_type } = await request.json();

    // 1. Authenticate user securely using cookies
    const response = NextResponse.json({ ok: true });
    const supabase = createRouteHandlerClient(request, response);
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUserId = user.id;

    // 2. Save the reaction to the database
    if (reaction_type) {
      await supabase
        .from("reactions")
        .upsert({
          answer_id: answerId,
          user_id: currentUserId,
          reaction_type: reaction_type,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'answer_id,user_id'
        });
    } else {
      await supabase
        .from("reactions")
        .delete()
        .eq('answer_id', answerId)
        .eq('user_id', currentUserId);
    }

    // 2. If it's a "like", trigger the email notification
    if (reaction_type === "like") {
      // Fetch the answer to find the author's user_id
      const { data: answer } = await supabase
        .from("student_answers")
        .select("user_id, question_id")
        .eq("answer_id", answerId)
        .single();

      if (answer && answer.user_id !== currentUserId) {
        // Fetch the author's email using the admin client
        try {
          const adminClient = createAdminClient();
          const { data: authorAuth } = await adminClient.auth.admin.getUserById(answer.user_id);
          const authorEmail = authorAuth?.user?.email;

          // Also get current user's name for the email template
          let currentUserName = "Someone";
          const { data: profile } = await supabase.from('users').select('full_name').eq('user_id', currentUserId).single();
          if (profile?.full_name) {
            currentUserName = profile.full_name;
          }

          if (authorEmail && process.env.SMTP_HOST) {
          // Configure Nodemailer transporter
          const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || "587"),
            secure: false, // true for 465, false for other ports
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            },
          });

          // Email Content
          const mailOptions = {
            from: `"ClimbUP" <${process.env.SMTP_USER}>`,
            to: authorEmail,
            subject: "🌟 Someone liked your answer on ClimbUP!",
            html: `
              <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); border: 1px solid #f0fdf4;">
                
                <!-- Header with Gradient -->
                <div style="background: linear-gradient(135deg, #021526 0%, #063c5d 100%); padding: 40px 20px; text-align: center;">
                  <h1 style="color: #38d399; margin: 0; font-size: 36px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase;">
                    ClimbUP
                  </h1>
                  <p style="color: #e2e8f0; margin-top: 10px; font-size: 16px;">Elevate your learning journey</p>
                </div>

                <!-- Body Content -->
                <div style="padding: 40px 30px;">
                  <h2 style="color: #1e293b; font-size: 24px; margin-top: 0; margin-bottom: 20px;">
                    Great news, your knowledge is making an impact! 🎉
                  </h2>
                  
                  <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
                    <strong>${currentUserName}</strong> just liked your answer.
                  </p>
                  
                  <div style="background-color: #f8fafc; border-left: 4px solid #38d399; padding: 20px; border-radius: 0 8px 8px 0; margin-bottom: 30px;">
                    <p style="color: #334155; font-size: 15px; line-height: 1.5; margin: 0; font-style: italic;">
                      "Your contributions are actively helping other students understand complex topics and learn more effectively. You're doing amazing work!"
                    </p>
                  </div>

                  <div style="text-align: center; margin-top: 40px;">
                    <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://climbup.com'}/question/${answer.question_id}" style="display: inline-block; background-color: #38d399; color: #021526; text-decoration: none; font-weight: 700; font-size: 16px; padding: 14px 32px; border-radius: 30px; transition: all 0.2s;">
                      View Your Answer
                    </a>
                  </div>
                </div>

                <!-- Footer -->
                <div style="background-color: #f1f5f9; padding: 24px; text-align: center;">
                  <p style="color: #64748b; font-size: 13px; margin: 0;">
                    Keep answering, keep climbing! 🚀
                  </p>
                  <p style="color: #94a3b8; font-size: 12px; margin-top: 10px;">
                    &copy; ${new Date().getFullYear()} ClimbUP. All rights reserved.
                  </p>
                </div>
              </div>
            `,
          };

          // Send the email (do not await, let it run in background to not block response)
          transporter.sendMail(mailOptions).catch(console.error);
        }
        } catch (emailError) {
          console.error("Failed to fetch author email or send notification:", emailError);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in reactions route:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
