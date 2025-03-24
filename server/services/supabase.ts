import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';

// Initialize Supabase client (with fallback for development)
const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

/**
 * Service for interacting with Supabase
 */
export const supabaseService = {
  /**
   * Upload a file to Supabase storage
   * @param file Buffer or File to upload
   * @param bucket Bucket name
   * @param path Path within the bucket
   * @returns URL of the uploaded file
   */
  async uploadFile(
    file: Buffer | File, 
    bucket: string = 'assignments', 
    path: string
  ): Promise<string> {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }
    
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
          upsert: true,
          contentType: file instanceof Buffer 
            ? 'application/octet-stream' 
            : file.type
        });
      
      if (error) {
        throw new Error(`Error uploading file: ${error.message}`);
      }
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);
      
      return urlData.publicUrl;
    } catch (error) {
      console.error('Supabase storage error:', error);
      throw error;
    }
  },
  
  /**
   * Get a file from Supabase storage
   * @param path Path to the file
   * @param bucket Bucket name
   * @returns File data as a blob
   */
  async getFile(path: string, bucket: string = 'assignments'): Promise<Blob> {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }
    
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .download(path);
      
      if (error) {
        throw new Error(`Error downloading file: ${error.message}`);
      }
      
      return data;
    } catch (error) {
      console.error('Supabase storage error:', error);
      throw error;
    }
  },
  
  /**
   * Delete a file from Supabase storage
   * @param path Path to the file
   * @param bucket Bucket name
   */
  async deleteFile(path: string, bucket: string = 'assignments'): Promise<void> {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }
    
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);
      
      if (error) {
        throw new Error(`Error deleting file: ${error.message}`);
      }
    } catch (error) {
      console.error('Supabase storage error:', error);
      throw error;
    }
  }
};

// For development environment, provide a simple mock if Supabase is not configured
if (!supabase) {
  console.warn('Supabase not configured, using mock storage service');
  
  // In-memory file storage for development
  const fileStore = new Map<string, Buffer>();
  
  // Mock implementation
  supabaseService.uploadFile = async (file: Buffer | File, bucket: string, path: string): Promise<string> => {
    const buffer = file instanceof Buffer 
      ? file 
      : Buffer.from(await file.arrayBuffer());
    
    fileStore.set(`${bucket}/${path}`, buffer);
    
    return `mock-url/${bucket}/${path}`;
  };
  
  supabaseService.getFile = async (path: string, bucket: string): Promise<Blob> => {
    const key = `${bucket}/${path}`;
    const buffer = fileStore.get(key);
    
    if (!buffer) {
      throw new Error('File not found');
    }
    
    return new Blob([buffer]);
  };
  
  supabaseService.deleteFile = async (path: string, bucket: string): Promise<void> => {
    const key = `${bucket}/${path}`;
    fileStore.delete(key);
  };
}

export default supabaseService;
