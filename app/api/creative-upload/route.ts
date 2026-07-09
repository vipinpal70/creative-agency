import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Client from '@/lib/models/client.model';
import CreativeUpload from '@/lib/models/creative-uploads';
import { saveFileToClientFolder } from '@/lib/storage/file-router';
import { logActivity } from '@/lib/activity';
import { promises as fs } from 'fs';
import { isClient, forbidden } from '@/lib/authz';

/**
 * POST /api/creative-upload
 * Saves the uploaded file to disk and registers it in the Client documents list
 * as well as the CreativeUpload collection.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const clientId = (formData.get('clientId') as string | null)?.trim();

    if (!file || !clientId) {
      return NextResponse.json(
        { error: 'file and clientId are required' },
        { status: 400 }
      );
    }

    await connectDB();
    const client = await Client.findById(clientId);
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Role check
    let isAllowed = false;
    if (session.role === 'admin' || session.role === 'member') {
      isAllowed = true;
    } else if (session.role === 'client') {
      if (client.primaryContact?.email?.toLowerCase() === session.email?.toLowerCase()) {
        isAllowed = true;
      }
    } else {
      if (client.assignedTeam && client.assignedTeam.some(userId => userId.toString() === session.userId)) {
        isAllowed = true;
      }
    }

    if (!isAllowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { asset } = await saveFileToClientFolder({
      file,
      clientId: client.id,
      companyName: client.name || client.brandName,
      uploadedById: session.userId,
    });

    await logActivity({
      req,
      action: 'CREATIVE_UPLOADED',
      details: `Uploaded creative file "${file.name}" for client "${client.name}".`,
      status: 201
    });

    return NextResponse.json(
      {
        id: asset.id,
        assetName: asset.assetName,
        clientId: asset.clientId,
        uploadedAt: asset.uploadedAt,
        uploadedBy: asset.uploadedById,
        fileType: asset.fileType,
        fileSize: asset.fileSize,
        fileUrl: asset.fileUrl,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('[POST /api/creative-upload]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/creative-upload
 * Returns the 5 most recently uploaded assets by the authenticated user.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (isClient(session)) return forbidden();

    await connectDB();

    const uploads = await CreativeUpload.find({ uploadedById: session.userId })
      .sort({ uploadedAt: -1 })
      .limit(5)
      .populate('clientId')
      .lean();

    const result = uploads.map((u: any) => {
      const clientName = u.clientId?.name || u.clientId?.brandName || 'Unknown Client';
      const clientIdStr = u.clientId?._id?.toString() || u.clientId || '';
      return {
        id: u._id ? u._id.toString() : u.id,
        assetName: u.assetName,
        clientId: clientIdStr,
        clientName: clientName,
        uploadedAt: u.uploadedAt,
        uploadedBy: u.uploadedById,
        fileType: u.fileType,
        fileSize: u.fileSize,
        fileUrl: u.fileUrl,
      };
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error('[GET /api/creative-upload]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/creative-upload
 * Deletes a creative upload from the database, removes it from the client profile,
 * and deletes the file from disk.
 * Expects `id` as a query parameter (e.g. /api/creative-upload?id=xyz)
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (isClient(session)) return forbidden();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Asset ID is required' }, { status: 400 });
    }

    await connectDB();

    const upload = await CreativeUpload.findById(id);
    if (!upload) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Connect file deletion check and DB cleanup
    // Remove from Client documents
    await Client.findByIdAndUpdate(upload.clientId, {
      $pull: { documents: { id: id } }
    });

    // Delete the file from the filesystem if it exists
    if (upload.filePath) {
      try {
        await fs.unlink(upload.filePath);
      } catch (fileErr) {
        // Log filesystem deletion error but continue DB cleanup
        console.error(`[DELETE /api/creative-upload] Failed to delete file at ${upload.filePath}:`, fileErr);
      }
    }

    // Delete the CreativeUpload record itself
    await CreativeUpload.findByIdAndDelete(id);

    await logActivity({
      req,
      action: 'CREATIVE_DELETED',
      details: `Deleted creative file "${upload.assetName}" for client ID ${upload.clientId}.`,
      status: 200
    });

    return NextResponse.json({ message: 'Asset deleted successfully' });
  } catch (err) {
    console.error('[DELETE /api/creative-upload]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
