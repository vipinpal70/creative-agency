import { promises as fs } from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { connectDB } from '../db';
import Client from '../models/client.model';
import CreativeUpload from '../models/creative-uploads';

export function sanitizeFolderName(name: string): string {
  return name.replace(/[^a-zA-Z0-9-]/g, '_').toLowerCase();
}

/**
 * Ensures the client's upload folder exists on disk.
 * Returns the absolute path to the client's upload directory.
 */
export async function ensureClientFolder(
  clientId: string,
  companyName: string
): Promise<string> {
  const safeName = sanitizeFolderName(companyName);
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', safeName);
  await fs.mkdir(uploadDir, { recursive: true });
  return uploadDir;
}

/**
 * Saves a File to the client's folder on disk, writes a document record to Client.documents,
 * and creates a CreativeUpload record in MongoDB.
 */
export async function saveFileToClientFolder(params: {
  file: File;
  clientId: string;
  companyName: string;
  uploadedById: string;
  taskId?: string;
}) {
  const { file, clientId, companyName, uploadedById, taskId } = params;

  const uploadDir = await ensureClientFolder(clientId, companyName);

  const baseName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const uniqueFileName = `${Date.now()}-${baseName}`;
  const filePath = path.join(uploadDir, uniqueFileName);

  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filePath, buffer);

  const safeFolderName = sanitizeFolderName(companyName);
  const fileUrl = `/uploads/${safeFolderName}/${uniqueFileName}`;

  const docId = new mongoose.Types.ObjectId().toString();
  const documentData = {
    id: docId,
    name: file.name,
    fileUrl,
    filePath,
    fileSize: file.size,
    uploadedAt: new Date(),
    uploadedBy: uploadedById,
  };

  await connectDB();
  
  // Save to Client documents
  await Client.findByIdAndUpdate(clientId, {
    $push: { documents: documentData }
  });

  // Save to CreativeUpload
  const newUpload = await CreativeUpload.create({
    _id: docId,
    assetName: file.name,
    clientId,
    uploadedAt: documentData.uploadedAt,
    uploadedById,
    fileType: file.type || 'application/octet-stream',
    fileSize: file.size,
    fileUrl,
    filePath,
  });

  const asset = {
    id: docId,
    assetName: file.name,
    clientId,
    uploadedAt: documentData.uploadedAt,
    uploadedById,
    fileType: file.type || 'application/octet-stream',
    fileSize: file.size,
    fileUrl,
  };

  return { asset, fileUrl, filePath };
}
