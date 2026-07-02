import { ImageResponse } from 'next/og';
import { promises as fs } from 'fs';
import path from 'path';

export const runtime = 'nodejs';
export const size = { width: 64, height: 64 };
export const contentType = 'image/png';

export default async function Icon() {
  const logoPath = path.join(process.cwd(), 'public', 'logo.png');
  const logoData = await fs.readFile(logoPath);
  const base64Logo = logoData.toString('base64');
  const imgSrc = `data:image/png;base64,${base64Logo}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#ffffff',
          borderRadius: 32,
        }}
      >
        <img
          src={imgSrc}
          style={{
            width: '80%',
            height: '80%',
            objectFit: 'contain',
          }}
        />
      </div>
    ),
    { ...size }
  );
}
