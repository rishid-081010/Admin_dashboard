import fs from 'fs';
import { supabase } from './supabase.js';

/**
 * Uploads a local file to Supabase Storage and returns the public URL.
 * @param {string} localPath - Absolute path to the local file.
 * @param {string} folder - 'original' or 'generated'
 * @param {string} filename - The target filename.
 */
export async function uploadToSupabaseStorage(localPath, folder, filename) {
  try {
    const fileBuffer = fs.readFileSync(localPath);
    const storagePath = `${folder}/${filename}`;
    
    const { data, error } = await supabase.storage
      .from('property-images')
      .upload(storagePath, fileBuffer, {
        upsert: true,
        contentType: 'image/jpeg', // generic, will auto-detect usually or just serve as image
      });
      
    if (error) {
      console.error('Supabase Storage Upload Error:', error);
      throw error;
    }
    
    const { data: publicUrlData } = supabase.storage
      .from('property-images')
      .getPublicUrl(storagePath);
      
    return publicUrlData.publicUrl;
  } catch (err) {
    console.error('Failed to upload to Supabase Storage:', err);
    return null; // Fallback to local path logic if upload fails?
  }
}

/**
 * Downloads a file from a URL to a local path.
 */
export async function downloadFile(url, destPath) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
  const buffer = await response.arrayBuffer();
  fs.writeFileSync(destPath, Buffer.from(buffer));
}
