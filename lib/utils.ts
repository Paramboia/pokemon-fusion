import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function downloadImage(imageUrl: string, fileName: string) {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error('Failed to fetch image');
    }

    // Get the content type from the response
    const contentType = response.headers.get('content-type') || 'image/png';
    const extension = contentType.split('/')[1] || 'png';

    // Create blob with the correct content type
    const blob = await response.blob();
    const blobWithType = new Blob([blob], { type: contentType });
    
    // Create object URL
    const url = window.URL.createObjectURL(blobWithType);
    
    // Create and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}.${extension}`;
    
    // Append to body and click
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading image:', error);
    throw error;
  }
}
