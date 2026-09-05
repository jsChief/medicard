"use client"

import * as React from "react"
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Download, Search, Filter } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/Select"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card"

export interface Column<T> {
  key: keyof T | string
  header: string
  sortable?: boolean
  render?: (value: unknown, row: T) => React.ReactNode
  className?: string
  headerClassName?: string
  hidden?: boolean
}

export interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  keyAccessor: (row: T) => string
  searchable?: boolean
  searchPlaceholder?: string
  searchKeys?: (keyof T)[]
  filterable?: boolean
  filters?: FilterConfig<T>[]
  sortable?: boolean
  defaultSortKey?: keyof T
  defaultSortOrder?: "asc" | "desc"
  pagination?: boolean
  pageSize?: number
  pageSizeOptions?: number[]
  exportable?: boolean
  exportFilename?: string
  emptyMessage?: string
  emptyDescription?: string
  onRowClick?: (row: T) => void
  actions?: TableAction<T>[]
  className?: string
  loading?: boolean
}

export interface FilterConfig<T> {
  key: keyof T
  label: string
  options: { value: string; label: string }[]
  placeholder?: string
}

export interface TableAction<T> {
  label: string
  icon: React.ReactNode
  onClick: (row: T) => void
  variant?: "ghost" | "outline" | "primary"
  className?: string
  "aria-label"?: string
}

