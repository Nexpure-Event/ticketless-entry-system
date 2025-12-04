'use client';

import { useState } from 'react';
import { manualCheckIn } from '@/lib/gasApi';

interface ManualCheckInProps {
    onCheckIn: (result: any) => void;
}

export default function ManualCheckIn({ onCheckIn }: ManualCheckInProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [memberId, setMemberId] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!memberId.trim()) return;

        setLoading(true);
        try {
            const result = await manualCheckIn(memberId);
            onCheckIn(result);
            setMemberId('');
            setIsOpen(false);
        } catch (error) {
            console.error('Manual check-in error:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) {
        return (
            <button
                className="w-full mt-4 py-3 px-4 bg-slate-800 border border-slate-700 text-slate-300 font-semibold rounded-xl hover:bg-slate-700 hover:border-slate-600 transition-all duration-200 shadow-sm text-sm"
                onClick={() => setIsOpen(true)}
            >
                手動チェックイン / Manual Check-in
            </button>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-sm bg-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-700">
                <div className="p-6">
                    <h3 className="text-xl font-bold text-white mb-6 text-center">手動チェックイン</h3>

                    <form onSubmit={handleSubmit}>
                        <div className="mb-6">
                            <label htmlFor="memberId" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                会員ID / Member ID
                            </label>
                            <input
                                id="memberId"
                                type="text"
                                value={memberId}
                                onChange={(e) => setMemberId(e.target.value)}
                                placeholder="例: M001"
                                className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-slate-900 transition-all text-lg text-white placeholder-slate-600"
                                autoFocus
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                type="button"
                                className="flex-1 py-3 px-4 bg-slate-700 text-slate-300 font-semibold rounded-xl hover:bg-slate-600 transition-colors"
                                onClick={() => setIsOpen(false)}
                                disabled={loading}
                            >
                                キャンセル
                            </button>
                            <button
                                type="submit"
                                className="flex-1 py-3 px-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-900/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={loading || !memberId.trim()}
                            >
                                {loading ? '処理中...' : 'チェックイン'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
