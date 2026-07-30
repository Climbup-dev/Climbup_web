import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Convert file to array buffer and then to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = `data:${file.type};base64,${buffer.toString('base64')}`;

    // Return the base64 image directly since we don't have Cloudinary keys
    return NextResponse.json({
      url: base64Image,
      public_id: `base64_${Date.now()}`,
    });
  } catch (error) {
    console.error('Error processing image:', error);
    return NextResponse.json(
      { error: 'Failed to process image' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { url } = await request.json();
    
    if (!url) {
      return NextResponse.json({ error: 'No URL provided' }, { status: 400 });
    }

    // Since we are now using base64 strings embedded in the document,
    // there is no external storage cleanup required.
    // The image will be deleted when the document is updated/saved without it.
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in delete route:', error);
    return NextResponse.json(
      { error: 'Failed to process delete' },
      { status: 500 }
    );
  }
}
