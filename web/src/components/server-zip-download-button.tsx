// components/server-zip-download-button.tsx

'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';

interface ServerZipDownloadButtonProps {
  setId: string;
  setTitle?: string;
  className?: string;
}

export function ServerZipDownloadButton({ 
  setId, 
  setTitle = 'set',
  className = '' 
}: ServerZipDownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    setIsDownloading(true);
    setError(null);

    try {
      // Call the server-side API endpoint
      const response = await fetch(`/api/download/set/${setId}/download-zip`, {
        method: 'GET',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Download failed' }));
        throw new Error(errorData.error || 'Download failed');
      }

      // Get the blob from the response
      const blob = await response.blob();
      
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('content-disposition');
      let filename = `${setTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.zip`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (err) {
      console.error('Download error:', err);
      setError(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleDownload}
        disabled={isDownloading}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
          isDownloading 
            ? 'bg-gray-300 cursor-not-allowed' 
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        } ${className}`}
      >
        {isDownloading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        {isDownloading ? 'Downloading...' : 'Download ZIP'}
      </button>
      
      {error && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-red-100 text-red-700 p-2 rounded text-sm z-10 whitespace-nowrap">
          {error}
        </div>
      )}
    </div>
  );
}