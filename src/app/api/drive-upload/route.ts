import { NextResponse } from "next/server";
import { google } from "googleapis";
import { Readable } from "stream";

// Target Folder ID provided by user
const TARGET_FOLDER_ID = "1VDrNYA5GE6l9h21D2Co0HuuuD87Ain6d";

export async function POST(req: Request) {
  try {
    // 1. Authenticate with OAuth2 using the 5TB Admin Account credentials
    const clientId = process.env.GOOGLE_ADMIN_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_ADMIN_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_ADMIN_REFRESH_TOKEN;

    if (!clientId || !clientSecret || !refreshToken) {
      return NextResponse.json(
        { error: "Server is not configured with Google OAuth credentials." },
        { status: 500 }
      );
    }

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      "https://developers.google.com/oauthplayground"
    );

    oauth2Client.setCredentials({
      refresh_token: refreshToken
    });

    const drive = google.drive({ version: "v3", auth: oauth2Client });

    // 2. Parse the multipart form data
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // 3. Convert Web File to a Node.js Stream for Google API
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    // 4. Upload to Google Drive target folder
    const fileMetadata = {
      name: file.name,
      parents: [TARGET_FOLDER_ID],
    };

    const media = {
      mimeType: file.type,
      body: stream,
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: "id, webViewLink, webContentLink",
      supportsAllDrives: true,
    });

    // 5. Optionally, make the file accessible to anyone with the link
    // so students can view the notes later.
    try {
      await drive.permissions.create({
        fileId: response.data.id as string,
        supportsAllDrives: true,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        }
      });
    } catch (permError) {
      console.warn("Could not set public permissions on file", permError);
    }

    return NextResponse.json({
      success: true,
      fileId: response.data.id,
      webViewLink: response.data.webViewLink,
      webContentLink: response.data.webContentLink,
      message: "File securely uploaded to centralized Google Drive.",
    });

  } catch (error: any) {
    console.error("Drive upload error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload file to Google Drive" },
      { status: 500 }
    );
  }
}
