import React, { useState, useRef, useEffect } from 'react';
import { 
  Instagram, 
  Download, 
  Sparkles, 
  CheckCircle2, 
  Loader2, 
  ShieldCheck, 
  Film, 
  Music, 
  Laptop,
  Smartphone,
  AlertCircle,
  Check,
  Zap,
  Lock,
  Info
} from 'lucide-react';
import { analyzeInstagramUrl, startDownload, getJobStatus, cancelJob, getFileDownloadUrl, generateLicenseCertificate } from '../utils/api';
import { MediaMetadata, FormatOption, DownloadJobStatus, MediaType, LicenseData } from '../types/api';
import { saveHistoryItem, getActiveLicenseKey, downloadTextFile } from '../utils/storage';
import { LicenseGateModal } from '../components/LicenseGateModal';

interface InstagramPageProps {
  onNotify?: (title: string, message: string, type: 'info' | 'success' | 'warning' | 'error') => void;
  onNavigateToPricing?: () => void;
}

export const InstagramPage: React.FC<InstagramPageProps> = ({ onNotify, onNavigateToPricing }) => {
  const [url, setUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [metadata, setMetadata] = useState<MediaMetadata | null>(null);
  const [activeTab, setActiveTab] = useState<MediaType>('video');
  const [selectedFormat, setSelectedFormat] = useState<FormatOption | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<DownloadJobStatus | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  // License Gate state
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false);
  const [pendingDownload, setPendingDownload] = useState<{ format: FormatOption; type: MediaType } | null>(null);

  const pollTimerRef = useRef<any>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  const handleAnalyze = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanUrl = url.trim();
    if (!cleanUrl) {
      onNotify?.('Input Required', 'Please enter a valid Instagram Reel or Post link.', 'warning');
      return;
    }

    setIsAnalyzing(true);
    setMetadata(null);
    setSelectedFormat(null);
    setJobStatus(null);
    setActiveJobId(null);

    try {
      const data = await analyzeInstagramUrl(cleanUrl);
      if (!data) {
        throw new Error('Unable to retrieve Instagram media. Server may be unreachable.');
      }
      setMetadata(data);
      const vFormats = data.video_formats || [];
      const aFormats = data.audio_formats || [];
      if (vFormats.length > 0) {
        setSelectedFormat(vFormats[0]);
        setActiveTab('video');
      } else if (aFormats.length > 0) {
        setSelectedFormat(aFormats[0]);
        setActiveTab('audio');
      }
      const displayTitle = data.title || 'Instagram Media';
      onNotify?.('Reel Found', `Ready to download "${displayTitle.substring(0, 40)}..." in high quality.`, 'success');
    } catch (err: any) {
      onNotify?.('Verification Failed', err?.message || 'Unable to retrieve Instagram media. Verify the link is public.', 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleStartDownload = async (format: FormatOption, type: MediaType) => {
    if (!metadata) return;

    // Direct download without mandatory activation gate popup
    const activeKey = getActiveLicenseKey() || 'TVLT-FREE-ACCESS';
    proceedWithDownload(format, type, activeKey);
  };

  const proceedWithDownload = async (format: FormatOption, type: MediaType, licenseKey: string) => {
    if (!metadata) return;

    setIsDownloading(true);
    setJobStatus(null);
    onNotify?.('Download Initiated', `Saving Instagram ${type.toUpperCase()} directly to your device...`, 'info');

    try {
      const jobId = await startDownload(metadata.url, format.format_id, type);
      setActiveJobId(jobId);

      if (pollTimerRef.current) clearInterval(pollTimerRef.current);

      pollTimerRef.current = setInterval(async () => {
        try {
          const status = await getJobStatus(jobId);
          setJobStatus(status);

          if (status.status === 'completed') {
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
            setIsDownloading(false);

            // 1. DIRECT AUTO-DOWNLOAD MEDIA TO PHONE / PC
            const downloadUrl = getFileDownloadUrl(jobId);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.setAttribute('download', status.filename || 'instagram_media');
            link.setAttribute('target', '_blank');
            link.rel = 'noopener noreferrer';
            document.body.appendChild(link);
            link.click();
            setTimeout(() => {
              if (document.body.contains(link)) document.body.removeChild(link);
            }, 300);

            onNotify?.('Download Ready!', 'Instagram media saved directly to your device Downloads.', 'success');

            // 2. Generate and download official License Certificate (.txt) if user has active registered license
            if (licenseKey && licenseKey !== 'TVLT-FREE-ACCESS') {
              try {
                const cert = await generateLicenseCertificate({
                  license_key: licenseKey,
                  media_title: metadata.title,
                  media_url: metadata.url,
                  format_label: `Instagram ${type === 'video' ? 'Reel/Video' : 'Audio'} (${format.resolution || format.extension})`
                });
                if (cert && cert.certificate_text) {
                  downloadTextFile(cert.filename, cert.certificate_text);
                  onNotify?.('License Issued', `Official Certificate "${cert.filename}" downloaded!`, 'success');
                }
              } catch (certErr) {
                console.warn('Certificate generation notice:', certErr);
              }
            }

            // 3. Save to history with license_key
            saveHistoryItem({
              title: metadata.title,
              url: metadata.url,
              thumbnail: metadata.thumbnail,
              channel: metadata.channel,
              format_label: `Instagram ${type === 'video' ? 'Reel/Video' : 'Audio'} (${format.resolution || format.extension})`,
              media_type: type,
              status: 'Completed',
              job_id: jobId,
              license_key: licenseKey,
            });
          } else if (status.status === 'failed' || status.status === 'cancelled') {
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
            setIsDownloading(false);
            if (status.status === 'failed') {
              onNotify?.('Download Failed', status.error || 'Instagram media could not be fetched.', 'error');
            }

            saveHistoryItem({
              title: metadata.title,
              url: metadata.url,
              thumbnail: metadata.thumbnail,
              channel: metadata.channel,
              format_label: `Instagram ${type === 'video' ? 'Reel/Video' : 'Audio'} (${format.resolution || format.extension})`,
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
      onNotify?.('Download Error', err.message || 'Failed to start Instagram download.', 'error');
    }
  };

  const handleCancelDownload = async () => {
    if (!activeJobId) return;
    try {
      await cancelJob(activeJobId);
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      setIsDownloading(false);
      setJobStatus(null);
      onNotify?.('Download Cancelled', 'Operation cancelled by user.', 'info');
    } catch (e) {
      console.error(e);
    }
  };

  const pasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onNotify?.('Clipboard Access', 'Please paste the link manually into the input box.', 'info');
    }
  };

  const availableFormats = metadata 
    ? (activeTab === 'video' ? metadata.video_formats : metadata.audio_formats) 
    : [];

  return (
    <div className="space-y-12 pb-16">
      {/* Hero Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto pt-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-amber-500/10 border border-pink-500/25 text-xs font-semibold text-pink-400">
          <Instagram className="w-3.5 h-3.5 text-pink-400 animate-pulse" />
          <span>Instagram Reels & Post Vault</span>
          <span className="w-1.5 h-1.5 rounded-full bg-pink-400"></span>
          <span className="text-zinc-400">Phone & PC Direct Download</span>
        </div>

        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
          Download <span className="bg-gradient-to-r from-pink-500 via-rose-500 to-amber-400 bg-clip-text text-transparent">Instagram Reels</span> & Posts
        </h1>
        <p className="text-base text-zinc-400 max-w-xl mx-auto">
          Save high-quality 1080p Reels, videos, and MP3 audio directly to your phone (Android & iOS) or PC. Zero watermarks, full speed.
        </p>
      </div>

      {/* URL Input Form */}
      <div className="max-w-3xl mx-auto">
        <form onSubmit={handleAnalyze} className="relative group">
          <div className="relative flex items-center bg-zinc-900/90 backdrop-blur-xl border-2 border-zinc-800 rounded-2xl p-2 transition-all duration-300 focus-within:border-pink-500 focus-within:shadow-[0_0_30px_rgba(236,72,153,0.25)] hover:border-zinc-700">
            <div className="pl-3 pr-2 text-zinc-400 group-focus-within:text-pink-400 transition-colors">
              <Instagram className="w-6 h-6" />
            </div>

            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste Instagram Reel or Post link (e.g. https://www.instagram.com/reel/...)"
              className="w-full bg-transparent px-2 py-3 text-sm md:text-base text-white placeholder-zinc-500 focus:outline-none"
              disabled={isAnalyzing || isDownloading}
            />

            <div className="flex items-center gap-2 pr-1">
              {!url && (
                <button
                  type="button"
                  onClick={pasteClipboard}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-400 hover:text-white bg-zinc-800/80 hover:bg-zinc-700 rounded-xl transition-all"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Zap className="w-3.5 h-3.5 text-amber-400" />}
                  <span>{copied ? 'Pasted!' : 'Paste'}</span>
                </button>
              )}

              <button
                type="submit"
                disabled={isAnalyzing || isDownloading || !url.trim()}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-pink-600 via-rose-600 to-amber-600 hover:from-pink-500 hover:via-rose-500 hover:to-amber-500 font-semibold text-white shadow-lg shadow-pink-600/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 text-sm md:text-base whitespace-nowrap"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Fetch Reel</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Security & Quick Tips */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-3 px-2 text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Anti-Bypass Guard Active • SSRF Immunity & Secure TLS</span>
          </div>
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-pink-400" />
            <span>Saves directly into your Phone or PC Downloads</span>
          </div>
        </div>
      </div>

      {/* Media Metadata Preview Card */}
      {metadata && (
        <div className="max-w-3xl mx-auto bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-6 shadow-2xl space-y-6 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Thumbnail */}
            <div className="relative w-full md:w-56 aspect-[9/16] md:aspect-square rounded-xl overflow-hidden bg-black border border-zinc-800 flex-shrink-0 group">
              <img
                src={metadata.thumbnail}
                alt={metadata.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/logo.png';
                }}
              />
              <div className="absolute top-2 left-2 px-2 py-1 rounded bg-black/70 backdrop-blur-md text-[11px] font-bold text-pink-400 border border-pink-500/30 flex items-center gap-1">
                <Instagram className="w-3 h-3" />
                <span>Reel</span>
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 space-y-3 min-w-0">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-pink-500/20 text-pink-400 border border-pink-500/30">
                  {metadata.channel || 'instagram_user'}
                </span>
                <span className="text-xs text-zinc-500">Public Media</span>
              </div>

              <h2 className="text-lg md:text-xl font-bold text-white line-clamp-3 leading-snug">
                {metadata.title}
              </h2>

              <p className="text-xs text-zinc-400 line-clamp-2">
                Duration: {metadata.duration_formatted || '00:30'} • Format: High Quality MP4 / MP3
              </p>

              {/* Format selection tabs */}
              <div className="pt-2">
                <div className="flex gap-2 border-b border-zinc-800 pb-2">
                  <button
                    onClick={() => {
                      setActiveTab('video');
                      if (metadata.video_formats.length > 0) setSelectedFormat(metadata.video_formats[0]);
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                      activeTab === 'video'
                        ? 'bg-pink-600 text-white shadow-md shadow-pink-600/30'
                        : 'text-zinc-400 hover:text-white bg-zinc-800/50'
                    }`}
                  >
                    <Film className="w-3.5 h-3.5" />
                    <span>Video (MP4 1080p)</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('audio');
                      if (metadata.audio_formats.length > 0) setSelectedFormat(metadata.audio_formats[0]);
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                      activeTab === 'audio'
                        ? 'bg-pink-600 text-white shadow-md shadow-pink-600/30'
                        : 'text-zinc-400 hover:text-white bg-zinc-800/50'
                    }`}
                  >
                    <Music className="w-3.5 h-3.5" />
                    <span>Audio Only (MP3 320k)</span>
                  </button>
                </div>

                {/* Format selection chips */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {availableFormats.map((fmt: FormatOption) => {
                    const isSelected = selectedFormat?.format_id === fmt.format_id;
                    return (
                      <button
                        key={fmt.format_id}
                        onClick={() => setSelectedFormat(fmt)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                          isSelected
                            ? 'border-pink-500 bg-pink-500/20 text-pink-300 shadow-sm shadow-pink-500/30'
                            : 'border-zinc-800 bg-zinc-800/40 text-zinc-300 hover:border-zinc-700'
                        }`}
                      >
                        <span className="font-bold">{fmt.resolution || fmt.extension.toUpperCase()}</span>
                        <span className="text-zinc-500">({fmt.extension})</span>
                        {fmt.filesize_formatted && (
                          <span className="text-[10px] text-zinc-400 bg-black/40 px-1.5 py-0.5 rounded">
                            {fmt.filesize_formatted}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Download Action & Live Progress */}
          <div className="pt-4 border-t border-zinc-800/80">
            {!isDownloading && !jobStatus?.status && (
              <button
                onClick={() => selectedFormat && handleStartDownload(selectedFormat, activeTab)}
                disabled={!selectedFormat}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-pink-600 via-rose-600 to-amber-600 hover:from-pink-500 hover:via-rose-500 hover:to-amber-500 text-white font-bold flex items-center justify-center gap-2 shadow-xl shadow-pink-600/25 transition-all active:scale-98"
              >
                <Download className="w-5 h-5" />
                <span>Save to Device ({activeTab.toUpperCase()})</span>
              </button>
            )}

            {isDownloading && (
              <div className="space-y-3 bg-zinc-950/80 p-4 rounded-xl border border-zinc-800">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-pink-400 font-semibold">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing & Downloading ({jobStatus?.percent?.toFixed(1) || '0'}%)</span>
                  </div>
                  <button
                    onClick={handleCancelDownload}
                    className="text-zinc-400 hover:text-red-400 text-xs underline"
                  >
                    Cancel
                  </button>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-pink-500 via-rose-500 to-amber-400 h-full transition-all duration-300"
                    style={{ width: `${jobStatus?.percent || 5}%` }}
                  ></div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                  <span>Speed: {jobStatus?.speed_formatted || 'Optimizing connection...'}</span>
                  <span>ETA: {jobStatus?.eta_seconds ? `${jobStatus.eta_seconds}s` : 'Direct saving...'}</span>
                </div>
              </div>
            )}

            {jobStatus?.status === 'failed' && (
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 space-y-3 animate-in fade-in">
                <div className="flex items-center gap-2 text-red-400 text-sm font-semibold">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>Download Status: Notice</span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  {jobStatus.error || 'Instagram restricted access to this media. Ensure the Reel is public.'}
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    onClick={() => selectedFormat && handleStartDownload(selectedFormat, activeTab)}
                    className="px-4 py-2 text-xs font-semibold rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            )}

            {jobStatus?.status === 'completed' && activeJobId && (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span className="truncate max-w-xs sm:max-w-md">Reel Ready: {jobStatus.filename || 'Instagram Media'}</span>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <a
                    href={getFileDownloadUrl(activeJobId)}
                    download={jobStatus.filename || 'instagram_reel.mp4'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl font-extrabold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md flex items-center justify-center gap-2 text-xs transition-all active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                    <span>Save Reel to Phone</span>
                  </a>
                  <button
                    onClick={() => selectedFormat && handleStartDownload(selectedFormat, activeTab)}
                    className="px-3 py-2.5 text-xs font-semibold rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700"
                  >
                    Download Again
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Security & Features Grid */}
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-5 pt-6">
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-sm space-y-2 hover:border-pink-500/40 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white">Full HD 1080p Quality</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Extracts original bitrates and video frames without watermarks or downsampling.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-sm space-y-2 hover:border-pink-500/40 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white">Full Anti-Bypass Security</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Enterprise SSRF validation, zero cloud metadata leaks, CSP clickjack defense, and strict rate limits.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-sm space-y-2 hover:border-pink-500/40 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Smartphone className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white">Phone & Mobile Ready</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Optimized for iOS Safari and Android Chrome with direct download saving right to your mobile storage.
          </p>
        </div>
      </div>

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
