import React, { useState, useEffect } from 'react';
import { 
  HardDrive, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  Download,
  Upload,
  RefreshCw,
  Calendar,
  FileArchive
} from 'lucide-react';

interface BackupEntry {
  id: string;
  timestamp: string;
  status: 'success' | 'failed' | 'in_progress';
  size: string;
  duration: string;
  type: 'full' | 'incremental' | 'snapshot';
  verified: boolean;
}

interface BackupStatusTabProps {
  onAddLog?: (action: string, severity: 'low' | 'medium' | 'high' | 'critical') => void;
}

export default function BackupStatusTab({ onAddLog }: BackupStatusTabProps) {
  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const [lastBackup, setLastBackup] = useState<string>('Never');
  const [nextBackup, setNextBackup] = useState<string>('In 6 hours');
  const [backupSize, setBackupSize] = useState('0 MB');
  const [backupDuration, setBackupDuration] = useState('0s');
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    const generateBackups = (): BackupEntry[] => {
      const now = Date.now();
      return Array.from({ length: 15 }, (_, i) => {
        const statuses: BackupEntry['status'][] = ['success', 'success', 'success', 'failed'];
        const types: BackupEntry['type'][] = ['full', 'incremental', 'snapshot'];
        return {
          id: `backup-${Date.now()}-${i}`,
          timestamp: new Date(now - i * 86400000).toISOString(),
          status: statuses[Math.floor(Math.random() * statuses.length)],
          size: `${(Math.random() * 500 + 50).toFixed(1)} MB`,
          duration: `${Math.floor(Math.random() * 300 + 30)}s`,
          type: types[Math.floor(Math.random() * types.length)],
          verified: Math.random() > 0.2
        };
      }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    };

    const backupData = generateBackups();
    setBackups(backupData);
    if (backupData.length > 0) {
      setLastBackup(new Date(backupData[0].timestamp).toLocaleString());
      setBackupSize(backupData[0].size);
      setBackupDuration(backupData[0].duration);
    }
  }, []);

  const handleRunBackup = async () => {
    setIsRunning(true);
    onAddLog?.('Manual backup initiated', 'medium');
    await new Promise(resolve => setTimeout(resolve, 2000));
    const newBackup: BackupEntry = {
      id: `backup-${Date.now()}`,
      timestamp: new Date().toISOString(),
      status: 'success',
      size: `${(Math.random() * 500 + 50).toFixed(1)} MB`,
      duration: `${Math.floor(Math.random() * 300 + 30)}s`,
      type: 'full',
      verified: true
    };
    setBackups(prev => [newBackup, ...prev]);
    setLastBackup(new Date().toLocaleString());
    setBackupSize(newBackup.size);
    setBackupDuration(newBackup.duration);
    setIsRunning(false);
    onAddLog?.('Backup completed successfully', 'low');
  };

  const handleRestore = (backupId: string) => {
    onAddLog?.(`Restore initiated for backup ${backupId}`, 'high');
  };

  const handleTestRestore = (backupId: string) => {
    onAddLog?.(`Restore test initiated for backup ${backupId}`, 'medium');
  };

  const successCount = backups.filter(b => b.status === 'success').length;
  const failedCount = backups.filter(b => b.status === 'failed').length;
  const verifiedCount = backups.filter(b => b.verified).length;

  return (
    <div className="space-y-6" id="backup-status-tab">
      <div className="bg-[#121212] rounded-2xl p-6 border border-zinc-800/80 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-zinc-100 uppercase tracking-tight">Backup Status</h2>
              <p className="text-xs text-zinc-400 font-semibold">Backup history, status, and restore management</p>
            </div>
          </div>
          <button
            onClick={handleRunBackup}
            disabled={isRunning}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
          >
            {isRunning ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Running Backup...
              </>
            ) : (
              <>
                <HardDrive className="w-4 h-4" />
                Run Backup Now
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-[#18181b] rounded-xl p-4 border border-zinc-800/60">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-zinc-500" />
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Last Backup</span>
            </div>
            <span className="text-sm font-black text-zinc-100">{lastBackup}</span>
          </div>
          <div className="bg-[#18181b] rounded-xl p-4 border border-zinc-800/60">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-zinc-500" />
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Next Scheduled</span>
            </div>
            <span className="text-sm font-black text-zinc-100">{nextBackup}</span>
          </div>
          <div className="bg-[#18181b] rounded-xl p-4 border border-zinc-800/60">
            <div className="flex items-center gap-2 mb-2">
              <FileArchive className="w-4 h-4 text-zinc-500" />
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Backup Size</span>
            </div>
            <span className="text-sm font-black text-zinc-100">{backupSize}</span>
          </div>
          <div className="bg-[#18181b] rounded-xl p-4 border border-zinc-800/60">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-zinc-500" />
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Duration</span>
            </div>
            <span className="text-sm font-black text-zinc-100">{backupDuration}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-[#18181b] rounded-xl p-4 border border-zinc-800/60">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Successful</span>
            </div>
            <span className="text-2xl font-black text-emerald-400">{successCount}</span>
          </div>
          <div className="bg-[#18181b] rounded-xl p-4 border border-zinc-800/60">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="w-4 h-4 text-red-400" />
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Failed</span>
            </div>
            <span className="text-2xl font-black text-red-400">{failedCount}</span>
          </div>
          <div className="bg-[#18181b] rounded-xl p-4 border border-zinc-800/60">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-indigo-400" />
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Verified</span>
            </div>
            <span className="text-2xl font-black text-indigo-400">{verifiedCount}</span>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-sm font-bold text-zinc-300 mb-3">Backup History</h3>
          <div className="bg-[#18181b] rounded-xl border border-zinc-800/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Timestamp</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Type</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Size</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Duration</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Verified</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {backups.map((backup) => (
                    <tr key={backup.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="px-4 py-3 text-xs text-zinc-400 font-mono whitespace-nowrap">
                        {new Date(backup.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-bold text-zinc-300 capitalize">{backup.type}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {backup.status === 'success' ? (
                            <CheckCircle className="w-4 h-4 text-emerald-400" />
                          ) : backup.status === 'failed' ? (
                            <XCircle className="w-4 h-4 text-red-400" />
                          ) : (
                            <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />
                          )}
                          <span className={`text-xs font-bold capitalize ${
                            backup.status === 'success' ? 'text-emerald-400' : 
                            backup.status === 'failed' ? 'text-red-400' : 'text-amber-400'
                          }`}>
                            {backup.status.replace('_', ' ')}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-300">{backup.size}</td>
                      <td className="px-4 py-3 text-xs text-zinc-300">{backup.duration}</td>
                      <td className="px-4 py-3">
                        {backup.verified ? (
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-400" />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleTestRestore(backup.id)}
                            className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-bold transition-all"
                          >
                            Test
                          </button>
                          <button
                            onClick={() => handleRestore(backup.id)}
                            disabled={backup.status !== 'success'}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 text-white rounded-lg text-[10px] font-bold transition-all"
                          >
                            Restore
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="bg-[#18181b] rounded-xl p-4 border border-zinc-800/60">
          <h3 className="text-sm font-bold text-zinc-300 mb-3">Restore Testing Results</h3>
          <div className="space-y-2">
            {backups.filter(b => b.verified).slice(0, 5).map(backup => (
              <div key={backup.id} className="flex items-center justify-between p-3 bg-[#121212] rounded-lg border border-zinc-800/40">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <div>
                    <span className="text-xs font-bold text-zinc-300">{backup.type.toUpperCase()} Backup</span>
                    <span className="text-[10px] text-zinc-500 block">{new Date(backup.timestamp).toLocaleDateString()}</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-emerald-400">Passed</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
