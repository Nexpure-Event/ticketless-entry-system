'use client';

import { type CheckInResponse } from '@/lib/gasApi';

interface CheckInStatusProps {
    result: CheckInResponse | null;
    onDismiss: () => void;
}

export default function CheckInStatus({ result, onDismiss }: CheckInStatusProps) {
    if (!result) return null;

    const getStatusStyles = () => {
        if (result.status === 'SUCCESS') {
            return {
                bg: 'bg-green-900/20',
                border: 'border-green-800',
                text: 'text-green-400',
                iconBg: 'bg-green-900/50',
                iconText: 'text-green-400',
                button: 'bg-green-600 hover:bg-green-700 text-white'
            };
        }
        if (result.status === 'WARNING') {
            return {
                bg: 'bg-yellow-900/20',
                border: 'border-yellow-800',
                text: 'text-yellow-400',
                iconBg: 'bg-yellow-900/50',
                iconText: 'text-yellow-400',
                button: 'bg-yellow-600 hover:bg-yellow-700 text-white'
            };
        }
        return {
            bg: 'bg-red-900/20',
            border: 'border-red-800',
            text: 'text-red-400',
            iconBg: 'bg-red-900/50',
            iconText: 'text-red-400',
            button: 'bg-red-600 hover:bg-red-700 text-white'
        };
    };

    const getIcon = () => {
        if (result.status === 'SUCCESS') return (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
            </svg>
        );
        if (result.status === 'WARNING') return (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
        );
        return (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
            </svg>
        );
    };

    const styles = getStatusStyles();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={onDismiss}>
            <div
                className={`w-full max-w-sm transform overflow-hidden rounded-2xl bg-slate-800 p-6 shadow-2xl transition-all animate-in zoom-in-95 duration-200 border-2 ${styles.border}`}
                onClick={e => e.stopPropagation()}
            >
                <div className="flex flex-col items-center text-center">
                    <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${styles.iconBg} ${styles.iconText} mb-4`}>
                        {getIcon()}
                    </div>

                    <h3 className={`text-xl font-bold ${styles.text} mb-6`}>
                        {result.message}
                    </h3>

                    {result.name && (
                        <div className="w-full space-y-3 mb-6 bg-slate-900/50 rounded-xl p-4 text-left border border-slate-700">
                            <div className="flex justify-between items-center border-b border-slate-700 pb-2">
                                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">氏名 / Name</span>
                                <span className="text-sm font-bold text-white">{result.name}</span>
                            </div>

                            {result.id && (
                                <div className="flex justify-between items-center border-b border-slate-700 pb-2">
                                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">会員ID / ID</span>
                                    <span className="text-sm font-mono font-bold text-slate-300">{result.id}</span>
                                </div>
                            )}

                            {result.ticketType && (
                                <div className="flex justify-between items-center border-b border-slate-700 pb-2">
                                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">券種 / Ticket</span>
                                    <span className="text-sm font-bold text-blue-400">{result.ticketType}</span>
                                </div>
                            )}

                            {result.startTime && (
                                <div className="flex justify-between items-center border-b border-slate-700 pb-2">
                                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">受付 / Time</span>
                                    <span className="text-sm font-bold text-slate-300">{result.startTime}</span>
                                </div>
                            )}

                            {result.checkInTime && (
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">入場 / Entry</span>
                                    <span className="text-sm font-mono text-slate-300">{result.checkInTime.split(' ')[1]}</span>
                                </div>
                            )}
                        </div>
                    )}

                    <button
                        type="button"
                        className={`w-full inline-flex justify-center rounded-lg px-4 py-3 text-sm font-semibold shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 transition-colors ${styles.button}`}
                        onClick={onDismiss}
                    >
                        閉じる / Close
                    </button>
                </div>
            </div>
        </div>
    );
}
