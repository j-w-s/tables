import React, { useState, useEffect, useMemo, useCallback } from 'react';
import './Table.css';
import { Status } from '../../models/Table/Status';
import { Transaction } from '../../models/Table/Transaction';
import { Data } from '../../models/Table/Data';
import rawData from '../../assets/transactions_data.json';

type sortDirection = 'ascending' | 'descending';

const getStatusDetails = (statusKey: number, statuses: Status[]): { name: string; className: string } => {
    const status = statuses.find(s => s.Key === statusKey);
    if (!status) return { name: 'Unknown', className: 'status-unknown' };
    switch (status.Name.toLowerCase()) {
        case 'pending': return { name: status.Name, className: 'status-pending' };
        case 'settled': return { name: status.Name, className: 'status-settled' };
        case 'failed': return { name: status.Name, className: 'status-failed' };
        case 'voided': return { name: status.Name, className: 'status-voided' };
        default: return { name: status.Name, className: 'status-unknown' };
    }
};

export const Table = () => {
    const [originalTransactions, setOriginalTransactions] = useState<Transaction[]>([]);
    const [statuses, setStatuses] = useState<Status[]>([]);
    const [sortConfig, setSortConfig] = useState<{ key: keyof Transaction | null; direction: sortDirection }>({ 
        key: null, 
        direction: 'ascending' 
    });
    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectAll, setSelectAll] = useState(false);

    useEffect(() => {
        const data = rawData as Data;
        setOriginalTransactions(data.Transactions || []);
        setStatuses(data.Statuses || []);
    }, []);

    const processedTransactions = useMemo(() => {
        let workingData = [...originalTransactions];
        
        if (sortConfig.key) {
            workingData.sort((a, b) => {
                const aValue = a[sortConfig.key!];
                const bValue = b[sortConfig.key!];
                
                let comparison = 0;
                
                if (typeof aValue === 'number' && typeof bValue === 'number') {
                    comparison = aValue - bValue;
                } else if (sortConfig.key === 'Date') {
                    const dateA = new Date(aValue as string).getTime();
                    const dateB = new Date(bValue as string).getTime();
                    comparison = dateA - dateB;
                } else {
                    const valA = String(aValue || '').toLowerCase();
                    const valB = String(bValue || '').toLowerCase();
                    if (valA < valB) comparison = -1;
                    else if (valA > valB) comparison = 1;
                    else comparison = 0;
                }
                
                return sortConfig.direction === 'ascending' ? comparison : -comparison;
            });
        }
        
        return workingData;
    }, [originalTransactions, sortConfig]);

    const requestSort = useCallback((key: keyof Transaction) => {
        setSortConfig(prevConfig => {
            let direction: sortDirection = 'ascending';
            if (prevConfig.key === key && prevConfig.direction === 'ascending') {
                direction = 'descending';
            }
            return { key, direction };
        });
    }, []);

    const handleSelectRow = useCallback((reference: string) => {
        setSelectedRows(prevSelectedRows => {
            const newSelectedRows = new Set(prevSelectedRows);
            if (newSelectedRows.has(reference)) {
                newSelectedRows.delete(reference);
            } else {
                newSelectedRows.add(reference);
            }
            return newSelectedRows;
        });
    }, []);

    const handleSelectAll = useCallback(() => {
        if (selectAll) {
            setSelectedRows(new Set());
        } else {
            const allReferences = new Set(processedTransactions.map(t => t.Reference));
            setSelectedRows(allReferences);
        }
        setSelectAll(!selectAll);
    }, [selectAll, processedTransactions]);

    useEffect(() => {
        const allSelected = processedTransactions.length > 0 && 
                           processedTransactions.every(t => selectedRows.has(t.Reference));
        setSelectAll(allSelected);
    }, [selectedRows, processedTransactions]);

    const handleVoidTransactions = useCallback(() => {
        const voidedStatusKey = statuses.find(s => s.Name.toLowerCase() === 'voided')?.Key;
        if (voidedStatusKey === undefined) return;

        setOriginalTransactions(prevTransactions =>
            prevTransactions.map(t =>
                selectedRows.has(t.Reference) ? { ...t, Status: voidedStatusKey } : t
            )
        );
        
        setSelectedRows(new Set());
        setSelectAll(false);
        setIsModalOpen(false);
    }, [selectedRows, statuses]);

    const formatCurrency = useCallback((amount?: number): string => {
        if (typeof amount !== 'number') return '$0.00';
        return amount.toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }, []);

    const formatDate = useCallback((dateString?: string): string => {
        if (!dateString) return '';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        }) + ' ' + date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    }, []);

    const getSortClassName = useCallback((key: keyof Transaction): string => {
        if (sortConfig.key !== key) return 'sortable';
        return sortConfig.direction === 'ascending' ? 'sort-asc' : 'sort-desc';
    }, [sortConfig]);

    const handleKeyDown = useCallback((event: React.KeyboardEvent, action: () => void) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            action();
        }
    }, []);

    const handleCheckboxChange = useCallback((reference: string, event: React.ChangeEvent<HTMLInputElement>) => {
        event.stopPropagation(); 
        handleSelectRow(reference);
    }, [handleSelectRow]);

    const handleCheckboxClick = useCallback((event: React.MouseEvent<HTMLInputElement>) => {
        event.stopPropagation(); 
    }, []);

    return (
        <div className="table-component-wrapper">
            <div className="table-header">
                <h2>Transactions</h2>
                <div className="table-summary">
                    {processedTransactions.length} total transactions
                </div>
            </div>
            <div className="table-scroll-container" role="region" aria-label="Transaction data table">
                <table className="transactions-table" role="table" aria-label="Transaction list">
                    <thead>
                        <tr role="row">
                            <th className="checkbox-cell" role="columnheader">
                                <input
                                    type="checkbox"
                                    checked={selectAll}
                                    onChange={handleSelectAll}
                                    disabled={processedTransactions.length === 0}
                                    aria-label={selectAll ? "Deselect all transactions" : "Select all transactions"}
                                    title={selectAll ? "Deselect all transactions" : "Select all transactions"}
                                />
                            </th>
                            <th 
                                onClick={() => requestSort('Company')} 
                                className={getSortClassName('Company')}
                                role="columnheader"
                                tabIndex={0}
                                onKeyDown={(e) => handleKeyDown(e, () => requestSort('Company'))}
                                aria-sort={sortConfig.key === 'Company' ? sortConfig.direction : 'none'}
                                title="Click to sort by Company"
                            >
                                Company
                            </th>
                            <th 
                                onClick={() => requestSort('Reference')} 
                                className={getSortClassName('Reference')}
                                role="columnheader"
                                tabIndex={0}
                                onKeyDown={(e) => handleKeyDown(e, () => requestSort('Reference'))}
                                aria-sort={sortConfig.key === 'Reference' ? sortConfig.direction : 'none'}
                                title="Click to sort by Reference"
                            >
                                Reference
                            </th>
                            <th 
                                onClick={() => requestSort('Date')} 
                                className={getSortClassName('Date')}
                                role="columnheader"
                                tabIndex={0}
                                onKeyDown={(e) => handleKeyDown(e, () => requestSort('Date'))}
                                aria-sort={sortConfig.key === 'Date' ? sortConfig.direction : 'none'}
                                title="Click to sort by Date"
                            >
                                Date
                            </th>
                            <th 
                                onClick={() => requestSort('SubTotal')} 
                                className={`${getSortClassName('SubTotal')}`}
                                role="columnheader"
                                tabIndex={0}
                                onKeyDown={(e) => handleKeyDown(e, () => requestSort('SubTotal'))}
                                aria-sort={sortConfig.key === 'SubTotal' ? sortConfig.direction : 'none'}
                                title="Click to sort by Subtotal"
                            >
                                Subtotal
                            </th>
                            <th 
                                onClick={() => requestSort('Surcharge')} 
                                className={`${getSortClassName('Surcharge')}`}
                                role="columnheader"
                                tabIndex={0}
                                onKeyDown={(e) => handleKeyDown(e, () => requestSort('Surcharge'))}
                                aria-sort={sortConfig.key === 'Surcharge' ? sortConfig.direction : 'none'}
                                title="Click to sort by Surcharge"
                            >
                                Surcharge
                            </th>
                            <th 
                                onClick={() => requestSort('Amount')} 
                                className={`${getSortClassName('Amount')}`}
                                role="columnheader"
                                tabIndex={0}
                                onKeyDown={(e) => handleKeyDown(e, () => requestSort('Amount'))}
                                aria-sort={sortConfig.key === 'Amount' ? sortConfig.direction : 'none'}
                                title="Click to sort by Total Amount"
                            >
                                Total Amount
                            </th>
                            <th 
                                onClick={() => requestSort('Status')} 
                                className={getSortClassName('Status')}
                                role="columnheader"
                                tabIndex={0}
                                onKeyDown={(e) => handleKeyDown(e, () => requestSort('Status'))}
                                aria-sort={sortConfig.key === 'Status' ? sortConfig.direction : 'none'}
                                title="Click to sort by Status"
                            >
                                Status
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {processedTransactions.map((transaction, index) => {
                            const statusDetails = getStatusDetails(transaction.Status, statuses);
                            const isSelected = selectedRows.has(transaction.Reference);
                            
                            return (
                                <tr 
                                    key={`${transaction.Reference}-${index}`}
                                    onClick={() => handleSelectRow(transaction.Reference)} 
                                    className={isSelected ? 'selected-row' : ''}
                                    role="row"
                                    tabIndex={0}
                                    onKeyDown={(e) => handleKeyDown(e, () => handleSelectRow(transaction.Reference))}
                                    aria-selected={isSelected}
                                    title={`Transaction ${transaction.Reference}, click to ${isSelected ? 'deselect' : 'select'}`}
                                >
                                    <td className="checkbox-cell" role="gridcell">
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={(e) => handleCheckboxChange(transaction.Reference, e)}
                                            onClick={handleCheckboxClick}
                                            aria-label={`${isSelected ? 'Deselect' : 'Select'} transaction ${transaction.Reference}`}
                                            title={`${isSelected ? 'Deselect' : 'Select'} transaction ${transaction.Reference}`}
                                        />
                                    </td>
                                    <td className="company-cell" role="gridcell">{transaction.Company}</td>
                                    <td className="reference-cell" role="gridcell">{transaction.Reference}</td>
                                    <td className="date-cell" role="gridcell">{formatDate(transaction.Date)}</td>
                                    <td className="align-right amount-cell" role="gridcell">{formatCurrency(transaction.SubTotal)}</td>
                                    <td className="align-right amount-cell" role="gridcell">{formatCurrency(transaction.Surcharge)}</td>
                                    <td className="align-right amount-cell total-amount" role="gridcell">{formatCurrency(transaction.Amount)}</td>
                                    <td className="status-cell" role="gridcell">
                                        <span className={`status-badge ${statusDetails.className}`} 
                                              aria-label={`Status: ${statusDetails.name}`}
                                              title={`Status: ${statusDetails.name}`}>
                                            {statusDetails.name}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <div className="table-footer">
                <div className="table-footer-info">
                    <span className="selection-count">{selectedRows.size}</span> of <span className="total-count">{processedTransactions.length}</span> transactions selected
                </div>
                <div className="table-footer-actions">
                    <button 
                        onClick={() => setIsModalOpen(true)} 
                        disabled={selectedRows.size === 0}
                        className="void-button"
                        title={`Void ${selectedRows.size} selected transactions`}
                    >
                        Void {selectedRows.size} Transaction{selectedRows.size === 1 ? '' : 's'}
                    </button>
                </div>
            </div>
            {isModalOpen && (
                <div 
                    className="modal-overlay" 
                    role="dialog" 
                    aria-modal="true" 
                    aria-labelledby="modal-title"
                    onClick={(e) => e.target === e.currentTarget && setIsModalOpen(false)}
                >
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3 id="modal-title">Confirm Void Action</h3>
                        </div>
                        <div className="modal-body">
                            <p>Are you sure you want to void <strong>{selectedRows.size}</strong> selected transaction{selectedRows.size === 1 ? '' : 's'}?</p>
                            <p className="modal-warning">This action cannot be undone.</p>
                        </div>
                        <div className="modal-actions">
                            <button 
                                onClick={() => setIsModalOpen(false)} 
                                className="cancel-button"
                                title="Cancel void action"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleVoidTransactions} 
                                className="confirm-button"
                                title="Confirm void transactions"
                            >
                                Void Transactions
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Table;