'use client';

import { type CheckInResponse } from '@/lib/gasApi';
import styles from './CheckInStatus.module.css';

interface CheckInStatusProps {
    result: CheckInResponse | null;
    onDismiss: () => void;
}

export default function CheckInStatus({ result, onDismiss }: CheckInStatusProps) {
    if (!result) return null;

    const getStatusClass = () => {
        if (result.status === 'SUCCESS') return styles.success;
        if (result.status === 'WARNING') return styles.warning;
        return styles.error;
    };

    const getIcon = () => {
        if (result.status === 'SUCCESS') return '✓';
        if (result.status === 'WARNING') return '⚠';
        return '✕';
    };

    return (
        <div className={`${styles.overlay} fade-in`} onClick={onDismiss}>
            <div className={`${styles.modal} ${getStatusClass()} bounce`}>
                <div className={styles.icon}>{getIcon()}</div>

                <h2 className={styles.message}>{result.message}</h2>

                {result.name && (
                    <div className={styles.details}>
                        <div className={styles.detailRow}>
                            <span className={styles.label}>氏名 / Name:</span>
                            <span className={styles.value}>{result.name}</span>
                        </div>

                        {result.id && (
                            <div className={styles.detailRow}>
                                <span className={styles.label}>会員ID / ID:</span>
                                <span className={styles.value}>{result.id}</span>
                            </div>
                        )}

                        {result.ticketType && (
                            <div className={styles.detailRow}>
                                <span className={styles.label}>券種 / Ticket:</span>
                                <span className={styles.value}>{result.ticketType}</span>
                            </div>
                        )}

                        {result.startTime && (
                            <div className={styles.detailRow}>
                                <span className={styles.label}>受付時間 / Reception:</span>
                                <span className={styles.value}>{result.startTime}</span>
                            </div>
                        )}

                        {result.checkInTime && (
                            <div className={styles.detailRow}>
                                <span className={styles.label}>入場時刻 / Time:</span>
                                <span className={styles.value}>{result.checkInTime}</span>
                            </div>
                        )}
                    </div>
                )}

                <button
                    className={styles.dismissButton}
                    onClick={onDismiss}
                >
                    閉じる / Close
                </button>
            </div>
        </div>
    );
}
