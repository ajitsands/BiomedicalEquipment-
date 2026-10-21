import React, { useState, useMemo } from 'react';
import { Search, ChevronUp, ChevronDown, ChevronsUpDown, Download, Printer } from 'lucide-react';

export default function DataTable({
  columns = [],
  data = [],
  keyField = 'id',
  searchPlaceholder = 'Search records...',
  defaultPageSize = 10,
  emptyMessage = 'No records found',
  toolbarActions = null,
  exportTitle = 'Export'
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' or 'desc'
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  // Sorting Handler
  const handleSort = (field) => {
    if (sortField === field) {
      if (sortDirection === 'asc') setSortDirection('desc');
      else {
        setSortField(null);
        setSortDirection('asc');
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filtered & Sorted Data
  const processedData = useMemo(() => {
    let result = [...data];

    // Global Search
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(row => {
        return columns.some(col => {
          const val = col.accessor ? (typeof col.accessor === 'function' ? col.accessor(row) : row[col.accessor]) : row[col.id];
          return val !== null && val !== undefined && String(val).toLowerCase().includes(q);
        });
      });
    }

    // Sort
    if (sortField) {
      result.sort((a, b) => {
        const col = columns.find(c => c.id === sortField || c.accessor === sortField);
        let valA = col?.accessor ? (typeof col.accessor === 'function' ? col.accessor(a) : a[col.accessor]) : a[sortField];
        let valB = col?.accessor ? (typeof col.accessor === 'function' ? col.accessor(b) : b[col.accessor]) : b[sortField];

        if (valA === null || valA === undefined) valA = '';
        if (valB === null || valB === undefined) valB = '';

        if (!isNaN(Number(valA)) && !isNaN(Number(valB))) {
          return sortDirection === 'asc' ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
        }

        const comp = String(valA).localeCompare(String(valB));
        return sortDirection === 'asc' ? comp : -comp;
      });
    }

    return result;
  }, [data, columns, searchTerm, sortField, sortDirection]);

  // Pagination
  const totalEntries = processedData.length;
  const totalPages = Math.ceil(totalEntries / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const currentRows = processedData.slice(startIndex, startIndex + pageSize);

  // Export CSV
  const handleExportCSV = () => {
    const headers = columns.map(c => `"${c.header}"`).join(',');
    const rows = processedData.map(row => {
      return columns.map(col => {
        const val = col.accessor ? (typeof col.accessor === 'function' ? col.accessor(row) : row[col.accessor]) : row[col.id];
        return `"${String(val || '').replace(/"/g, '""')}"`;
      }).join(',');
    });
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${exportTitle.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="datatable-wrapper">
      <div className="datatable-toolbar">
        <div className="datatable-search-box">
          <Search size={16} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="datatable-search-input"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <div className="datatable-filters">
          {toolbarActions}
          
          <button 
            type="button" 
            className="btn btn-secondary btn-sm" 
            onClick={handleExportCSV}
            title="Download CSV Spreadsheet"
          >
            <Download size={15} />
            Export CSV
          </button>

          <select
            className="form-control"
            style={{ width: 'auto', padding: '6px 10px', fontSize: '0.82rem' }}
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
          >
            <option value={5}>5 / page</option>
            <option value={10}>10 / page</option>
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
          </select>
        </div>
      </div>

      <div className="table-responsive">
        <table className="custom-table">
          <thead>
            <tr>
              {columns.map((col) => {
                const isSorted = sortField === (col.id || col.accessor);
                return (
                  <th
                    key={col.id || col.header}
                    className={col.sortable !== false ? 'sortable' : ''}
                    onClick={() => col.sortable !== false && handleSort(col.id || col.accessor)}
                    style={{ width: col.width || 'auto' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>{col.header}</span>
                      {col.sortable !== false && (
                        <span>
                          {isSorted ? (
                            sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                          ) : (
                            <ChevronsUpDown size={14} style={{ opacity: 0.3 }} />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {currentRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              currentRows.map((row, index) => (
                <tr key={row[keyField] || index}>
                  {columns.map((col) => {
                    const cellContent = col.render ? col.render(row) : (
                      col.accessor ? (typeof col.accessor === 'function' ? col.accessor(row) : row[col.accessor]) : row[col.id]
                    );
                    return (
                      <td key={col.id || col.header}>
                        {cellContent}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="datatable-footer">
        <div>
          Showing <strong>{totalEntries === 0 ? 0 : startIndex + 1}</strong> to{' '}
          <strong>{Math.min(startIndex + pageSize, totalEntries)}</strong> of <strong>{totalEntries}</strong> entries
        </div>

        <div className="pagination-controls">
          <button
            className="page-btn"
            onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            title="Previous Page"
          >
            &lt;
          </button>
          
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            let pageNum = i + 1;
            if (totalPages > 5 && currentPage > 3) {
              pageNum = currentPage - 2 + i;
              if (pageNum > totalPages) pageNum = totalPages - (4 - i);
            }
            return (
              <button
                key={pageNum}
                className={`page-btn ${currentPage === pageNum ? 'active' : ''}`}
                onClick={() => setCurrentPage(pageNum)}
              >
                {pageNum}
              </button>
            );
          })}

          <button
            className="page-btn"
            onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages || totalPages === 0}
            title="Next Page"
          >
            &gt;
          </button>
        </div>
      </div>
    </div>
  );
}
