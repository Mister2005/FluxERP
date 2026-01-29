import React from 'react';

interface Column<T> {
    header: string;
    accessor: keyof T | ((row: T) => React.ReactNode);
    className?: string;
}

interface TableProps<T> {
    data: T[];
    columns: Column<T>[];
    onRowClick?: (row: T) => void;
    isLoading?: boolean;
}

export function Table<T>({ data, columns, onRowClick, isLoading }: TableProps<T>) {
    if (isLoading) {
        return (
            <div className="w-full bg-white rounded-lg border border-gray-200 p-8 flex justify-center">
                <div className="spinner"></div>
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="w-full bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
                No data found
            </div>
        );
    }

    return (
        <div className="w-full overflow-hidden bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="uppercase tracking-wider border-b border-gray-200 bg-gray-50">
                        <tr>
                            {columns.map((col, index) => (
                                <th
                                    key={index}
                                    scope="col"
                                    className={`px-6 py-4 font-semibold text-gray-700 ${col.className || ''}`}
                                >
                                    {col.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {data.map((row, rowIndex) => (
                            <tr
                                key={rowIndex}
                                className={`
                  hover:bg-gray-50 transition-colors 
                  ${onRowClick ? 'cursor-pointer' : ''}
                `}
                                onClick={() => onRowClick && onRowClick(row)}
                            >
                                {columns.map((col, colIndex) => (
                                    <td
                                        key={colIndex}
                                        className={`px-6 py-4 text-gray-700 ${col.className || ''}`}
                                    >
                                        {typeof col.accessor === 'function'
                                            ? col.accessor(row)
                                            : (row[col.accessor] as React.ReactNode)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
