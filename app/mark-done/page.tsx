"use client"

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    CheckCircle2,
    Clock,
    RefreshCw,
    Loader,
    AlertTriangle,
    Calendar,
    Package,
    ArrowRight,
    UserCog,
    Eye,
    X,
    CheckCircle,
    Settings,
    User,
    Building2,
    Tag,
    Layers,
    Hash,
    FileText,
    FlaskConical,
    History,
    BadgeCheck,
    Factory
} from 'lucide-react';

// ==================== CONSTANTS ====================
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzVnLwTlFuGrlzyPSa2VWy4h9sU2EQrsuKrPLvQvhZoaoJu8GilGDc5aQTgLliUD7ss/exec";

// ==================== TYPE DEFINITIONS ====================
interface SemiActualRecord {
    timestamp: string;
    semiFinishedJobCardNo: string;
    supervisorName: string;
    dateOfProduction: string;
    productName: string;
    qtyOfSemiFinishedGood: number;
    rawMaterial1Name: string;
    rawMaterial1Qty: number;
    rawMaterial2Name: string;
    rawMaterial2Qty: number;
    rawMaterial3Name: string;
    rawMaterial3Qty: number;
    isAnyEndProduct: string;
    endProductRawMaterialName: string;
    endProductQty: number;
    narration: string;
    serialNo: string;
    startingReading: number;
    startingReadingPhoto: string;
    endingReading: number;
    endingReadingPhoto: string;
    machineRunningHour: number;
    rawMaterial4Name: string;
    rawMaterial4Qty: number;
    rawMaterial5Name: string;
    rawMaterial5Qty: number;
    machineRunning: number;
    semiFinishedProductionNo: string;

    // Planning fields
    planned1?: string;
    actual1?: string;
    planned2?: string;
    actual2?: string;

    // Row tracking
    rowIndex?: number;
    actual1ColumnIndex?: number;
    actual2ColumnIndex?: number;
}

// ==================== UTILITY FUNCTIONS ====================
const formatDate = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
};

const formatDisplayDate = (dateString: string): string => {
    if (!dateString || dateString === 'null' || dateString === 'undefined' || dateString === '-') return '-';

    try {
        // If already in DD/MM/YY format
        if (dateString.match(/^\d{2}\/\d{2}\/\d{2}$/)) {
            return dateString;
        }

        // If already in DD/MM/YYYY format
        if (dateString.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
            return dateString;
        }

        // Handle ISO date strings
        if (dateString.includes('T') && dateString.includes('Z')) {
            const date = new Date(dateString);
            if (!isNaN(date.getTime())) {
                const day = date.getDate().toString().padStart(2, '0');
                const month = (date.getMonth() + 1).toString().padStart(2, '0');
                const year = date.getFullYear().toString().slice(-2);
                return `${day}/${month}/${year}`;
            }
        }

        // Handle format like "2/18/2026, 4:17:51 PM"
        const dateMatch = dateString.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (dateMatch) {
            const [_, month, day, year] = dateMatch;
            return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year.slice(-2)}`;
        }

        return dateString;
    } catch {
        return dateString;
    }
};

// ==================== API FUNCTIONS ====================
const fetchSheetData = async (sheetName: string): Promise<string[][]> => {
    try {
        const response = await fetch(`${APPS_SCRIPT_URL}?sheet=${encodeURIComponent(sheetName)}`, {
            method: 'GET',
            mode: 'cors',
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Failed to fetch data');
        }

        return result.data || [];
    } catch (error) {
        console.error(`Error fetching sheet ${sheetName}:`, error);
        throw error;
    }
};

const fetchStep4Data = async (): Promise<SemiActualRecord[]> => {
    try {
        const data = await fetchSheetData('Semi Actual');

        if (data.length <= 4) return [];

        // Skip header rows (first 4 rows)
        const dataRows = data.slice(4);

        const records: SemiActualRecord[] = [];

        dataRows.forEach((row, index) => {
            if (!row || row.length < 2) return;

            const serialNo = row[16] || ''; // Column Q

            if (!serialNo) return;

            // Parse raw material fields
            const rawMaterial1Name = row[6] || '';
            const rawMaterial1Qty = parseFloat(row[7]) || 0;
            const rawMaterial2Name = row[8] || '';
            const rawMaterial2Qty = parseFloat(row[9]) || 0;
            const rawMaterial3Name = row[10] || '';
            const rawMaterial3Qty = parseFloat(row[11]) || 0;
            const rawMaterial4Name = row[22] || '';
            const rawMaterial4Qty = parseFloat(row[23]) || 0;
            const rawMaterial5Name = row[24] || '';
            const rawMaterial5Qty = parseFloat(row[25]) || 0;

            // Parse planning dates (columns 57-76)
            const planned1 = row[57] || '';
            const actual1 = row[58] || '';
            const planned2 = row[62] || '';
            const actual2 = row[63] || '';

            records.push({
                timestamp: row[0] || '',
                semiFinishedJobCardNo: row[1] || '',
                supervisorName: row[2] || '',
                dateOfProduction: row[3] || '',
                productName: row[4] || '',
                qtyOfSemiFinishedGood: parseFloat(row[5]) || 0,
                rawMaterial1Name,
                rawMaterial1Qty,
                rawMaterial2Name,
                rawMaterial2Qty,
                rawMaterial3Name,
                rawMaterial3Qty,
                isAnyEndProduct: row[12] || 'No',
                endProductRawMaterialName: row[13] || '',
                endProductQty: parseFloat(row[14]) || 0,
                narration: row[15] || '',
                serialNo,
                startingReading: parseFloat(row[17]) || 0,
                startingReadingPhoto: row[18] || '',
                endingReading: parseFloat(row[19]) || 0,
                endingReadingPhoto: row[20] || '',
                machineRunningHour: parseFloat(row[21]) || 0,
                rawMaterial4Name,
                rawMaterial4Qty,
                rawMaterial5Name,
                rawMaterial5Qty,
                machineRunning: parseFloat(row[26]) || 0,
                semiFinishedProductionNo: row[27] || '',
                planned1,
                actual1,
                planned2,
                actual2,
                rowIndex: index + 5, // +5 because we skipped 4 header rows + 0-based index
                actual1ColumnIndex: 59, // Column BH (Actual1) - adjust based on your sheet
                actual2ColumnIndex: 64, // Column BL (Actual2) - adjust based on your sheet
            });
        });

        return records;
    } catch (error) {
        console.error('Error fetching step4 data:', error);
        return [];
    }
};

const updateStep4ActualDate = async (rowIndex: number, columnIndex: number, value: string): Promise<boolean> => {
    try {
        const formData = new FormData();
        formData.append('action', 'updateCells');
        formData.append('sheetName', 'Semi Actual');
        formData.append('rowIndex', String(rowIndex));

        const cellUpdates = {
            [String(columnIndex)]: value
        };

        formData.append('cellUpdates', JSON.stringify(cellUpdates));

        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'cors',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        return result.success === true;
    } catch (error) {
        console.error('Error updating actual date:', error);
        return false;
    }
};

const updateStep4Actual2Date = async (rowIndex: number, columnIndex: number, value: string): Promise<boolean> => {
    // Same as updateStep4ActualDate, just a wrapper for clarity
    return updateStep4ActualDate(rowIndex, columnIndex, value);
};

// ==================== UI COMPONENTS ====================
const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-white rounded-3xl shadow-sm border border-slate-100 ${className}`}>
        {children}
    </div>
);

