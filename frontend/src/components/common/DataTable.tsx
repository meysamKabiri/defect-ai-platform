import type { ReactNode } from 'react'

type Column<T> = {
  key: string
  header: string
  render: (row: T) => ReactNode
}

type DataTableProps<T> = {
  columns: Column<T>[]
  rows: T[]
  emptyLabel?: string
}

export function DataTable<T>({
  columns,
  rows,
  emptyLabel = 'No records found.',
}: DataTableProps<T>) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-muted/60 text-left text-xs font-semibold uppercase text-muted-foreground">
            <tr>
              {columns.map((column) => (
                <th className="px-4 py-3" key={column.key} scope="col">
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length > 0 ? (
              rows.map((row, index) => (
                <tr className="hover:bg-muted/40" key={index}>
                  {columns.map((column) => (
                    <td className="px-4 py-3 align-middle" key={column.key}>
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-8 text-center text-muted-foreground" colSpan={columns.length}>
                  {emptyLabel}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
