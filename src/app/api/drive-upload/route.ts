import { NextResponse } from "next/server";
import { google } from "googleapis";
import { Readable } from "stream";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rateLimit";

const TARGET_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || "1VDrNYA5GE6l9h21D2Co0HuuuD87Ain6d";
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50 MB

export async function POST(req: Request) {
  try {
    // 1. Rate Limiting Protection (15 uploads per minute per IP)
    const clientIp = getClientIp(req);
    const rl = checkRateLimit(`drive-upload:${clientIp}`, { maxRequests: 15, windowMs: 60000 });
    if (!rl.success) {
      return rateLimitResponse(rl.resetMs);
    }

    // 2. Verify user authentication against Supabase session
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in to upload resources." },
        { status: 401 }
      );
    }

    // 3. Authenticate with OAuth2 using Admin Account credentials
    const clientId = process.env.GOOGLE_ADMIN_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_ADMIN_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_ADMIN_REFRESH_TOKEN;

    if (!clientId || !clientSecret || !refreshToken) {
      return NextResponse.json(
        { error: "Server is not configured with Google Drive storage credentials." },
        { status: 500 }
      );
    }

    // 4. Parse the multipart form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: "File exceeds maximum allowed upload limit of 50 MB." },
        { status: 413 }
      );
    }

    // Sanitize filename to prevent directory traversal or control characters
    const sanitizedFileName = (file.name || "upload.bin")
      .replace(/[\\/]/g, "_")
      .replace(/[\x00-\x1f\x80-\x9f]/g, "")
      .trim();

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      "https://developers.google.com/oauthplayground"
    );

    oauth2Client.setCredentials({
      refresh_token: refreshToken
    });

    const drive = google.drive({ version: "v3", auth: oauth2Client });

    // 5. Convert Web File to a Node.js Stream
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    // 6. Upload to Google Drive target folder
    const fileMetadata = {
      name: sanitizedFileName,
      parents: [TARGET_FOLDER_ID],
    };

    const media = {
      mimeType: file.type || "application/octet-stream",
      body: stream,
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: "id, webViewLink, webContentLink",
      supportsAllDrives: true,
    });

    // 7. Make file viewable by students
    if (response.data.id) {
      try {
        await drive.permissions.create({
          fileId: response.data.id,
          supportsAllDrives: true,
          requestBody: {
            role: "reader",
            type: "anyone",
          },
        });
      } catch (permError) {
        console.warn("Could not set reader permissions on drive file:", permError);
      }
    }

    return NextResponse.json({
      success: true,
      fileId: response.data.id,
      webViewLink: response.data.webViewLink,
      webContentLink: response.data.webContentLink,
      message: "File securely uploaded to centralized Google Drive storage.",
    });

  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("Drive upload error:", errorMsg);
    return NextResponse.json(
      { error: "Failed to upload file to Google Drive. Please try again later." },
      { status: 500 }
    );
  }
}
