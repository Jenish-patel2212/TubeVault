import React, { useState, useEffect } from 'react';
import { DownloadHistory } from '../components/DownloadHistory';
import { HistoryItem } from '../types/api';
import { getDownloadHistory, clearDownloadHistory, deleteHistoryItem } from '../utils/storage';

interface HistoryPageProps {
  onReAnalyze: (url: string) => void;
  onNotify?: (title: string, message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({ onReAnalyze, onNotify }) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    setHistory(getDownloadHistory());
  }, []);

  const handleClear = () => {
    clearDownloadHistory();
    setHistory([]);
    onNotify?.('History Cleared', 'All download records have been cleared from your browser.', 'info');
  };

  const handleDeleteItem = (id: string) => {
    deleteHistoryItem(id);
    setHistory((prev) => prev.filter((item) => item.id !== id));
    onNotify?.('Record Cleared', 'The selected download record was removed.', 'info');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <DownloadHistory
        history={history}
        onClearHistory={handleClear}
        onReAnalyze={onReAnalyze}
        onDeleteItem={handleDeleteItem}
      />
    </div>
  );
};
