import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: Request) {
  try {
    // 1. Security Check: Prevent random people from triggering this
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    
    // You can change 'altumcore2026' to any password you want
    if (secret !== 'altumcore2026') {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 401 });
    }

    // 2. Fetch all files inside the 'chat-images' bucket
    const { data: files, error: listError } = await supabase.storage
      .from('chat-images')
      .list();

    if (listError) throw listError;
    
    if (!files || files.length === 0) {
      return NextResponse.json({ message: 'Bucket is already empty.' });
    }

    // 3. Find files that are strictly older than 24 hours
    const now = new Date();
    const filesToDelete = files
      .filter(file => {
        // Skip hidden placeholder files
        if (file.name === '.emptyFolderPlaceholder') return false;
        
        // Calculate age in hours
        const fileDate = new Date(file.created_at);
        const diffTime = Math.abs(now.getTime() - fileDate.getTime());
        const diffHours = diffTime / (1000 * 60 * 60);
        
        return diffHours > 24; // Only flag if older than 24h
      })
      .map(file => file.name); // Extract just the file names

    // 4. Delete the flagged files from Supabase Storage
    if (filesToDelete.length > 0) {
      const { error: deleteError } = await supabase.storage
        .from('chat-images')
        .remove(filesToDelete);

      if (deleteError) throw deleteError;

      return NextResponse.json({ 
        message: 'Success! Janitor wiped old images.', 
        deletedCount: filesToDelete.length,
        deletedFiles: filesToDelete 
      });
    }

    return NextResponse.json({ message: 'No images older than 24 hours found.' });
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