const CardHeader = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <div className={`px-6 py-5 border-b border-slate-50 ${className}`}>{children}</div>
);

const CardTitle = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <h3 className={`text-lg font-black text-slate-800 ${className}`}>{children}</h3>
);

const CardDescription = ({ children }: { children: React.ReactNode }) => (
    <p className="text-xs text-slate-400 font-medium mt-1">{children}</p>
);

const CardContent = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <div className={`p-6 ${className}`}>{children}</div>
);

const Badge = ({ children, variant = 'default', className = '' }: {
    children: React.ReactNode;
    variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'purple' | 'blue' | 'green';
    className?: string;
}) => {
    const variants = {
        default: 'bg-[#84a93c] text-white',
        secondary: 'bg-slate-100 text-slate-600',
        destructive: 'bg-red-500 text-white',
        outline: 'border border-slate-200 text-slate-600',
        success: 'bg-emerald-50 text-emerald-600',
        warning: 'bg-amber-50 text-amber-600',
        purple: 'bg-purple-50 text-purple-600',
        blue: 'bg-blue-50 text-blue-600',
        green: 'bg-green-50 text-green-600'
    };
    return (
        <span className={`inline-flex items-center px-2 py-1 text-xs font-bold rounded-full ${variants[variant]} ${className}`}>
            {children}
        </span>
    );
};

