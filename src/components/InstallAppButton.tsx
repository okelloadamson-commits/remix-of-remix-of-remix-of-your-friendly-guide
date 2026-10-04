import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";

const APK_URL = "https://pub-1be50268c1e84d6eabf85c0b779e7eb2.r2.dev/Luo%20ancient%20movies.apk";

export function InstallAppButton() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const dismissedAt = localStorage.getItem("app_download_dismissed");
    setDismissed(!!dismissedAt && Date.now() - parseInt(dismissedAt) < 86400000);
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("app_download_dismissed", Date.now().toString());
  };

  if (dismissed) return null;

  return (
    <div className="fixed bottom-20 right-4 z-50 flex items-center gap-2 animate-in slide-in-from-bottom-4 fade-in duration-500 lg:bottom-6">
      <a
        href={APK_URL}
        download
        className="flex items-center gap-2 px-4 py-3 rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-105 transition-transform font-medium text-sm"
      >
        <Download className="w-5 h-5" />
        Download App
      </a>
      <button
        onClick={handleDismiss}
        className="p-2 rounded-full bg-muted text-muted-foreground hover:bg-muted/80 shadow-md"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
