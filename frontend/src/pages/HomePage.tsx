import React, { useState, useEffect, useRef } from 'react';
import { Hero } from '../components/Hero';
import { URLInput } from '../components/URLInput';
import { MediaPreview } from '../components/MediaPreview';
import { FormatSelector } from '../components/FormatSelector';
import { DownloadProgress } from '../components/DownloadProgress';
import { SearchResults } from '../components/SearchResults';
import { FormatOption, MediaMetadata, DownloadJobStatus, MediaType, SearchResultItem, LicenseData } from '../types/api';
import { analyzeUrl, startDownload, getJobStatus, cancelJob, getFileDownloadUrl, searchYouTube, generateLicenseCertificate } from '../utils/api';
import { saveHistoryItem, getActiveLicenseKey, downloadTextFile } from '../utils/storage';
import { LicenseGateModal } from '../components/LicenseGateModal';

interface HomePageProps {
  initialUrl?: string;
  onNotify?: (title: string, message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  onNavigateToPricing?: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ initialUrl, onNotify, onNavigateToPricing }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  
  // Media analysis & formats state
  const [metadata, setMetadata] = useState<MediaMetadata | null>(null);

  // Download job state
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<DownloadJobStatus | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // License Gate state
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false);
  const [pendingDownload, setPendingDownload] = useState<{ format: FormatOption; type: MediaType } | null>(null);

  const pollTimerRef = useRef<any>(null);

  useEffect(() => {
    if (initialUrl) {
      handleAnalyze(initialUrl);
    }
  }, [initialUrl]);

  // Clean up polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, []);

  const handleAnalyze = async (urlToAnalyze: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    setMetadata(null);
    setJobStatus(null);
    setActiveJobId(null);

    try {
      const data = await analyzeUrl(urlToAnalyze);
      if (!data) {
        throw new Error('Unable to retrieve media details. Server may be unreachable.');
      }
      setMetadata(data);
      const displayTitle = data.title || 'Video Media';
      onNotify?.('Media Ready', `Loaded available formats for: ${displayTitle.substring(0, 35)}...`, 'success');
      // Smooth scroll to preview
      window.scrollTo({ top: 400, behavior: 'smooth' });
    } catch (err: any) {
      const msg = err?.message || 'Unable to process this URL.';
      setErrorMessage(msg);
      onNotify?.('Analysis Failed', msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    setSearchQuery(query);
    setSearchResults([]);
    setMetadata(null);

    try {
      const results = await searchYouTube(query);
      const safeResults = Array.isArray(results) ? results : [];
      if (safeResults.length === 0) {
        setErrorMessage(`No YouTube results found for "${query}". Try different search terms.`);
        onNotify?.('No Results', `No videos found for "${query}"`, 'info');
      } else {
        setSearchResults(safeResults);
        onNotify?.('Search Completed', `Found ${safeResults.length} video results.`, 'info');
      }
    } catch (err: any) {
      const msg = err?.message || 'Search failed. Please try again.';
      setErrorMessage(msg);
      onNotify?.('Search Failed', msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectFormat = async (format: FormatOption, type: MediaType) => {
    if (!metadata) return;

    // Direct download without mandatory activation gate popup
    const activeKey = getActiveLicenseKey() || 'TVLT-FREE-ACCESS';
    proceedWithDownload(format, type, activeKey);
  };

  const proceedWithDownload = async (format: FormatOption, type: MediaType, licenseKey: string) => {
    if (!metadata) return;

    setIsDownloading(true);
    setJobStatus(null);
    onNotify?.('Download Initiated', `Processing ${type.toUpperCase()} (${format.resolution || format.extension}) in background...`, 'info');

    try {
      const jobId = await startDownload(metadata.url, format.format_id, type);
      setActiveJobId(jobId);

      // Start status polling every 1 second
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);

      pollTimerRef.current = setInterval(async () => {
        try {
          const status = await getJobStatus(jobId);
          setJobStatus(status);

          if (status.status === 'completed') {
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
            setIsDownloading(false);

            // 1. Automatically trigger direct media file download to laptop
            const downloadUrl = getFileDownloadUrl(jobId);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.setAttribute('download', status.filename || 'tube_vault_media');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            onNotify?.('Download Complete', 'Your file has been saved directly to your Downloads!', 'success');

            // 2. Generate and download official License Certificate (.txt) if user has active registered license
            if (licenseKey && licenseKey !== 'TVLT-FREE-ACCESS') {
              try {
                const cert = await generateLicenseCertificate({
                  license_key: licenseKey,
                  media_title: metadata.title,
                  media_url: metadata.url,
                  format_label: `${type === 'video' ? 'Video' : 'Audio'} (${format.resolution || format.extension})`
                });
                if (cert && cert.certificate_text) {
                  downloadTextFile(cert.filename, cert.certificate_text);
                  onNotify?.('License Issued', `Official Certificate "${cert.filename}" downloaded with your video!`, 'success');
                }
              } catch (certErr) {
                console.warn('Certificate generation notice:', certErr);
              }
            }

            // 3. Record to local browser history with license key
            saveHistoryItem({
              title: metadata.title,
              url: metadata.url,
              thumbnail: metadata.thumbnail,
              channel: metadata.channel,
              format_label: `${type === 'video' ? 'Video' : 'Audio'} (${format.resolution || format.extension})`,
              media_type: type,
              status: 'Completed',
              job_id: jobId,
              license_key: licenseKey,
            });
          } else if (status.status === 'failed' || status.status === 'cancelled') {
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
            setIsDownloading(false);
            if (status.status === 'failed') {
              onNotify?.('Download Failed', status.error || 'The download could not be completed.', 'error');
            }

            saveHistoryItem({
              title: metadata.title,
              url: metadata.url,
              thumbnail: metadata.thumbnail,
              channel: metadata.channel,
              format_label: `${type === 'video' ? 'Video' : 'Audio'} (${format.resolution || format.extension})`,
              media_type: type,
              status: status.status === 'cancelled' ? 'Cancelled' : 'Failed',
              job_id: jobId,
              license_key: licenseKey,
            });
          }
        } catch (e) {
          console.error('Polling error:', e);
        }
      }, 1000);
    } catch (err: any) {
      setIsDownloading(false);
      const msg = err.message || 'Failed to start download job.';
      setErrorMessage(msg);
      onNotify?.('Download Error', msg, 'error');
    }
  };

  const handleCancelDownload = async () => {
    if (activeJobId) {
      await cancelJob(activeJobId);
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      setIsDownloading(false);
      setJobStatus((prev) =>
        prev
          ? {
              ...prev,
              status: 'cancelled',
              error: 'Download cancelled by user.',
            }
          : null
      );
    }
  };

  const handleSaveFileToLaptop = () => {
    if (activeJobId) {
      const downloadUrl = getFileDownloadUrl(activeJobId);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', jobStatus?.filename || 'tube_vault_media');
      link.setAttribute('target', '_blank');
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
      }, 250);
    }
  };

  return (
    <div className="space-y-8">
      <Hero onNavigateToPricing={onNavigateToPricing} />

      <URLInput
        onAnalyze={handleAnalyze}
        onSearch={handleSearch}
        isLoading={isLoading}
        errorMsg={errorMessage}
        onClearError={() => setErrorMessage(null)}
      />

      {/* Direct Search Results Grid */}
      {searchResults.length > 0 && !metadata && (
        <SearchResults
          results={searchResults}
          query={searchQuery}
          onSelectVideo={handleAnalyze}
          isLoading={isLoading}
        />
      )}

      {jobStatus && (
        <DownloadProgress
          status={jobStatus}
          downloadUrl={activeJobId ? getFileDownloadUrl(activeJobId) : undefined}
          onCancel={handleCancelDownload}
          onRetry={() => {
            if (metadata && metadata.video_formats.length > 0) {
              handleSelectFormat(metadata.video_formats[0], 'video');
            }
          }}
          onSaveFile={handleSaveFileToLaptop}
          onDismiss={() => {
            setJobStatus(null);
            setActiveJobId(null);
          }}
        />
      )}

      {metadata && (
        <>
          <MediaPreview metadata={metadata} />
          <FormatSelector
            metadata={metadata}
            onSelectFormat={handleSelectFormat}
            isDownloading={isDownloading}
          />
        </>
      )}

      <LicenseGateModal
        isOpen={isLicenseModalOpen}
        onClose={() => setIsLicenseModalOpen(false)}
        targetMediaTitle={metadata?.title}
        onNavigateToPricing={onNavigateToPricing || (() => {})}
        onNotify={onNotify}
        onUnlocked={(lic) => {
          if (pendingDownload) {
            proceedWithDownload(pendingDownload.format, pendingDownload.type, lic.license_key);
            setPendingDownload(null);
          }
        }}
      />
    </div>
  );
};