const Button = ({
    children,
    onClick,
    variant = 'primary',
    size = 'md',
    disabled = false,
    className = '',
    type = 'button'
}: {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: 'primary' | 'secondary' | 'outline' | 'destructive' | 'success' | 'purple' | 'blue';
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    className?: string;
    type?: 'button' | 'submit' | 'reset';
}) => {
    const variants = {
        primary: 'bg-[#84a93c] text-white hover:bg-emerald-600',
        secondary: 'bg-slate-100 text-slate-600 hover:bg-slate-200',
        outline: 'border border-slate-200 text-slate-600 hover:bg-slate-50',
        destructive: 'bg-red-500 text-white hover:bg-red-600',
        success: 'bg-emerald-500 text-white hover:bg-emerald-600',
        purple: 'bg-purple-500 text-white hover:bg-purple-600',
        blue: 'bg-blue-500 text-white hover:bg-blue-600'
    };

    const sizes = {
        sm: 'px-3 py-1.5 text-xs',
        md: 'px-4 py-2 text-sm',
        lg: 'px-6 py-3 text-base'
    };

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={`inline-flex items-center justify-center font-bold rounded-xl transition-all ${variants[variant]} ${sizes[size]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
        >
            {children}
        </button>
    );
};

// ==================== DETAIL COMPONENTS ====================
const DetailField = ({ icon: Icon, label, value }: { icon?: any; label: string; value: any }) => {
    const displayValue = value !== undefined && value !== null && value !== '' && value !== '-' ? String(value) : '—';
    return (
        <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                {Icon && <Icon className="h-3 w-3" />}
                {label}
            </span>
            <span className="text-sm font-medium text-slate-700">{displayValue}</span>
        </div>
    );
};

const SectionHeader = ({ title, color = 'slate' }: { title: string; color?: string }) => {
    const colors: Record<string, string> = {
        slate: 'bg-slate-50 text-slate-700 border-slate-200',
        blue: 'bg-blue-50 text-blue-700 border-blue-200',
        purple: 'bg-purple-50 text-purple-700 border-purple-200',
        green: 'bg-green-50 text-green-700 border-green-200',
        amber: 'bg-amber-50 text-amber-700 border-amber-200',
        emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    };
    return (
        <div className={`px-3 py-1.5 rounded-md border text-xs font-bold uppercase tracking-wider ${colors[color] || colors.slate}`}>
            {title}
        </div>
    );
};

const PhotoLink = ({ label, url }: { label: string; url?: string | null }) => (
    url && url.trim() !== '' ? (
        <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}:</span>
            <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#84a93c] hover:underline text-xs font-medium inline-flex items-center"
            >
                <Eye size={12} className="mr-1" />
                View Photo
            </a>
        </div>
    ) : null
);

// ==================== MAIN COMPONENT ====================
interface Props {
    state?: any;
    onUpdate?: (updater: (prev: any) => any) => void;
}

type TabType = 'pending' | 'production' | 'history';

const Step4List: React.FC<Props> = ({ state, onUpdate }) => {
    const [activeTab, setActiveTab] = useState<TabType>('pending');
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [semiActualData, setSemiActualData] = useState<SemiActualRecord[]>([]);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [selectedRecord, setSelectedRecord] = useState<SemiActualRecord | null>(null);
    const [showPopup, setShowPopup] = useState(false);
    const [showMarkDonePopup, setShowMarkDonePopup] = useState(false);
    const [markDoneRemarks, setMarkDoneRemarks] = useState('');
    const [markDoneErrors, setMarkDoneErrors] = useState<Record<string, string>>({});

    // Column visibility
    const [showPendingColumns, setShowPendingColumns] = useState(false);
    const [showProductionColumns, setShowProductionColumns] = useState(false);
    const [showHistoryColumns, setShowHistoryColumns] = useState(false);

    const [visiblePendingColumns, setVisiblePendingColumns] = useState<Record<string, boolean>>({
        action: true,
        jobCardNo: true,
        productName: true,
        qty: true,
        plannedDate: true,
        supervisor: true,
        status: true
    });

    const [visibleProductionColumns, setVisibleProductionColumns] = useState<Record<string, boolean>>({
        action: true,
        jobCardNo: true,
        productName: true,
        qty: true,
        plannedDate: true,
        supervisor: true,
        status: true
    });

    const [visibleHistoryColumns, setVisibleHistoryColumns] = useState<Record<string, boolean>>({
        jobCardNo: true,
        productName: true,
        qty: true,
        stage1: true,
        stage2: true,
        supervisor: true,
        status: true
    });

    // Column metadata
    const PENDING_COLUMNS_META = [
        { header: "Actions", dataKey: "action", alwaysVisible: true },
        { header: "Job Card No.", dataKey: "jobCardNo", alwaysVisible: true },
        { header: "Product Name", dataKey: "productName" },
        { header: "Quantity", dataKey: "qty" },
        { header: "Planned Date", dataKey: "plannedDate" },
        { header: "Supervisor", dataKey: "supervisor" },
        { header: "Status", dataKey: "status" },
    ];

    const PRODUCTION_COLUMNS_META = [
        { header: "Actions", dataKey: "action", alwaysVisible: true },
        { header: "Job Card No.", dataKey: "jobCardNo", alwaysVisible: true },
        { header: "Product Name", dataKey: "productName" },
        { header: "Quantity", dataKey: "qty" },
        { header: "Planned Date", dataKey: "plannedDate" },
        { header: "Supervisor", dataKey: "supervisor" },
        { header: "Status", dataKey: "status" },
    ];

    const HISTORY_COLUMNS_META = [
        { header: "Job Card No.", dataKey: "jobCardNo", alwaysVisible: true },
        { header: "Product", dataKey: "productName", alwaysVisible: true },
        { header: "Qty", dataKey: "qty" },
        { header: "Stage 1", dataKey: "stage1" },
        { header: "Stage 2", dataKey: "stage2" },
        { header: "Supervisor", dataKey: "supervisor" },
        { header: "Status", dataKey: "status" },
    ];

    useEffect(() => {
        loadData();
    }, []);

    const showSuccess = (msg: string) => {
        setSuccessMessage(msg);
        setTimeout(() => setSuccessMessage(''), 3000);
    };

    const loadData = async () => {
        setIsLoading(true);
        setError('');
        try {
            const data = await fetchStep4Data();
            setSemiActualData(data);
        } catch (err) {
            setError('Failed to load data. Please check your connection and try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleMarkDone = (record: SemiActualRecord) => {
        setSelectedRecord(record);
        setMarkDoneRemarks('');
        setMarkDoneErrors({});
        setShowMarkDonePopup(true);
    };

    const handleMarkDoneSubmit = async () => {
        if (!selectedRecord || !selectedRecord.rowIndex) {
            setError('Unable to identify the record row. Please refresh and try again.');
            return;
        }

        if (!markDoneRemarks.trim()) {
            setMarkDoneErrors({ remarks: 'Remarks are required' });
            return;
        }

        setIsSubmitting(true);
        setError('');
        const timestamp = formatDate(new Date());

        try {
            let success = false;

            if (activeTab === 'pending') {
                if (!selectedRecord.actual1ColumnIndex) {
                    setError('Unable to identify the column for Stage 1 update.');
                    setIsSubmitting(false);
                    return;
                }
                success = await updateStep4ActualDate(selectedRecord.rowIndex, selectedRecord.actual1ColumnIndex, timestamp);
            } else if (activeTab === 'production') {
                if (!selectedRecord.actual2ColumnIndex) {
                    setError('Unable to identify the column for Stage 2 update.');
                    setIsSubmitting(false);
                    return;
                }
                success = await updateStep4Actual2Date(selectedRecord.rowIndex, selectedRecord.actual2ColumnIndex, timestamp);
            }

            if (success) {
                showSuccess('Record marked as done successfully.');
                await loadData();
                setShowMarkDonePopup(false);
                setSelectedRecord(null);
            } else {
                setError('Update failed. Please try again.');
            }
        } catch (err) {
            setError('An error occurred while updating the record. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleViewDetails = (record: SemiActualRecord) => {
        setSelectedRecord(record);
        setShowPopup(true);
    };

    const closePopup = () => {
        setShowPopup(false);
        setSelectedRecord(null);
    };

    const handleToggleColumn = (tab: string, dataKey: string, checked: boolean) => {
        if (tab === 'pending') {
            setVisiblePendingColumns(prev => ({ ...prev, [dataKey]: checked }));
        } else if (tab === 'production') {
            setVisibleProductionColumns(prev => ({ ...prev, [dataKey]: checked }));
        } else {
            setVisibleHistoryColumns(prev => ({ ...prev, [dataKey]: checked }));
        }
    };

    const handleSelectAllColumns = (tab: string, columnsMeta: any[], checked: boolean) => {
        const newVisibility: Record<string, boolean> = {};
        columnsMeta.forEach((col) => {
            if (!col.alwaysVisible) {
                newVisibility[col.dataKey] = checked;
            }
        });

        if (tab === 'pending') {
            setVisiblePendingColumns(prev => ({ ...prev, ...newVisibility }));
        } else if (tab === 'production') {
            setVisibleProductionColumns(prev => ({ ...prev, ...newVisibility }));
        } else {
            setVisibleHistoryColumns(prev => ({ ...prev, ...newVisibility }));
        }
    };

    // Filter data based on tab
    const pendingOrders = semiActualData.filter(item => {
        const planned1 = String(item.planned1 || '').trim();
        const actual1 = String(item.actual1 || '').trim();
        return planned1 !== '' && planned1 !== '-' && (actual1 === '' || actual1 === '-');
    });

    const productionOrders = semiActualData.filter(item => {
        const planned2 = String(item.planned2 || '').trim();
        const actual2 = String(item.actual2 || '').trim();
        const actual1 = String(item.actual1 || '').trim();
        return planned2 !== '' && planned2 !== '-' && (actual2 === '' || actual2 === '-') && actual1 !== '' && actual1 !== '-';
    });

    const historyOrders = semiActualData.filter(item => {
        const actual1 = String(item.actual1 || '').trim();
        const actual2 = String(item.actual2 || '').trim();
        return (actual1 !== '' && actual1 !== '-') || (actual2 !== '' && actual2 !== '-');
    });

    const getCurrentData = (): SemiActualRecord[] => {
        switch (activeTab) {
            case 'pending':
                return pendingOrders;
            case 'production':
                return productionOrders;
            case 'history':
                return historyOrders;
            default:
                return [];
        }
    };

    const getTabCount = (tab: TabType): number => {
        switch (tab) {
            case 'pending':
                return pendingOrders.length;
            case 'production':
                return productionOrders.length;
            case 'history':
                return historyOrders.length;
            default:
                return 0;
        }
    };

    const currentData = getCurrentData();

    const getStatus = (record: SemiActualRecord): { label: string; className: string } => {
        if (activeTab === 'pending') {
            return {
                label: 'Supervisor Pending',
                className: 'bg-amber-50 text-amber-600'
            };
        } else if (activeTab === 'production') {
            return {
                label: 'Production Pending',
                className: 'bg-blue-50 text-blue-600'
            };
        } else {
            const hasActual1 = String(record.actual1 || '').trim() !== '' && String(record.actual1 || '').trim() !== '-';
            const hasActual2 = String(record.actual2 || '').trim() !== '' && String(record.actual2 || '').trim() !== '-';

            if (hasActual1 && hasActual2) {
                return { label: 'Fully Completed', className: 'bg-emerald-50 text-emerald-600' };
            } else if (hasActual1) {
                return { label: 'Stage 1 Completed', className: 'bg-purple-50 text-purple-600' };
            } else if (hasActual2) {
                return { label: 'Stage 2 Completed', className: 'bg-indigo-50 text-indigo-600' };
            }

            return { label: 'Completed', className: 'bg-emerald-50 text-emerald-600' };
        }
    };

    const visiblePendingOrdersColumns = PENDING_COLUMNS_META.filter(
        (col) => visiblePendingColumns[col.dataKey] || col.alwaysVisible
    );

    const visibleProductionOrdersColumns = PRODUCTION_COLUMNS_META.filter(
        (col) => visibleProductionColumns[col.dataKey] || col.alwaysVisible
    );

    const visibleHistoryOrdersColumns = HISTORY_COLUMNS_META.filter(
        (col) => visibleHistoryColumns[col.dataKey] || col.alwaysVisible
    );

    if (isLoading && semiActualData.length === 0) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Loader className="h-12 w-12 animate-spin text-[#84a93c]" />
                <p className="ml-4 text-lg font-medium text-slate-600">Loading Data...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-4 md:p-6 bg-slate-50 min-h-screen">
            <Card className="shadow-lg border-none overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-[#84a93c]/10 to-[#84a93c]/5 border-b border-[#84a93c]/20">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2 text-[#84a93c]">
                                <BadgeCheck className="h-6 w-6" />
                                Production Approval System
                            </CardTitle>
                            <CardDescription>
                                Track and approve production stages from Semi Actual sheet
                            </CardDescription>
                        </div>
                        <Button onClick={loadData} variant="outline" size="sm">
                            <RefreshCw size={14} className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="p-4 sm:p-6">
                    {/* Tabs */}
                    <div className="flex space-x-1 p-1 bg-slate-100 rounded-2xl w-fit mb-6">
                        <button
                            onClick={() => setActiveTab('pending')}
                            className={`flex items-center px-6 py-2.5 rounded-xl font-bold text-xs transition-all ${activeTab === 'pending'
                                ? 'bg-[#84a93c] text-white shadow-lg shadow-emerald-100'
                                : 'text-slate-500 hover:bg-white hover:text-slate-800'
                                }`}
                        >
                            <Clock size={14} className="mr-2" />
                            Supervisor ({pendingOrders.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('production')}
                            className={`flex items-center px-6 py-2.5 rounded-xl font-bold text-xs transition-all ${activeTab === 'production'
                                ? 'bg-[#84a93c] text-white shadow-lg shadow-emerald-100'
                                : 'text-slate-500 hover:bg-white hover:text-slate-800'
                                }`}
                        >
                            <Factory size={14} className="mr-2" />
                            Production ({productionOrders.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`flex items-center px-6 py-2.5 rounded-xl font-bold text-xs transition-all ${activeTab === 'history'
                                ? 'bg-[#84a93c] text-white shadow-lg shadow-emerald-100'
                                : 'text-slate-500 hover:bg-white hover:text-slate-800'
                                }`}
                        >
                            <History size={14} className="mr-2" />
                            History ({historyOrders.length})
                        </button>
                    </div>

                    {/* Pending Tab */}
                    {activeTab === 'pending' && (
                        <Card className="shadow-sm border border-slate-100">
                            <CardHeader className="py-3 px-4 bg-amber-50/50">
                                <div className="flex justify-between items-center">
                                    <CardTitle className="text-md font-bold text-slate-700 flex items-center">
                                        <User className="h-5 w-5 text-amber-600 mr-2" />
                                        Supervisor Pending ({pendingOrders.length})
                                    </CardTitle>

                                    {/* Column Visibility Dropdown */}
                                    <div className="relative">
                                        <Button
                                            onClick={() => setShowPendingColumns(!showPendingColumns)}
                                            variant="outline"
                                            size="sm"
                                        >
                                            <Settings size={14} className="mr-1.5" />
                                            Columns
                                        </Button>

                                        {showPendingColumns && (
                                            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-100 z-50 p-3">
                                                <div className="space-y-2">
                                                    <p className="text-sm font-bold text-slate-700 mb-2">Toggle Columns</p>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <button
                                                            onClick={() => {
                                                                handleSelectAllColumns('pending', PENDING_COLUMNS_META, true);
                                                                setShowPendingColumns(false);
                                                            }}
                                                            className="text-xs text-[#84a93c] hover:underline"
                                                        >
                                                            Select All
                                                        </button>
                                                        <span className="text-slate-300 mx-1">|</span>
                                                        <button
                                                            onClick={() => {
                                                                handleSelectAllColumns('pending', PENDING_COLUMNS_META, false);
                                                                setShowPendingColumns(false);
                                                            }}
                                                            className="text-xs text-[#84a93c] hover:underline"
                                                        >
                                                            Deselect All
                                                        </button>
                                                    </div>
                                                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                                        {PENDING_COLUMNS_META.filter(col => !col.alwaysVisible).map((col) => (
                                                            <label key={col.dataKey} className="flex items-center space-x-2 cursor-pointer">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={!!visiblePendingColumns[col.dataKey]}
                                                                    onChange={(e) => handleToggleColumn('pending', col.dataKey, e.target.checked)}
                                                                    className="rounded border-slate-300 text-[#84a93c] focus:ring-[#84a93c]"
                                                                />
                                                                <span className="text-xs font-medium text-slate-600">{col.header}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent className="p-0">
                                <div className="overflow-x-auto" style={{ maxHeight: "60vh" }}>
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50 sticky top-0 z-10">
                                            <tr>
                                                {visiblePendingOrdersColumns.map((col) => (
                                                    <th
                                                        key={col.dataKey}
                                                        className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap"
                                                    >
                                                        {col.header}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {pendingOrders.length === 0 ? (
                                                <tr>
                                                    <td colSpan={visiblePendingOrdersColumns.length} className="px-6 py-16 text-center">
                                                        <div className="flex flex-col items-center justify-center">
                                                            <User className="h-12 w-12 text-amber-300 mb-3" />
                                                            <p className="font-medium text-slate-600">No Supervisor Pending Items</p>
                                                            <p className="text-xs text-slate-400 mt-1">All tasks are completed.</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : (
                                                pendingOrders.map((record, index) => {
                                                    const status = getStatus(record);
                                                    return (
                                                        <tr key={`pending-${record.serialNo}-${index}`} className="hover:bg-amber-50/30 transition-colors">
                                                            {visiblePendingOrdersColumns.map((column) => (
                                                                <td key={column.dataKey} className="px-4 py-3 text-sm">
                                                                    {column.dataKey === 'action' ? (
                                                                        <div className="flex space-x-2">
                                                                            <Button
                                                                                onClick={() => handleViewDetails(record)}
                                                                                variant="outline"
                                                                                size="sm"
                                                                                className="h-8 px-2 border-amber-200 text-amber-600 hover:bg-amber-50"
                                                                            >
                                                                                <Eye size={14} />
                                                                            </Button>
                                                                            <Button
                                                                                onClick={() => handleMarkDone(record)}
                                                                                variant="primary"
                                                                                size="sm"
                                                                                className="h-8"
                                                                            >
                                                                                <CheckCircle size={14} className="mr-1" />
                                                                                Done
                                                                            </Button>
                                                                        </div>
                                                                    ) : column.dataKey === 'jobCardNo' ? (
                                                                        <span className="font-bold text-amber-600">{record.semiFinishedJobCardNo}</span>
                                                                    ) : column.dataKey === 'productName' ? (
                                                                        <span className="text-slate-600">{record.productName}</span>
                                                                    ) : column.dataKey === 'qty' ? (
                                                                        <Badge variant="success" className="font-bold">{record.qtyOfSemiFinishedGood}</Badge>
                                                                    ) : column.dataKey === 'plannedDate' ? (
                                                                        <div className="flex items-center text-slate-600">
                                                                            <Calendar size={12} className="mr-1.5 text-slate-400" />
                                                                            {formatDisplayDate(record.planned1 || '')}
                                                                        </div>
                                                                    ) : column.dataKey === 'supervisor' ? (
                                                                        <span className="text-slate-600">{record.supervisorName}</span>
                                                                    ) : column.dataKey === 'status' ? (
                                                                        <Badge variant="warning">{status.label}</Badge>
                                                                    ) : null}
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Production Tab */}
                    {activeTab === 'production' && (
                        <Card className="shadow-sm border border-slate-100">
                            <CardHeader className="py-3 px-4 bg-blue-50/50">
                                <div className="flex justify-between items-center">
                                    <CardTitle className="text-md font-bold text-slate-700 flex items-center">
                                        <Factory className="h-5 w-5 text-blue-600 mr-2" />
                                        Production Pending ({productionOrders.length})
                                    </CardTitle>

                                    {/* Column Visibility Dropdown */}
                                    <div className="relative">
                                        <Button
                                            onClick={() => setShowProductionColumns(!showProductionColumns)}
                                            variant="outline"
                                            size="sm"
                                        >
                                            <Settings size={14} className="mr-1.5" />
                                            Columns
                                        </Button>

                                        {showProductionColumns && (
                                            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-100 z-50 p-3">
                                                <div className="space-y-2">
                                                    <p className="text-sm font-bold text-slate-700 mb-2">Toggle Columns</p>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <button
                                                            onClick={() => {
                                                                handleSelectAllColumns('production', PRODUCTION_COLUMNS_META, true);
                                                                setShowProductionColumns(false);
                                                            }}
                                                            className="text-xs text-[#84a93c] hover:underline"
                                                        >
                                                            Select All
                                                        </button>
                                                        <span className="text-slate-300 mx-1">|</span>
                                                        <button
                                                            onClick={() => {
                                                                handleSelectAllColumns('production', PRODUCTION_COLUMNS_META, false);
                                                                setShowProductionColumns(false);
                                                            }}
                                                            className="text-xs text-[#84a93c] hover:underline"
                                                        >
                                                            Deselect All
                                                        </button>
                                                    </div>
                                                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                                        {PRODUCTION_COLUMNS_META.filter(col => !col.alwaysVisible).map((col) => (
                                                            <label key={col.dataKey} className="flex items-center space-x-2 cursor-pointer">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={!!visibleProductionColumns[col.dataKey]}
                                                                    onChange={(e) => handleToggleColumn('production', col.dataKey, e.target.checked)}
                                                                    className="rounded border-slate-300 text-[#84a93c] focus:ring-[#84a93c]"
                                                                />
                                                                <span className="text-xs font-medium text-slate-600">{col.header}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent className="p-0">
                                <div className="overflow-x-auto" style={{ maxHeight: "60vh" }}>
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50 sticky top-0 z-10">
                                            <tr>
                                                {visibleProductionOrdersColumns.map((col) => (
                                                    <th
                                                        key={col.dataKey}
                                                        className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap"
                                                    >
                                                        {col.header}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {productionOrders.length === 0 ? (
                                                <tr>
                                                    <td colSpan={visibleProductionOrdersColumns.length} className="px-6 py-16 text-center">
                                                        <div className="flex flex-col items-center justify-center">
                                                            <Factory className="h-12 w-12 text-blue-300 mb-3" />
                                                            <p className="font-medium text-slate-600">No Production Pending Items</p>
                                                            <p className="text-xs text-slate-400 mt-1">All tasks are completed.</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : (
                                                productionOrders.map((record, index) => {
                                                    const status = getStatus(record);
                                                    return (
                                                        <tr key={`production-${record.serialNo}-${index}`} className="hover:bg-blue-50/30 transition-colors">
                                                            {visibleProductionOrdersColumns.map((column) => (
                                                                <td key={column.dataKey} className="px-4 py-3 text-sm">
                                                                    {column.dataKey === 'action' ? (
                                                                        <div className="flex space-x-2">
                                                                            <Button
                                                                                onClick={() => handleViewDetails(record)}
                                                                                variant="outline"
                                                                                size="sm"
                                                                                className="h-8 px-2 border-blue-200 text-blue-600 hover:bg-blue-50"
                                                                            >
                                                                                <Eye size={14} />
                                                                            </Button>
                                                                            <Button
                                                                                onClick={() => handleMarkDone(record)}
                                                                                variant="primary"
                                                                                size="sm"
                                                                                className="h-8"
                                                                            >
                                                                                <CheckCircle size={14} className="mr-1" />
                                                                                Done
                                                                            </Button>
                                                                        </div>
                                                                    ) : column.dataKey === 'jobCardNo' ? (
                                                                        <span className="font-bold text-blue-600">{record.semiFinishedJobCardNo}</span>
                                                                    ) : column.dataKey === 'productName' ? (
                                                                        <span className="text-slate-600">{record.productName}</span>
                                                                    ) : column.dataKey === 'qty' ? (
                                                                        <Badge variant="success" className="font-bold">{record.qtyOfSemiFinishedGood}</Badge>
                                                                    ) : column.dataKey === 'plannedDate' ? (
                                                                        <div className="flex items-center text-slate-600">
                                                                            <Calendar size={12} className="mr-1.5 text-slate-400" />
                                                                            {formatDisplayDate(record.planned2 || '')}
                                                                        </div>
                                                                    ) : column.dataKey === 'supervisor' ? (
                                                                        <span className="text-slate-600">{record.supervisorName}</span>
                                                                    ) : column.dataKey === 'status' ? (
                                                                        <Badge variant="blue">{status.label}</Badge>
                                                                    ) : null}
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* History Tab */}
                    {activeTab === 'history' && (
                        <Card className="shadow-sm border border-slate-100">
                            <CardHeader className="py-3 px-4 bg-slate-50/50">
                                <div className="flex justify-between items-center">
                                    <CardTitle className="text-md font-bold text-slate-700 flex items-center">
                                        <History className="h-5 w-5 text-slate-600 mr-2" />
                                        Complete History ({historyOrders.length})
                                    </CardTitle>

                                    {/* Column Visibility Dropdown */}
                                    <div className="relative">
                                        <Button
                                            onClick={() => setShowHistoryColumns(!showHistoryColumns)}
                                            variant="outline"
                                            size="sm"
                                        >
                                            <Settings size={14} className="mr-1.5" />
                                            Columns
                                        </Button>

                                        {showHistoryColumns && (
                                            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-100 z-50 p-3">
                                                <div className="space-y-2">
                                                    <p className="text-sm font-bold text-slate-700 mb-2">Toggle Columns</p>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <button
                                                            onClick={() => {
                                                                handleSelectAllColumns('history', HISTORY_COLUMNS_META, true);
                                                                setShowHistoryColumns(false);
                                                            }}
                                                            className="text-xs text-[#84a93c] hover:underline"
                                                        >
                                                            Select All
                                                        </button>
                                                        <span className="text-slate-300 mx-1">|</span>
                                                        <button
                                                            onClick={() => {
                                                                handleSelectAllColumns('history', HISTORY_COLUMNS_META, false);
                                                                setShowHistoryColumns(false);
                                                            }}
                                                            className="text-xs text-[#84a93c] hover:underline"
                                                        >
                                                            Deselect All
                                                        </button>
                                                    </div>
                                                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                                        {HISTORY_COLUMNS_META.filter(col => !col.alwaysVisible).map((col) => (
                                                            <label key={col.dataKey} className="flex items-center space-x-2 cursor-pointer">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={!!visibleHistoryColumns[col.dataKey]}
                                                                    onChange={(e) => handleToggleColumn('history', col.dataKey, e.target.checked)}
                                                                    className="rounded border-slate-300 text-[#84a93c] focus:ring-[#84a93c]"
                                                                />
                                                                <span className="text-xs font-medium text-slate-600">{col.header}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent className="p-0">
                                <div className="overflow-x-auto" style={{ maxHeight: "60vh" }}>
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50 sticky top-0 z-10">
                                            <tr>
                                                {visibleHistoryOrdersColumns.map((col) => (
                                                    <th
                                                        key={col.dataKey}
                                                        className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap"
                                                    >
                                                        {col.header}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {historyOrders.length === 0 ? (
                                                <tr>
                                                    <td colSpan={visibleHistoryOrdersColumns.length} className="px-6 py-16 text-center">
                                                        <div className="flex flex-col items-center justify-center">
                                                            <History className="h-12 w-12 text-slate-300 mb-3" />
                                                            <p className="font-medium text-slate-600">No History Available</p>
                                                            <p className="text-xs text-slate-400 mt-1">Completed tasks will appear here.</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : (
                                                historyOrders.map((record, index) => {
                                                    const status = getStatus(record);
                                                    return (
                                                        <tr key={`history-${record.serialNo}-${index}`} className="hover:bg-slate-50/50 transition-colors">
                                                            {visibleHistoryOrdersColumns.map((column) => (
                                                                <td key={column.dataKey} className="px-4 py-3 text-sm">
                                                                    {column.dataKey === 'jobCardNo' ? (
                                                                        <span className="font-bold text-[#84a93c]">{record.semiFinishedJobCardNo}</span>
                                                                    ) : column.dataKey === 'productName' ? (
                                                                        <span className="text-slate-600">{record.productName}</span>
                                                                    ) : column.dataKey === 'qty' ? (
                                                                        <Badge variant="success">{record.qtyOfSemiFinishedGood}</Badge>
                                                                    ) : column.dataKey === 'stage1' ? (
                                                                        <div className="flex items-center space-x-2">
                                                                            {record.planned1 && record.planned1 !== '-' && (
                                                                                <>
                                                                                    <span className="text-xs text-slate-400">{formatDisplayDate(record.planned1)}</span>
                                                                                    <ArrowRight size={10} className="text-[#84a93c]" />
                                                                                    <span className="text-xs font-bold text-[#84a93c]">{formatDisplayDate(record.actual1 || '')}</span>
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    ) : column.dataKey === 'stage2' ? (
                                                                        <div className="flex items-center space-x-2">
                                                                            {record.planned2 && record.planned2 !== '-' && (
                                                                                <>
                                                                                    <span className="text-xs text-slate-400">{formatDisplayDate(record.planned2)}</span>
                                                                                    <ArrowRight size={10} className="text-blue-500" />
                                                                                    <span className="text-xs font-bold text-blue-500">{formatDisplayDate(record.actual2 || '')}</span>
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    ) : column.dataKey === 'supervisor' ? (
                                                                        <span className="text-slate-600">{record.supervisorName}</span>
                                                                    ) : column.dataKey === 'status' ? (
                                                                        <Badge variant={status.className.includes('emerald') ? 'success' : status.className.includes('purple') ? 'purple' : 'secondary'}>
                                                                            {status.label}
                                                                        </Badge>
                                                                    ) : null}
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </CardContent>
            </Card>

            {/* Error Message */}
            {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center text-red-600 text-xs font-bold">
                    <AlertTriangle size={16} className="mr-2 flex-shrink-0" />
                    {error}
                </div>
            )}

            {/* Success Message */}
            {successMessage && (
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center text-emerald-600 text-xs font-bold">
                    <CheckCircle size={16} className="mr-2 flex-shrink-0" />
                    {successMessage}
                </div>
            )}

            {/* Details Popup */}
            {showPopup && selectedRecord && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                        {/* Popup Header */}
                        <div className="flex items-center justify-between p-6 border-b border-slate-100">
                            <div>
                                <h3 className="text-lg font-black text-slate-800">Production Details</h3>
                                <p className="text-xs text-[#84a93c] font-medium">
                                    Job Card: {selectedRecord.semiFinishedJobCardNo} | S.No: {selectedRecord.serialNo}
                                </p>
                            </div>
                            <button
                                onClick={closePopup}
                                className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                            >
                                <X size={20} className="text-slate-400" />
                            </button>
                        </div>

                        {/* Popup Content */}
                        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)] space-y-6">
                            {/* Basic Information */}
                            <div>
                                <SectionHeader title="Basic Information" color="slate" />
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                                    <DetailField icon={Hash} label="Job Card No." value={selectedRecord.semiFinishedJobCardNo} />
                                    <DetailField icon={Building2} label="Supervisor" value={selectedRecord.supervisorName} />
                                    <DetailField icon={Calendar} label="Production Date" value={formatDisplayDate(selectedRecord.dateOfProduction)} />
                                    <DetailField icon={Package} label="Product Name" value={selectedRecord.productName} />
                                    <DetailField icon={Layers} label="Quantity" value={selectedRecord.qtyOfSemiFinishedGood} />
                                    <DetailField icon={Hash} label="Serial No." value={selectedRecord.serialNo} />
                                    <DetailField icon={Hash} label="SF Production No." value={selectedRecord.semiFinishedProductionNo} />
                                </div>
                            </div>

                            {/* Raw Materials */}
                            <div>
                                <SectionHeader title="Raw Materials Consumed" color="green" />
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                                    {selectedRecord.rawMaterial1Name && (
                                        <DetailField label="Raw Material 1" value={`${selectedRecord.rawMaterial1Name} (${selectedRecord.rawMaterial1Qty})`} />
                                    )}
                                    {selectedRecord.rawMaterial2Name && (
                                        <DetailField label="Raw Material 2" value={`${selectedRecord.rawMaterial2Name} (${selectedRecord.rawMaterial2Qty})`} />
                                    )}
                                    {selectedRecord.rawMaterial3Name && (
                                        <DetailField label="Raw Material 3" value={`${selectedRecord.rawMaterial3Name} (${selectedRecord.rawMaterial3Qty})`} />
                                    )}
                                    {selectedRecord.rawMaterial4Name && (
                                        <DetailField label="Raw Material 4" value={`${selectedRecord.rawMaterial4Name} (${selectedRecord.rawMaterial4Qty})`} />
                                    )}
                                    {selectedRecord.rawMaterial5Name && (
                                        <DetailField label="Raw Material 5" value={`${selectedRecord.rawMaterial5Name} (${selectedRecord.rawMaterial5Qty})`} />
                                    )}
                                </div>
                            </div>

                            {/* End Product */}
                            {(selectedRecord.isAnyEndProduct === 'Yes' || selectedRecord.endProductQty > 0) && (
                                <div>
                                    <SectionHeader title="End Product" color="purple" />
                                    <div className="grid grid-cols-2 gap-4 mt-4">
                                        <DetailField label="Is Any End Product" value={selectedRecord.isAnyEndProduct} />
                                        <DetailField label="End Product Raw Material" value={selectedRecord.endProductRawMaterialName} />
                                        <DetailField label="End Product Qty" value={selectedRecord.endProductQty} />
                                    </div>
                                </div>
                            )}

                            {/* Machine Readings */}
                            <div>
                                <SectionHeader title="Machine Details" color="amber" />
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                                    <DetailField icon={Hash} label="Starting Reading" value={selectedRecord.startingReading} />
                                    <DetailField icon={Hash} label="Ending Reading" value={selectedRecord.endingReading} />
                                    <DetailField icon={Clock} label="Machine Hours" value={selectedRecord.machineRunningHour} />
                                </div>

                                {/* Photos */}
                                <div className="flex gap-6 mt-4">
                                    <PhotoLink label="Start Photo" url={selectedRecord.startingReadingPhoto} />
                                    <PhotoLink label="End Photo" url={selectedRecord.endingReadingPhoto} />
                                </div>
                            </div>

                            {/* Planning Dates */}
                            <div>
                                <SectionHeader title="Planning & Actual Dates" color="blue" />
                                <div className="grid grid-cols-2 gap-6 mt-4">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-slate-400">Stage 1:</span>
                                            <div className="flex items-center">
                                                <span className="text-sm text-slate-600 mr-2">{formatDisplayDate(selectedRecord.planned1 || '')}</span>
                                                <ArrowRight size={12} className="text-[#84a93c] mr-2" />
                                                <span className="text-sm font-bold text-[#84a93c]">{formatDisplayDate(selectedRecord.actual1 || '')}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-slate-400">Stage 2:</span>
                                            <div className="flex items-center">
                                                <span className="text-sm text-slate-600 mr-2">{formatDisplayDate(selectedRecord.planned2 || '')}</span>
                                                <ArrowRight size={12} className="text-blue-500 mr-2" />
                                                <span className="text-sm font-bold text-blue-500">{formatDisplayDate(selectedRecord.actual2 || '')}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Narration */}
                            {selectedRecord.narration && (
                                <div>
                                    <SectionHeader title="Narration" color="slate" />
                                    <p className="text-sm text-slate-600 bg-slate-50 p-4 rounded-xl mt-2">
                                        {selectedRecord.narration}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Popup Footer */}
                        <div className="flex justify-end p-6 border-t border-slate-100">
                            <Button onClick={closePopup} variant="secondary">
                                Close
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Mark Done Popup */}
            {showMarkDonePopup && selectedRecord && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100">
                            <div>
                                <h3 className="text-lg font-black text-slate-800">Mark as Done</h3>
                                <p className="text-xs text-[#84a93c] font-medium">
                                    {selectedRecord.semiFinishedJobCardNo} — {selectedRecord.productName}
                                </p>
                            </div>
                            <button
                                onClick={() => setShowMarkDonePopup(false)}
                                className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                            >
                                <X size={20} className="text-slate-400" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Summary */}
                            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl">
                                <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Job Card</span>
                                    <p className="text-sm font-bold text-slate-700">{selectedRecord.semiFinishedJobCardNo}</p>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Product</span>
                                    <p className="text-sm font-medium text-slate-700">{selectedRecord.productName}</p>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Supervisor</span>
                                    <p className="text-sm text-slate-600">{selectedRecord.supervisorName}</p>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Planned Date</span>
                                    <p className="text-sm text-slate-600">
                                        {formatDisplayDate(activeTab === 'pending' ? selectedRecord.planned1 || '' : selectedRecord.planned2 || '')}
                                    </p>
                                </div>
                            </div>

                            {/* Remarks Input */}
                            <div className="space-y-2">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase">
                                    Remarks <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={markDoneRemarks}
                                    onChange={(e) => {
                                        setMarkDoneRemarks(e.target.value);
                                        if (markDoneErrors.remarks) {
                                            setMarkDoneErrors({});
                                        }
                                    }}
                                    placeholder="Enter completion remarks..."
                                    className={`w-full px-4 py-3 bg-white border ${markDoneErrors.remarks ? 'border-red-300' : 'border-slate-200'} rounded-xl focus:ring-2 focus:ring-[#84a93c] outline-none font-medium text-sm`}
                                    rows={3}
                                />
                                {markDoneErrors.remarks && (
                                    <p className="text-xs text-red-500 mt-1">{markDoneErrors.remarks}</p>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 p-6 border-t border-slate-100">
                            <Button
                                onClick={() => setShowMarkDonePopup(false)}
                                variant="secondary"
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleMarkDoneSubmit}
                                variant="primary"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader size={16} className="animate-spin mr-2" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle size={16} className="mr-2" />
                                        Confirm
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Step4List;