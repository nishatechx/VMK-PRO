import React, { useState, useEffect } from 'react';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  CloudUpload,
  Ticket,
  FileText,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  subscribeToSyncStatus,
  SyncQueueStatus,
  getSyncQueueStatus,
} from '../services/offlineSyncService';
import { processOfflineSyncQueue } from '../services/backgroundSyncProcessor';

export const OfflineSyncStatusBanner: React.FC = () => {
  const [syncStatus, setSyncStatus] = useState<SyncQueueStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    queuedTicketsCount: 0,
    queuedUploadsCount: 0,
    totalPendingCount: 0,
    lastSyncedAt: null,
  });

  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [manualSyncMsg, setManualSyncMsg] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeToSyncStatus((status) => {
      setSyncStatus(status);
    });
    return () => unsub();
  }, []);

  const handleManualSyncNow = async () => {
    setManualSyncMsg('Syncing now...');
    const result = await processOfflineSyncQueue();
    if (result.syncedTickets > 0 || result.syncedDocs > 0) {
      setManualSyncMsg(`Synced ${result.syncedTickets} ticket(s), ${result.syncedDocs} document(s)!`);
    } else if (result.remainingTickets === 0 && result.remainingDocs === 0) {
      setManualSyncMsg('All records and documents are up to date.');
    } else {
      setManualSyncMsg('Check network connection and retry.');
    }
    setTimeout(() => setManualSyncMsg(null), 4000);
  };

  // Only show if offline, syncing, or pending queue exists
  const hasPendingItems = syncStatus.totalPendingCount > 0;
  const isOffline = !syncStatus.isOnline;
  const isSyncing = syncStatus.isSyncing;

  if (!isOffline && !hasPendingItems && !isSyncing && !manualSyncMsg) {
    return null;
  }

  return (
    <aside
      role="status"
      aria-live="polite"
      aria-label="Offline sync status"
      className={`w-full transition-all border-b z-20 text-xs ${
        isOffline
          ? 'bg-amber-500 text-slate-950 border-amber-600'
          : isSyncing
          ? 'bg-[#003B73] text-white border-[#002850]'
          : 'bg-emerald-700 text-white border-emerald-800'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-3">
        {/* Left Side: Connection & Sync State */}
        <div className="flex items-center gap-2 font-medium">
          {isOffline ? (
            <span className="flex items-center gap-1.5 font-bold">
              <WifiOff className="w-4 h-4 animate-bounce" />
              <span>Network Offline:</span>
            </span>
          ) : isSyncing ? (
            <span className="flex items-center gap-1.5 font-bold">
              <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
              <span>Background Sync Active:</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 font-bold">
              <Wifi className="w-4 h-4 text-emerald-200" />
              <span>Online:</span>
            </span>
          )}

          <span>
            {isOffline
              ? hasPendingItems
                ? `Connection unstable. ${syncStatus.totalPendingCount} item(s) safely queued in local storage (auto-sync ready).`
                : 'Connection unstable. You can still create tickets & scan documents — they will auto-sync when online.'
              : isSyncing
              ? `Syncing ${syncStatus.totalPendingCount} queued item(s) to cloud database...`
              : manualSyncMsg || `${syncStatus.totalPendingCount} item(s) queued for sync.`}
          </span>
        </div>

        {/* Right Side: Badges & Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {hasPendingItems && (
            <div className="flex items-center gap-1.5 text-[11px]">
              {syncStatus.queuedTicketsCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-black/20 font-bold">
                  <Ticket className="w-3 h-3" />
                  {syncStatus.queuedTicketsCount} ticket{syncStatus.queuedTicketsCount > 1 ? 's' : ''}
                </span>
              )}
              {syncStatus.queuedUploadsCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-black/20 font-bold">
                  <FileText className="w-3 h-3" />
                  {syncStatus.queuedUploadsCount} upload{syncStatus.queuedUploadsCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
          )}

          {/* Sync Trigger Button */}
          {syncStatus.isOnline && hasPendingItems && (
            <button
              type="button"
              onClick={handleManualSyncNow}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white text-[#003B73] font-bold text-xs hover:bg-slate-100 transition-colors shadow-2xs active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          )}

          {hasPendingItems && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 hover:bg-black/10 rounded transition-colors"
              title={isExpanded ? 'Collapse queue details' : 'Expand queue details'}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Expanded Queue Drawer */}
      {isExpanded && hasPendingItems && (
        <div className="border-t border-black/10 px-4 py-2 bg-black/10 text-xs">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <p className="font-semibold">Offline Background Queue Details:</p>
              <p className="opacity-90">
                Staff can continue attending visitors, generating SAC tickets, creating WhatsApp
                tickets, and scanning documents. All records are safely preserved in browser IndexedDB
                and will instantly commit to Firestore when network restores.
              </p>
            </div>
            {syncStatus.lastSyncedAt && (
              <p className="text-[11px] opacity-80 shrink-0">
                Last synced:{' '}
                {new Date(syncStatus.lastSyncedAt).toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </p>
            )}
          </div>
        </div>
      )}
    </aside>
  );
};