interface SortState {
  key: string
  order: "asc" | "desc"
}

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  keyAccessor,
  searchable = true,
  searchPlaceholder = "Search...",
  searchKeys = [],
  filterable = false,
  filters = [],
  sortable = true,
  defaultSortKey,
  defaultSortOrder = "asc",
  pagination = true,
  pageSize = 10,
  pageSizeOptions = [10, 25, 50, 100],
  exportable = false,
  exportFilename = "data.csv",
  emptyMessage = "No data found",
  emptyDescription = "Try adjusting your search or filters",
  onRowClick,
  actions,
  className,
  loading = false,
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [filterValues, setFilterValues] = React.useState<Record<string, string>>({})
  const [sortState, setSortState] = React.useState<SortState>({
    key: String(defaultSortKey || ""),
    order: defaultSortOrder,
  })
  const [currentPage, setCurrentPage] = React.useState(1)
  const [pageSizeState, setPageSizeState] = React.useState(pageSize)
  const [showFilters, setShowFilters] = React.useState(false)

  const visibleColumns = columns.filter((col) => !col.hidden)

  const filteredData = React.useMemo(() => {
    let result = [...data]

    if (searchQuery && searchable) {
      const keys = searchKeys.length > 0 ? searchKeys : (Object.keys(data[0] || {}) as (keyof T)[])
      result = result.filter((row) =>
        keys.some((key) => {
          const value = row[key]
          return String(value ?? "").toLowerCase().includes(searchQuery.toLowerCase())
        })
      )
    }

    if (filterable) {
      Object.entries(filterValues).forEach(([key, value]) => {
        if (value && value !== "All") {
          result = result.filter((row) => String(row[key] ?? "") === value)
        }
      })
    }

    if (sortable && sortState.key) {
      result.sort((a, b) => {
        const aVal = a[sortState.key]
        const bVal = b[sortState.key]
        if (aVal == null && bVal == null) return 0
        if (aVal == null) return 1
        if (bVal == null) return -1
        if (aVal < bVal) return sortState.order === "asc" ? -1 : 1
        if (aVal > bVal) return sortState.order === "asc" ? 1 : -1
        return 0
      })
    }

    return result
  }, [data, searchQuery, filterValues, sortState, searchable, filterable, searchKeys])

  const totalPages = Math.ceil(filteredData.length / pageSizeState)
  const paginatedData = pagination
    ? filteredData.slice((currentPage - 1) * pageSizeState, currentPage * pageSizeState)
    : filteredData

  const handleSort = (key: string) => {
    if (!sortable) return
    setSortState((prev) => ({
      key,
      order: prev.key === key && prev.order === "asc" ? "desc" : "asc",
    }))
    setCurrentPage(1)
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }))
    setCurrentPage(1)
  }

  const exportCSV = () => {
    const headers = visibleColumns.map((col) => col.header)
    const rows = filteredData.map((row) =>
      visibleColumns.map((col) => {
        const value = row[col.key as keyof T]
        if (col.render) {
          return String(col.render(value, row))
        }
        return String(value ?? "")
      })
    )
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = exportFilename
    a.click()
    URL.revokeObjectURL(url)
  }

  const SortIcon = sortState.order === "asc" ? ChevronUp : ChevronDown

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">{columns[0]?.header || "Data"}</h1>
          <p className="text-text-muted mt-1">Showing {filteredData.length} records</p>
        </div>
        <div className="flex items-center gap-3">
          {filterable && filters.length > 0 && (
            <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="gap-2 sm:w-auto">
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">Filters</span>
            </Button>
          )}
          {exportable && (
            <Button variant="outline" onClick={exportCSV} className="gap-2">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          )}
        </div>
      </div>

      {showFilters && filterable && filters.length > 0 && (
        <Card className="border-border/50">
          <CardContent className="p-4 pt-0">
            <div className="grid gap-4 sm:grid-cols-{Math.min(filters.length, 4)}">
              {filters.map((filter) => (
                <Select
                  key={String(filter.key)}
                  value={filterValues[String(filter.key)] || "All"}
                  onChange={(e) => handleFilterChange(String(filter.key), e.target.value)}
                  options={[{ value: "All", label: filter.placeholder || "All" }, ...filter.options]}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {searchable && (
        <div className="max-w-xs">
          <Input
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setCurrentPage(1)
            }}
          >
            <Search className="h-4 w-4 text-text-muted" slot="prefix" />
          </Input>
        </div>
      )}

      <Card>
        <CardHeader className="px-4 py-3">
          <CardTitle>{columns[0]?.header || "Records"}</CardTitle>
          <CardDescription>Showing {filteredData.length} records</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
              <p className="mt-4 text-text-muted">Loading...</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full" role="table">
                  <thead>
                    <tr className="border-b border-border bg-bg/50">
                      {visibleColumns.map((column) => (
                        <th
                          key={String(column.key)}
                          className={cn(
                            "px-4 py-3 text-left",
                            column.headerClassName
                          )}
                        >
                          {column.sortable && sortable ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-auto p-0 text-left font-semibold text-text-muted hover:text-text"
                              onClick={() => handleSort(String(column.key))}
                            >
                              {column.header}
                              {sortState.key === String(column.key) && (
                                <SortIcon className="h-4 w-4 ml-1 inline" />
                              )}
                            </Button>
                          ) : (
                            <span className="font-semibold text-text-muted">{column.header}</span>
                          )}
                        </th>
                      ))}
                      {actions && actions.length > 0 && (
                        <th className="px-4 py-3 text-right">Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {paginatedData.length === 0 ? (
                      <tr>
                        <td colSpan={visibleColumns.length + (actions ? 1 : 0)} className="px-4 py-12 text-center">
                          <div className="flex flex-col items-center gap-2 text-text-muted">
                            <Search className="h-12 w-12 text-text-muted/30" />
                            <p className="text-lg">{emptyMessage}</p>
                            <p className="text-sm">{emptyDescription}</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedData.map((row) => (
                        <tr
                          key={keyAccessor(row)}
                          className={cn(
                            "hover:bg-bg/50 transition-colors",
                            onRowClick && "cursor-pointer"
                          )}
                          onClick={() => onRowClick?.(row)}
                        >
                          {visibleColumns.map((column) => (
                            <td
                              key={String(column.key)}
                              className={cn("px-4 py-4", column.className)}
                            >
                              {column.render
                                ? column.render(row[column.key as keyof T], row)
                                : String(row[column.key as keyof T] ?? "")}
                            </td>
                          ))}
                          {actions && actions.length > 0 && (
                            <td className="px-4 py-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {actions.map((action, index) => (
                                  <Button
                                    key={index}
                                    variant={action.variant || "ghost"}
                                    size="sm"
                                    className={cn("h-8 w-8 p-0", action.className)}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      action.onClick(row)
                                    }}
                                    aria-label={action["aria-label"] || action.label}
                                  >
                                    {action.icon}
                                  </Button>
                                ))}
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {pagination && totalPages > 1 && (
                <CardFooter className="flex items-center justify-between px-4 py-3 border-t border-border">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-text-muted">
                      Showing {(currentPage - 1) * pageSizeState + 1} to {Math.min(currentPage * pageSizeState, filteredData.length)} of {filteredData.length} records
                    </span>
                    <Select
                      value={String(pageSizeState)}
                      onChange={(e) => { setPageSizeState(Number(e.target.value)); setCurrentPage(1) }}
                      options={pageSizeOptions.map((size) => ({ value: String(size), label: `${size} per page` }))}
                    >
                      <SelectTrigger className="w-auto h-8 px-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {pageSizeOptions.map((size) => (
                          <SelectItem key={size} value={String(size)}>{size} per page</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(currentPage - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="px-3 text-sm text-text-muted">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(currentPage + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardFooter>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}