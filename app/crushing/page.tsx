"use client"

import React, { useState, useEffect, useRef } from 'react';
import {
    Plus,
    X,
    HardHat,
    Calendar,
    Camera,
    Save,
    RefreshCw,
    Loader,
    Package,
    History,
    CheckCircle2,
    Clock,
    Settings,
    Eye,
    AlertTriangle,
    ArrowRight,
    Factory
} from 'lucide-react';

// ==================== CONSTANTS ====================
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzVnLwTlFuGrlzyPSa2VWy4h9sU2EQrsuKrPLvQvhZoaoJu8GilGDc5aQTgLliUD7ss/exec";

// ==================== TYPE DEFINITIONS ====================
interface CrushingJob {
    timestamp: string;
    semiFinishedJobCardNo: string;
    supervisorName: string;
    dateOfProduction: string;
    productName: string;
    qtyOfSemiFinishedGood: number;
    serialNo: string;
    planned2?: string;
    actual2?: string;
    rowIndex?: number;
    actual2ColumnIndex?: number;
    sNo?: string;
}

interface FGOption {
    name: string;
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
        if (dateString.match(/^\d{2}\/\d{2}\/\d{2}$/)) {
            return dateString;
        }

        if (dateString.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
            return dateString;
        }

        if (dateString.includes('T') && dateString.includes('Z')) {
            const date = new Date(dateString);
            if (!isNaN(date.getTime())) {
                const day = date.getDate().toString().padStart(2, '0');
                const month = (date.getMonth() + 1).toString().padStart(2, '0');
                const year = date.getFullYear().toString().slice(-2);
                return `${day}/${month}/${year}`;
            }
        }

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

const fetchCrushingJobs = async (): Promise<CrushingJob[]> => {
    try {
        const data = await fetchSheetData('Semi Actual');

        if (data.length <= 4) return [];

        // Skip header rows (first 4 rows)
        const dataRows = data.slice(4);

        const jobs: CrushingJob[] = [];

        dataRows.forEach((row, index) => {
            if (!row || row.length < 2) return;

            const serialNo = row[16] || ''; // Column Q

            if (!serialNo) return;

            // Get planned2 (column 75) and actual2 (column 76)
            const planned2 = row[75] || '';
            const actual2 = row[76] || '';

            // Only include if planned2 exists
            if (!planned2 || planned2 === '' || planned2 === '-') return;

            jobs.push({
                timestamp: row[0] || '',
                semiFinishedJobCardNo: row[1] || '',
                supervisorName: row[2] || '',
                dateOfProduction: row[3] || '',
                productName: row[4] || '',
                qtyOfSemiFinishedGood: parseFloat(row[5]) || 0,
                serialNo,
                planned2,
                actual2,
                sNo: serialNo,
                rowIndex: index + 5, // +5 because we skipped 4 header rows + 0-based index
                actual2ColumnIndex: 77, // Column BU (Actual2) - adjust based on your sheet
            });
        });

        return jobs;
    } catch (error) {
        console.error('Error fetching crushing jobs:', error);
        return [];
    }
};

const fetchCrushingItems = async (): Promise<{ headers: string[], options: string[][] }> => {
    try {
        const data = await fetchSheetData('Master');

        if (data.length === 0) {
            return { headers: [], options: [[], [], [], []] };
        }

        // Find columns for crushing items
        // Assuming:
        // - Column O: Crushing Product Names
        // - Column P: Finished Goods Names
        const crushingProducts: string[] = [];
        const finishedGoods: string[] = [];

        for (let i = 1; i < Math.min(100, data.length); i++) {
            const row = data[i];
            if (row) {
                // Column O (index 14) - Crushing Products
                if (row[14] && row[14].toString().trim() !== '') {
                    crushingProducts.push(row[14].toString().trim());
                }
                // Column P (index 15) - Finished Goods
                if (row[15] && row[15].toString().trim() !== '') {
                    finishedGoods.push(row[15].toString().trim());
                }
            }
        }

        return {
            headers: ['Crushing Products', 'Finished Goods'],
            options: [crushingProducts, [], finishedGoods, []]
        };
    } catch (error) {
        console.error('Error fetching crushing items:', error);
        return { headers: [], options: [[], [], [], []] };
    }
};

const uploadImageToDrive = async (file: File, fileName: string): Promise<string> => {
    try {
        const formData = new FormData();
        formData.append('action', 'uploadFile');
        formData.append('fileName', fileName);
        formData.append('mimeType', file.type);

        // Convert file to base64
        const base64Data = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                resolve(base64String);
            };
            reader.readAsDataURL(file);
        });

        formData.append('base64Data', base64Data);
        formData.append('folderId', '1xlnsYz7KhmN5uF_0E8XKHLbL9Z8xYk3L'); // Replace with your folder ID

        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'cors',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Failed to upload image');
        }

        return result.fileUrl;
    } catch (error) {
        console.error('Error uploading image:', error);
        throw error;
    }
};

