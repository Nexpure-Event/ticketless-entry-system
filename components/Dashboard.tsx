'use client';

import { useEffect, useState } from 'react';
import { getDashboard, type DashboardData } from '@/lib/gasApi';
import styles from './Dashboard.module.css';

export default function Dashboard() {
    const [data, setData] = useState<DashboardData>({
        total: 0,
        checkedIn: 0,
        notCheckedIn: 0
    });
    const [loading, setLoading] = useState(true);

    const fetchData = async (isBackground = false) => {
        try {
            if (!isBackground) {
                setLoading(true);
            }
            const result = await getDashboard();
            setData(result);
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
        } finally {
            if (!isBackground) {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        fetchData();

        // Auto-refresh every 5 seconds
        const interval = setInterval(() => fetchData(true), 5000);

        return () => clearInterval(interval);
    }, []);

    // Demo data for preview (Simplified to avoid hardcoded types appearing when not needed)
    const demoData: DashboardData = {
        total: 100,
        checkedIn: 60,
        notCheckedIn: 40,
        breakdown: {
            'Example Ticket': { total: 100, checkedIn: 60 }
        }
    };

    // Use demo data if loading fails or for preview
    const displayData = (data.total === 0 && !loading) ? demoData : data;
    const percentage = displayData.total > 0
        ? Math.round((displayData.checkedIn / displayData.total) * 100)
        : 0;

    return (
        <div className="w-full bg-slate-800 rounded-2xl shadow-lg overflow-hidden border border-slate-700 transition-all hover:shadow-blue-900/20 duration-300">
            <div className="px-6 py-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-bold text-white">リアルタイム集計</h2>
                    <p className="text-xs text-slate-400">Live Dashboard</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                    <span className="text-xs font-mono text-slate-400">Updating</span>
                </div>
            </div>

            <div className="p-6">
                <div className="grid grid-cols-3 gap-4 text-center mb-8">
                    <div className="p-4 rounded-xl bg-slate-700/50 border border-slate-600">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total</p>
                        <p className="text-3xl font-black text-white">{displayData.total}</p>
                        <p className="text-[10px] text-slate-400">総参加者</p>
                    </div>
                    <div className="p-4 rounded-xl bg-green-900/20 border border-green-900/50">
                        <p className="text-xs font-bold text-green-400 uppercase tracking-wider mb-1">In</p>
                        <p className="text-3xl font-black text-green-400">{displayData.checkedIn}</p>
                        <p className="text-[10px] text-green-400/70">入場済</p>
                    </div>
                    <div className="p-4 rounded-xl bg-orange-900/20 border border-orange-900/50">
                        <p className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-1">Wait</p>
                        <p className="text-3xl font-black text-orange-400">{displayData.notCheckedIn}</p>
                        <p className="text-[10px] text-orange-400/70">未入場</p>
                    </div>
                </div>

                <div className="mb-8">
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-sm font-bold text-slate-300">入場率 / Progress</span>
                        <span className="text-2xl font-black text-blue-400">{percentage}%</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden shadow-inner">
                        <div
                            className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                            style={{ width: `${percentage}%` }}
                        ></div>
                    </div>
                </div>

                {/* Breakdown by Ticket Type */}
                {displayData.breakdown && Object.keys(displayData.breakdown).length > 0 && (
                    <div>
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 pl-1">Ticket Breakdown</h3>
                        <div className="space-y-3">
                            {Object.entries(displayData.breakdown).map(([type, stats]) => {
                                const typePercentage = stats.total > 0 ? Math.round((stats.checkedIn / stats.total) * 100) : 0;

                                // Color mapping for ticket types (Dark Mode)
                                let colorClass = "bg-slate-700/50 text-slate-300 border-slate-600";
                                let barColor = "bg-slate-500";
                                let icon = "🎫";

                                if (type.includes('VIP')) {
                                    colorClass = "bg-yellow-900/20 text-yellow-400 border-yellow-900/50";
                                    barColor = "bg-yellow-500";
                                    icon = "👑";
                                } else if (type.includes('Priority')) {
                                    colorClass = "bg-purple-900/20 text-purple-400 border-purple-900/50";
                                    barColor = "bg-purple-500";
                                    icon = "✨";
                                } else if (type.includes('Standard')) {
                                    colorClass = "bg-blue-900/20 text-blue-400 border-blue-900/50";
                                    barColor = "bg-blue-500";
                                    icon = "🎫";
                                } else if (type.includes('Conference')) {
                                    colorClass = "bg-indigo-900/20 text-indigo-400 border-indigo-900/50";
                                    barColor = "bg-indigo-500";
                                    icon = "👔";
                                } else if (type.includes('Guest')) {
                                    colorClass = "bg-green-900/20 text-green-400 border-green-900/50";
                                    barColor = "bg-green-500";
                                    icon = "👥";
                                } else if (type.includes('Free')) {
                                    colorClass = "bg-red-900/20 text-red-400 border-red-900/50";
                                    barColor = "bg-red-500";
                                    icon = "🎁";
                                }

                                return (
                                    <div key={type} className={`p-3 rounded-xl border ${colorClass} text-xs transition-all hover:scale-[1.02]`}>
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="font-bold flex items-center gap-2">
                                                <span className="text-base">{icon}</span> {type}
                                            </span>
                                            <span className="font-mono bg-slate-800/50 px-2 py-0.5 rounded-md">
                                                <span className="font-bold text-sm">{stats.checkedIn}</span>
                                                <span className="text-slate-500 mx-1">/</span>
                                                <span className="text-slate-400">{stats.total}</span>
                                            </span>
                                        </div>
                                        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                            <div
                                                className={`h-1.5 rounded-full ${barColor} transition-all duration-500`}
                                                style={{ width: `${typePercentage}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
