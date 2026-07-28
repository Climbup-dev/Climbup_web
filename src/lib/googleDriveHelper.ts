/**
 * Helper to find or create a dedicated "ClimbUP" folder in the student's personal Google Drive
 */
export async function getOrCreateClimbUPFolder(token: string): Promise<string | null> {
  try {
    // 1. Search for an existing folder named "ClimbUP"
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent("name='ClimbUP' and mimeType='application/vnd.google-apps.folder' and trashed=false")}&fields=files(id,name)`;
    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        return searchData.files[0].id;
      }
    }

    // 2. Folder does not exist yet -> Create "ClimbUP" folder
    const createRes = await fetch("https://www.googleapis.com/drive/v3/files", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: "ClimbUP",
        mimeType: "application/vnd.google-apps.folder"
      })
    });

    if (createRes.ok) {
      const folderData = await createRes.json();
      return folderData.id;
    }
  } catch (err) {
    console.warn("Failed to get/create ClimbUP folder in Google Drive:", err);
  }

  return null;
}