const submitCrushingActual = async (rowData: any[]): Promise<boolean> => {
    try {
        const formData = new FormData();
        formData.append('action', 'insert');
        formData.append('sheetName', 'Crushing Actual');
        formData.append('rowData', JSON.stringify(rowData));

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
        console.error('Error submitting to Crushing Actual:', error);
        return false;
    }
};

const updateCrushingActualDate = async (rowIndex: number, columnIndex: number, value: string): Promise<boolean> => {
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
        console.error('Error updating crushing actual date:', error);
        return false;
    }
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
    variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'purple' | 'blue' | 'amber';
    className?: string;
}) => {
    const variants = {
        default: 'bg-[#84a93c] text-white',
        secondary: 'bg-slate-100 text-slate-600',
        destructive: 'bg-red-500 text-white',
        outline: 'border border-slate-200 text-slate-600',
        success: 'bg-emerald-50 text-emerald-600',
        warning: 'bg-amber-50 text-amber-600',
        amber: 'bg-amber-50 text-amber-600',
        purple: 'bg-purple-50 text-purple-600',
        blue: 'bg-blue-50 text-blue-600'
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
    variant?: 'primary' | 'secondary' | 'outline' | 'destructive' | 'success';
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
        success: 'bg-emerald-500 text-white hover:bg-emerald-600'
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

// ==================== MAIN COMPONENT ====================
interface Props {
    state?: any;
    onUpdate?: (updater: (prev: any) => any) => void;
}

const Step5List: React.FC<Props> = ({ state, onUpdate }) => {
    const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [crushingJobs, setCrushingJobs] = useState<CrushingJob[]>([]);
    const [fgData, setFgData] = useState<{ headers: string[], options: string[][] }>({ headers: [], options: [[], [], [], []] });
    const [selectedJob, setSelectedJob] = useState<CrushingJob | null>(null);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [showPendingColumns, setShowPendingColumns] = useState(false);
    const [showHistoryColumns, setShowHistoryColumns] = useState(false);

    // Column visibility
    const [visiblePendingColumns, setVisiblePendingColumns] = useState<Record<string, boolean>>({
        action: true,
        date: true,
        jobDetails: true,
        qty: true,
        plannedDate: true,
        status: true
    });

    const [visibleHistoryColumns, setVisibleHistoryColumns] = useState<Record<string, boolean>>({
        date: true,
        jobDetails: true,
        qty: true,
        actualDate: true,
        status: true
    });

    // Column metadata
    const PENDING_COLUMNS_META = [
        { header: "Actions", dataKey: "action", alwaysVisible: true },
        { header: "Date of Prod.", dataKey: "date", alwaysVisible: true },
        { header: "Job Details", dataKey: "jobDetails", alwaysVisible: true },
        { header: "Input Qty", dataKey: "qty" },
        { header: "Planned Date", dataKey: "plannedDate" },
        { header: "Status", dataKey: "status" },
    ];

    const HISTORY_COLUMNS_META = [
        { header: "Date of Prod.", dataKey: "date", alwaysVisible: true },
        { header: "Job Details", dataKey: "jobDetails", alwaysVisible: true },
        { header: "Input Qty", dataKey: "qty" },
        { header: "Completed Date", dataKey: "actualDate" },
        { header: "Status", dataKey: "status" },
    ];

    // Form State
    const [formData, setFormData] = useState({
        dateOfProduction: '',
        date: new Date().toISOString().split('T')[0],
        crushingProductName: '',
        fg1Name: '',
        fg1Qty: '',
        fg2Name: '',
        fg2Qty: '',
        fg3Name: '',
        fg3Qty: '',
        fg4Name: '',
        fg4Qty: '',
        remarks: '',
        machineRunningHour: ''
    });

    const [startingPhoto, setStartingPhoto] = useState<File | null>(null);
    const [endingPhoto, setEndingPhoto] = useState<File | null>(null);
    const startPhotoRef = useRef<HTMLInputElement>(null);
    const endPhotoRef = useRef<HTMLInputElement>(null);

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
            const [jobs, data] = await Promise.all([
                fetchCrushingJobs(),
                fetchCrushingItems()
            ]);
            setCrushingJobs(jobs);
            setFgData(data);
        } catch (err) {
            console.error('Error loading Step 5 data:', err);
            setError('Failed to refresh data.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenModal = (job: CrushingJob) => {
        setSelectedJob(job);
        setFormData({
            ...formData,
            dateOfProduction: job.dateOfProduction,
            crushingProductName: job.productName,
            date: new Date().toISOString().split('T')[0]
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedJob) return;

        setIsSubmitting(true);
        setError('');

        try {
            let startPhotoUrl = '';
            let endPhotoUrl = '';

            if (startingPhoto) {
                const fileName = `START_${selectedJob.sNo || selectedJob.serialNo}_${Date.now()}.jpg`;
                startPhotoUrl = await uploadImageToDrive(startingPhoto, fileName);
            }
            if (endingPhoto) {
                const fileName = `END_${selectedJob.sNo || selectedJob.serialNo}_${Date.now()}.jpg`;
                endPhotoUrl = await uploadImageToDrive(endingPhoto, fileName);
            }

            const timestamp = formatDate(new Date());

            // Column mapping for "Crushing Actual" sheet
            const rowData = [
                timestamp,                          // Col A: Timestamp
                formData.date,                      // Col B: Date Of Production
                formData.crushingProductName,       // Col C: Crushing Product Name
                selectedJob.qtyOfSemiFinishedGood,  // Col D: Qty Of Crushing Product (Input Qty)
                formData.fg1Name,                   // Col E: Finished Goods Name 1
                Number(formData.fg1Qty) || 0,       // Col F: Qty 1
                formData.fg2Name,                   // Col G: Finished Goods Name 2
                Number(formData.fg2Qty) || 0,       // Col H: Qty 2
                formData.fg3Name,                   // Col I: Finished Goods Name 3
                Number(formData.fg3Qty) || 0,       // Col J: Qty 3
                formData.fg4Name,                   // Col K: Finished Goods Name 4
                Number(formData.fg4Qty) || 0,       // Col L: Qty 4
                startPhotoUrl,                      // Col M: Starting Reading Photo
                endPhotoUrl,                        // Col N: Ending Reading Photo
                formData.remarks,                   // Col O: Remarks
                Number(formData.machineRunningHour) || 0, // Col P: Machine Running Hour
            ];

            console.log('Submitting row data:', rowData);

            const success = await submitCrushingActual(rowData);
            if (success) {
                // Update actual2 in Semi Actual sheet
                if (selectedJob.rowIndex && selectedJob.actual2ColumnIndex) {
                    await updateCrushingActualDate(selectedJob.rowIndex, selectedJob.actual2ColumnIndex, timestamp);
                }

                showSuccess('Crushing job completed successfully!');
                setIsModalOpen(false);
                setStartingPhoto(null);
                setEndingPhoto(null);

                // Reset form
                setFormData({
                    dateOfProduction: '',
                    date: new Date().toISOString().split('T')[0],
                    crushingProductName: '',
                    fg1Name: '',
                    fg1Qty: '',
                    fg2Name: '',
                    fg2Qty: '',
                    fg3Name: '',
                    fg3Qty: '',
                    fg4Name: '',
                    fg4Qty: '',
                    remarks: '',
                    machineRunningHour: ''
                });

                await loadData(); // Refresh list
            } else {
                setError('Failed to submit crushing data.');
            }
        } catch (err) {
            console.error('Error in submission:', err);
            setError('An error occurred during submission.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleColumn = (tab: string, dataKey: string, checked: boolean) => {
        if (tab === 'pending') {
            setVisiblePendingColumns(prev => ({ ...prev, [dataKey]: checked }));
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
        } else {
            setVisibleHistoryColumns(prev => ({ ...prev, ...newVisibility }));
        }
    };

    const pendingJobs = crushingJobs.filter(job => !job.actual2 || job.actual2 === '' || job.actual2 === '-');
    const historyJobs = crushingJobs.filter(job => job.actual2 && job.actual2 !== '' && job.actual2 !== '-');

    const visiblePendingColumnsList = PENDING_COLUMNS_META.filter(
        (col) => visiblePendingColumns[col.dataKey] || col.alwaysVisible
    );

    const visibleHistoryColumnsList = HISTORY_COLUMNS_META.filter(
        (col) => visibleHistoryColumns[col.dataKey] || col.alwaysVisible
    );

    if (isLoading && crushingJobs.length === 0) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Loader className="h-12 w-12 animate-spin text-[#84a93c]" />
                <p className="ml-4 text-lg font-medium text-slate-600">Loading Crushing Data...</p>
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
                                <Factory className="h-6 w-6" />
                                Crushing Department
                            </CardTitle>
                            <CardDescription>
                                Process crushing jobs and log finished goods output
                            </CardDescription>
                        </div>
                        <Button onClick={loadData} variant="outline" size="sm" disabled={isLoading}>
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
                            Pending ({pendingJobs.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`flex items-center px-6 py-2.5 rounded-xl font-bold text-xs transition-all ${activeTab === 'history'
                                ? 'bg-[#84a93c] text-white shadow-lg shadow-emerald-100'
                                : 'text-slate-500 hover:bg-white hover:text-slate-800'
                                }`}
                        >
                            <History size={14} className="mr-2" />
                            History ({historyJobs.length})
                        </button>
                    </div>

                    {/* Pending Tab */}
                    {activeTab === 'pending' && (
                        <Card className="shadow-sm border border-slate-100">
                            <CardHeader className="py-3 px-4 bg-amber-50/50">
                                <div className="flex justify-between items-center">
                                    <CardTitle className="text-md font-bold text-slate-700 flex items-center">
                                        <Clock className="h-5 w-5 text-amber-600 mr-2" />
                                        Jobs Ready for Crushing ({pendingJobs.length})
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
                                                {visiblePendingColumnsList.map((col) => (
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
                                            {pendingJobs.length === 0 ? (
                                                <tr>
                                                    <td colSpan={visiblePendingColumnsList.length} className="px-6 py-16 text-center">
                                                        <div className="flex flex-col items-center justify-center">
                                                            <CheckCircle2 className="h-12 w-12 text-emerald-300 mb-3" />
                                                            <p className="font-medium text-slate-600">No Jobs Pending for Crushing</p>
                                                            <p className="text-xs text-slate-400 mt-1">Excellent! All jobs are completed.</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : (
                                                pendingJobs.map((job, index) => (
                                                    <tr key={`pending-${job.serialNo}-${index}`} className="hover:bg-amber-50/30 transition-colors">
                                                        {visiblePendingColumnsList.map((column) => (
                                                            <td key={column.dataKey} className="px-4 py-3 text-sm">
                                                                {column.dataKey === 'action' ? (
                                                                    <Button
                                                                        onClick={() => handleOpenModal(job)}
                                                                        variant="primary"
                                                                        size="sm"
                                                                        className="h-8"
                                                                    >
                                                                        <HardHat size={14} className="mr-1" />
                                                                        Start
                                                                    </Button>
                                                                ) : column.dataKey === 'date' ? (
                                                                    <div className="flex items-center text-slate-600">
                                                                        <Calendar size={12} className="mr-1.5 text-slate-400" />
                                                                        {formatDisplayDate(job.dateOfProduction)}
                                                                    </div>
                                                                ) : column.dataKey === 'jobDetails' ? (
                                                                    <div className="flex items-center">
                                                                        <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 mr-3">
                                                                            <Package size={16} />
                                                                        </div>
                                                                        <div>
                                                                            <div className="font-bold text-slate-800 text-sm">{job.productName}</div>
                                                                            <div className="text-[9px] text-slate-400 font-black uppercase tracking-tighter">
                                                                                JC: {job.semiFinishedJobCardNo} | S.No: {job.serialNo}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ) : column.dataKey === 'qty' ? (
                                                                    <Badge variant="success" className="font-bold">{job.qtyOfSemiFinishedGood}</Badge>
                                                                ) : column.dataKey === 'plannedDate' ? (
                                                                    <div className="flex items-center text-slate-600">
                                                                        <Calendar size={12} className="mr-1.5 text-slate-400" />
                                                                        {formatDisplayDate(job.planned2 || '')}
                                                                    </div>
                                                                ) : column.dataKey === 'status' ? (
                                                                    <Badge variant="warning">In Queue</Badge>
                                                                ) : null}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))
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
                                        Crushing History ({historyJobs.length})
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
                                                {visibleHistoryColumnsList.map((col) => (
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
                                            {historyJobs.length === 0 ? (
                                                <tr>
                                                    <td colSpan={visibleHistoryColumnsList.length} className="px-6 py-16 text-center">
                                                        <div className="flex flex-col items-center justify-center">
                                                            <History className="h-12 w-12 text-slate-300 mb-3" />
                                                            <p className="font-medium text-slate-600">No Crushing History Found</p>
                                                            <p className="text-xs text-slate-400 mt-1">Completed jobs will appear here.</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : (
                                                historyJobs.map((job, index) => (
                                                    <tr key={`history-${job.serialNo}-${index}`} className="hover:bg-slate-50/50 transition-colors">
                                                        {visibleHistoryColumnsList.map((column) => (
                                                            <td key={column.dataKey} className="px-4 py-3 text-sm">
                                                                {column.dataKey === 'date' ? (
                                                                    <div className="flex items-center text-slate-600">
                                                                        <Calendar size={12} className="mr-1.5 text-slate-400" />
                                                                        {formatDisplayDate(job.dateOfProduction)}
                                                                    </div>
                                                                ) : column.dataKey === 'jobDetails' ? (
                                                                    <div className="flex items-center">
                                                                        <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 mr-3">
                                                                            <Package size={16} />
                                                                        </div>
                                                                        <div>
                                                                            <div className="font-bold text-slate-800 text-sm">{job.productName}</div>
                                                                            <div className="text-[9px] text-slate-400 font-black uppercase tracking-tighter">
                                                                                JC: {job.semiFinishedJobCardNo} | S.No: {job.serialNo}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ) : column.dataKey === 'qty' ? (
                                                                    <Badge variant="success" className="font-bold">{job.qtyOfSemiFinishedGood}</Badge>
                                                                ) : column.dataKey === 'actualDate' ? (
                                                                    <div className="flex items-center text-slate-600">
                                                                        <CheckCircle2 size={12} className="mr-1.5 text-emerald-500" />
                                                                        {formatDisplayDate(job.actual2 || '')}
                                                                    </div>
                                                                ) : column.dataKey === 'status' ? (
                                                                    <Badge variant="success">Completed</Badge>
                                                                ) : null}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))
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
                    <CheckCircle2 size={16} className="mr-2 flex-shrink-0" />
                    {successMessage}
                </div>
            )}

            {/* Crushing Modal */}
            {isModalOpen && selectedJob && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in zoom-in duration-300 overflow-y-auto">
                    <div className="bg-white rounded-[32px] w-full max-w-2xl my-auto overflow-hidden shadow-2xl border border-slate-100">
                        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-50 sticky top-0 bg-white z-10">
                            <div>
                                <h3 className="text-xl font-black text-slate-800 flex items-center">
                                    <HardHat size={22} className="mr-2 text-[#84a93c]" />
                                    Start Crushing
                                </h3>
                                <p className="text-xs text-[#84a93c] font-bold mt-0.5">
                                    {selectedJob.semiFinishedJobCardNo} — {selectedJob.productName}
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setIsModalOpen(false);
                                    setStartingPhoto(null);
                                    setEndingPhoto(null);
                                }}
                                className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-50 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
                            {/* Read-only job info */}
                            <div className="grid grid-cols-2 gap-4 bg-slate-50/50 p-4 rounded-2xl">
                                <div>
                                    <label className="block text-[8px] font-black text-slate-400 uppercase mb-1 ml-1">Job Card No.</label>
                                    <input
                                        readOnly
                                        type="text"
                                        value={selectedJob.semiFinishedJobCardNo}
                                        className="w-full px-3 py-2 bg-white border-none rounded-xl outline-none font-bold text-xs text-[#84a93c]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[8px] font-black text-slate-400 uppercase mb-1 ml-1">Product</label>
                                    <input
                                        readOnly
                                        type="text"
                                        value={selectedJob.productName}
                                        className="w-full px-3 py-2 bg-white border-none rounded-xl outline-none font-bold text-xs text-slate-600"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[8px] font-black text-slate-400 uppercase mb-1 ml-1">Input Qty</label>
                                    <input
                                        readOnly
                                        type="text"
                                        value={selectedJob.qtyOfSemiFinishedGood}
                                        className="w-full px-3 py-2 bg-white border-none rounded-xl outline-none font-bold text-xs text-emerald-600"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[8px] font-black text-slate-400 uppercase mb-1 ml-1">Planned Date</label>
                                    <input
                                        readOnly
                                        type="text"
                                        value={formatDisplayDate(selectedJob.planned2 || '')}
                                        className="w-full px-3 py-2 bg-white border-none rounded-xl outline-none font-bold text-xs text-slate-600"
                                    />
                                </div>
                            </div>

                            {/* Dates */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">
                                        Production Date
                                    </label>
                                    <input
                                        readOnly
                                        type="text"
                                        value={formatDisplayDate(selectedJob.dateOfProduction)}
                                        className="w-full px-4 py-2 bg-slate-100 border-none rounded-xl font-bold text-sm text-slate-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">
                                        Today's Date <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        required
                                        type="date"
                                        value={formData.date}
                                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#84a93c] outline-none font-bold text-sm"
                                    />
                                </div>
                            </div>

                            {/* Crushing Product */}
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">
                                    Crushing Product Name <span className="text-red-500">*</span>
                                </label>
                                <select
                                    required
                                    value={formData.crushingProductName}
                                    onChange={e => setFormData({ ...formData, crushingProductName: e.target.value })}
                                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#84a93c] outline-none font-bold text-sm"
                                >
                                    <option value="">-- Select Crushing Product --</option>
                                    {(fgData.options[0] || []).map((item, index) => (
                                        <option key={index} value={item}>{item}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Photo Upload Section */}
                            <div className="grid grid-cols-2 gap-4">
                                {/* Starting Photo */}
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">
                                        Start Photo
                                    </label>
                                    <input
                                        type="file"
                                        ref={startPhotoRef}
                                        accept="image/*"
                                        onChange={e => setStartingPhoto(e.target.files?.[0] || null)}
                                        className="hidden"
                                    />
                                    {startingPhoto ? (
                                        <div className="relative">
                                            <img
                                                src={URL.createObjectURL(startingPhoto)}
                                                alt="Start Preview"
                                                className="w-full h-28 object-cover rounded-xl border border-slate-200"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setStartingPhoto(null)}
                                                className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div
                                            onClick={() => startPhotoRef.current?.click()}
                                            className="w-full h-28 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50"
                                        >
                                            <Camera size={24} className="text-slate-400 mb-1" />
                                            <span className="text-[8px] font-black text-slate-400 uppercase">Click to Upload</span>
                                        </div>
                                    )}
                                </div>

                                {/* Ending Photo */}
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">
                                        End Photo
                                    </label>
                                    <input
                                        type="file"
                                        ref={endPhotoRef}
                                        accept="image/*"
                                        onChange={e => setEndingPhoto(e.target.files?.[0] || null)}
                                        className="hidden"
                                    />
                                    {endingPhoto ? (
                                        <div className="relative">
                                            <img
                                                src={URL.createObjectURL(endingPhoto)}
                                                alt="End Preview"
                                                className="w-full h-28 object-cover rounded-xl border border-slate-200"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setEndingPhoto(null)}
                                                className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div
                                            onClick={() => endPhotoRef.current?.click()}
                                            className="w-full h-28 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50"
                                        >
                                            <Camera size={24} className="text-slate-400 mb-1" />
                                            <span className="text-[8px] font-black text-slate-400 uppercase">Click to Upload</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Finished Goods Section */}
                            <div className="bg-emerald-50/50 p-5 rounded-[24px] border border-emerald-100">
                                <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center mb-3">
                                    <Package size={14} className="mr-1.5" />
                                    Finished Goods Output
                                </h4>

                                <div className="space-y-4">
                                    {[1, 2, 3, 4].map(num => (
                                        <div key={num} className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[8px] font-black text-slate-400 uppercase mb-1">
                                                    Finished Goods Name {num}
                                                </label>
                                                <select
                                                    value={(formData as any)[`fg${num}Name`]}
                                                    onChange={e => setFormData({ ...formData, [`fg${num}Name`]: e.target.value })}
                                                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-[10px]"
                                                >
                                                    <option value="">-- Select --</option>
                                                    {(fgData.options[2] || []).map((item, index) => (
                                                        <option key={index} value={item}>{item}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[8px] font-black text-slate-400 uppercase mb-1">
                                                    Qty {num}
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={(formData as any)[`fg${num}Qty`]}
                                                    onChange={e => setFormData({ ...formData, [`fg${num}Qty`]: e.target.value })}
                                                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-[10px]"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Machine Hours & Remarks */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">
                                        Machine Hours <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        required
                                        type="number"
                                        step="0.1"
                                        value={formData.machineRunningHour}
                                        onChange={e => setFormData({ ...formData, machineRunningHour: e.target.value })}
                                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#84a93c] outline-none font-bold text-sm"
                                        placeholder="0.0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">
                                        Remarks
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.remarks}
                                        onChange={e => setFormData({ ...formData, remarks: e.target.value })}
                                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#84a93c] outline-none font-bold text-sm"
                                        placeholder="Optional"
                                    />
                                </div>
                            </div>

                            {/* Submit Button */}
                            <div className="flex justify-end pt-4">
                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    variant="primary"
                                    size="lg"
                                    className="w-full md:w-auto"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader size={18} className="animate-spin mr-2" />
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <Save size={18} className="mr-2" />
                                            Log Crushing Output
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Step5List;