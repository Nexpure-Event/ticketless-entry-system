/**
 * API client for GAS backend
 */

const GAS_WEB_APP_URL = process.env.NEXT_PUBLIC_GAS_URL || '';

export interface CheckInResponse {
    success: boolean;
    status?: 'SUCCESS' | 'WARNING' | 'ERROR';
    message: string;
    name?: string;
    id?: string;
    checkInTime?: string;
    ticketType?: string;
    startTime?: string;
}

export interface DashboardData {
    total: number;
    checkedIn: number;
    notCheckedIn: number;
}

/**
 * Check in a user by token
 */
export async function checkIn(token: string): Promise<CheckInResponse> {
    try {
        const response = await fetch(
            `${GAS_WEB_APP_URL}?action=checkIn&token=${encodeURIComponent(token)}`
        );

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        return await response.json();
    } catch (error) {
        return {
            success: false,
            status: 'ERROR',
            message: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    }
}

/**
 * Manual check-in by member ID
 */
export async function manualCheckIn(memberId: string): Promise<CheckInResponse> {
    try {
        const response = await fetch(
            `${GAS_WEB_APP_URL}?action=manualCheckIn&memberId=${encodeURIComponent(memberId)}`
        );

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        return await response.json();
    } catch (error) {
        return {
            success: false,
            status: 'ERROR',
            message: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    }
}

/**
 * Get dashboard statistics
 */
export async function getDashboard(): Promise<DashboardData> {
    try {
        const response = await fetch(`${GAS_WEB_APP_URL}?action=dashboard`);

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        return {
            total: 0,
            checkedIn: 0,
            notCheckedIn: 0
        };
    }
}
