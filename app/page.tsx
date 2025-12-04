'use client';

import { useState, useCallback } from 'react';
import Dashboard from '@/components/Dashboard';
import QRScanner from '@/components/QRScanner';
import CheckInStatus from '@/components/CheckInStatus';
import ManualCheckIn from '@/components/ManualCheckIn';
import { checkIn, type CheckInResponse } from '@/lib/gasApi';

export default function Home() {
  const [checkInResult, setCheckInResult] = useState<CheckInResponse | null>(null);
  const [isScanning, setIsScanning] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleScan = useCallback(async (token: string) => {
    if (isProcessing) return;

    setIsProcessing(true);
    setIsScanning(false);

    // Play beep sound
    const audio = new Audio('/beep.mp3'); // Optional: Add a beep sound file to public/
    audio.play().catch(() => { });

    try {
      const result = await checkIn(token);
      setCheckInResult(result);
    } catch (error) {
      setCheckInResult({
        success: false,
        status: 'ERROR',
        message: 'システムエラーが発生しました / System Error'
      });
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing]);

  const handleManualCheckIn = (result: CheckInResponse) => {
    setCheckInResult(result);
    setIsScanning(false);
  };

  const handleDismiss = () => {
    setCheckInResult(null);
    setIsScanning(true);
  };

  return (
    <main className="min-h-screen p-4 md:p-8 max-w-2xl mx-auto text-slate-100">
      <header className="mb-8 text-center pt-8">
        <div className="inline-block mb-2 px-3 py-1 bg-blue-900/30 text-black border border-blue-800 rounded-full text-xs font-bold tracking-wider uppercase">
          Member Check-in
        </div>
        <h1 className="text-3xl md:text-4xl font-black mb-2 text-black">
          Ticketless Entry
        </h1>
        <p className="text-slate-400 text-sm">QRコードをスキャンしてチェックイン</p>
      </header>

      <div className="space-y-6">
        <Dashboard />

        <div className="bg-slate-800 rounded-2xl shadow-xl overflow-hidden border border-slate-700">
          <div className="p-1 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 opacity-80"></div>
          <div className="p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-xl"></span> QRコードスキャン
            </h2>
            <div className="rounded-xl overflow-hidden shadow-inner bg-black border border-slate-700">
              <QRScanner onScan={handleScan} isScanning={isScanning} />
            </div>
            <ManualCheckIn onCheckIn={handleManualCheckIn} />
          </div>
        </div>
      </div>

      <CheckInStatus
        result={checkInResult}
        onDismiss={handleDismiss}
      />

      <footer className="mt-12 pb-8 text-center text-xs text-slate-500">
        <p>&copy; 2025 Ticketless Entry System</p>
        <p>Produced by:株式会社3o3</p>
        <p className="mt-1">Technology Stack: Next.js & Google Apps Script.</p>
      </footer>
    </main>
  );
}
