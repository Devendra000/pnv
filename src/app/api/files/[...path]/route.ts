import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { resolvePublicFilePath } from '@/lib/actions';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params;
    if (!pathSegments || pathSegments.length === 0) {
      return new NextResponse('File path missing', { status: 400 });
    }

    const relativePath = pathSegments.join('/');
    // Sanitize path to prevent directory traversal
    const sanitizedPath = path.normalize(relativePath).replace(/^(\.\.[\/\\])+/, '');
    const filePath = resolvePublicFilePath(sanitizedPath);

    if (!fs.existsSync(filePath)) {
      console.error(`[API /api/files] File not found: ${filePath} (CWD: ${process.cwd()})`);
      return new NextResponse(`File not found: ${sanitizedPath}`, { status: 404 });
    }

    const stats = await fs.promises.stat(filePath);
    if (!stats.isFile()) {
      return new NextResponse('Invalid file', { status: 400 });
    }

    const fileBuffer = await fs.promises.readFile(filePath);

    // Determine Content-Type based on file extension
    const ext = path.extname(filePath).toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === '.docx') {
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    } else if (ext === '.pdf') {
      contentType = 'application/pdf';
    } else if (ext === '.png') {
      contentType = 'image/png';
    } else if (ext === '.jpg' || ext === '.jpeg') {
      contentType = 'image/jpeg';
    } else if (ext === '.txt') {
      contentType = 'text/plain; charset=utf-8';
    }

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': stats.size.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('[API /api/files] Error serving file:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
