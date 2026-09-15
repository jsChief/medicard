"use client"

import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { format, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameDay, isSameMonth, isBefore, isAfter, isWithinInterval } from "date-fns"

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

interface DatePickerProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  label?: string
  error?: string
  helperText?: string
  placeholder?: string
  value?: Date | string | null
  onChange?: (date: Date | null) => void
  minDate?: Date
  maxDate?: Date
  disabled?: boolean
  showTime?: boolean
  className?: string
  id?: string
}

export function DatePicker({
  label,
  error,
  helperText,
  placeholder = "Select date",
  value,
  onChange,
  minDate,
  maxDate,
  disabled = false,
  showTime = false,
  className,
  id,
  ...props
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [displayMonth, setDisplayMonth] = React.useState(() => value ? new Date(value) : new Date())
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-") || "datepicker"
  const selectedDate = value ? new Date(value) : null

  const handleDayClick = (day: Date) => {
    if (disabled) return
    if (minDate && isBefore(day, startOfDay(minDate))) return
    if (maxDate && isAfter(day, endOfDay(maxDate))) return
    handleSelect(day)
    setOpen(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateStr = e.target.value
    if (!dateStr) {
      onChange?.(null)
      return
    }
    try {
      const date = parseISO(dateStr)
      if (!isNaN(date.getTime())) {
        onChange?.(date)
      }
    } catch {
      // Invalid date, ignore
    }
  }

  const handleSelect = (date: Date) => {
    onChange?.(date)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      setOpen(!open)
    } else if (e.key === "Escape") {
      setOpen(false)
    }
  }

  const daysInMonth = React.useMemo(() => {
    const start = startOfWeek(startOfMonth(displayMonth))
    const end = endOfWeek(endOfMonth(displayMonth))
    const days: Date[] = []
    let current = start
    while (isBefore(current, end) || isSameDay(current, end)) {
      days.push(current)
      current = addDays(current, 1)
    }
    return days
  }, [displayMonth])

  const prevMonth = () => setDisplayMonth(subMonths(displayMonth, 1))
  const nextMonth = () => setDisplayMonth(addMonths(displayMonth, 1))

  const today = new Date()

  return (
    <div className={cn("w-full", className)}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-text mb-1.5">
          {label}
        </label>
      )}
      <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
        <PopoverPrimitive.Trigger asChild>
          <Input
            id={inputId}
            placeholder={placeholder}
            value={selectedDate ? format(selectedDate, "yyyy-MM-dd") : ""}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onClick={() => !disabled && setOpen(true)}
            readOnly
            disabled={disabled}
            error={error}
            helperText={helperText}
            className={cn("cursor-pointer", className)}
            {...props}
          >
            <Calendar className="h-4 w-4 text-text-muted" slot="prefix" />
          </Input>
        </PopoverPrimitive.Trigger>
        <PopoverPrimitive.Content
          className="w-auto p-0 bg-surface border border-border shadow-lg rounded-lg"
          sideOffset={5}
          align="start"
        >
          <div className="p-3">
            <div className="flex items-center justify-between mb-3">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={prevMonth}
                disabled={minDate && isBefore(startOfMonth(subMonths(displayMonth, 1)), startOfMonth(minDate))}
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-medium text-text">{format(displayMonth, "MMMM yyyy")}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={nextMonth}
                disabled={maxDate && isAfter(startOfMonth(addMonths(displayMonth, 1)), startOfMonth(maxDate))}
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-7 gap-0.5 text-center text-sm">
              {DAYS.map((day) => (
                <div key={day} className="text-text-muted font-medium py-1">
                  {day}
                </div>
              ))}
              {daysInMonth.map((day) => {
                const isCurrentMonth = isSameMonth(day, displayMonth)
                const isSelected = selectedDate && isSameDay(day, selectedDate)
                const isToday = isSameDay(day, today)
                const isDisabled = disabled ||
                  (minDate && isBefore(day, startOfDay(minDate))) ||
                  (maxDate && isAfter(day, endOfDay(maxDate)))

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => handleDayClick(day)}
                    disabled={isDisabled}
                    className={cn(
                      "h-9 w-9 rounded-lg text-sm font-medium transition-colors relative",
                      !isCurrentMonth && "text-text-muted/50",
                      isSelected && "bg-primary text-white",
                      !isSelected && isToday && "bg-primary/10 text-primary font-bold",
                      !isSelected && !isToday && "hover:bg-bg text-text",
                      isDisabled && "opacity-50 cursor-not-allowed"
                    )}
                    aria-selected={isSelected ? "true" : "false"}
                    aria-current={isToday ? "date" : undefined}
                    aria-disabled={isDisabled ? "true" : "false"}
                  >
                    {format(day, "d")}
                  </button>
                )
              })}
            </div>
            {showTime && (
              <div className="mt-3 pt-3 border-t border-border">
                <TimePicker
                  value={selectedDate}
                  onChange={onChange}
                  onClose={() => setOpen(false)}
                />
              </div>
            )}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Root>
      {error && (
        <p id={`${inputId}-error`} className="mt-1.5 text-sm text-danger" role="alert">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={`${inputId}-helper`} className="mt-1.5 text-sm text-text-muted">
          {helperText}
        </p>
      )}
    </div>
  )
}

function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

interface TimePickerProps {
  value: Date | null
  onChange?: (date: Date | null) => void
  onClose: () => void
}

function TimePicker({ value, onChange, onClose }: TimePickerProps) {
  const [hours, setHours] = React.useState(() => value?.getHours() || 0)
  const [minutes, setMinutes] = React.useState(() => value?.getMinutes() || 0)
  const [period, setPeriod] = React.useState<"AM" | "PM">(() => (value?.getHours() || 0) >= 12 ? "PM" : "AM")

  React.useEffect(() => {
    if (value) {
      setHours(value.getHours() % 12 || 12)
      setMinutes(value.getMinutes())
      setPeriod(value.getHours() >= 12 ? "PM" : "AM")
    }
  }, [value])

  const handleApply = () => {
    let hour24 = hours % 12
    if (period === "PM") hour24 += 12
    const date = value ? new Date(value) : new Date()
    date.setHours(hour24, minutes, 0, 0)
    onChange?.(date)
    onClose()
  }

  const handleNow = () => {
    const now = new Date()
    onChange?.(now)
    onClose()
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={hours}
        onChange={(e) => setHours(Number(e.target.value))}
        className="w-16 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
      >
        {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
          <option key={h} value={h}>{h.toString().padStart(2, "0")}</option>
        ))}
      </select>
      <span className="text-text-muted">:</span>
      <select
        value={minutes}
        onChange={(e) => setMinutes(Number(e.target.value))}
        className="w-16 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
      >
        {Array.from({ length: 60 }, (_, i) => i).map((m) => (
          <option key={m} value={m}>{m.toString().padStart(2, "0")}</option>
        ))}
      </select>
      <select
        value={period}
        onChange={(e) => setPeriod(e.target.value as "AM" | "PM")}
        className="w-20 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
      >
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
      <Button variant="outline" size="sm" className="ml-auto" onClick={handleNow}>
        Now
      </Button>
      <Button size="sm" className="ml-1" onClick={handleApply}>
        Apply
      </Button>
    </div>
  )
}

export function DateRangePicker({
  label,
  error,
  helperText,
  placeholder = "Select date range",
  value,
  onChange,
  minDate,
  maxDate,
  disabled = false,
  className,
  id,
}: Omit<DatePickerProps, "value" | "onChange"> & {
  value?: { from: Date | null; to: Date | null }
  onChange?: (range: { from: Date | null; to: Date | null }) => void
}) {
  const [open, setOpen] = React.useState(false)
  const [displayMonth, setDisplayMonth] = React.useState(() => value?.from ? new Date(value.from) : new Date())
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-") || "daterangepicker"

  const fromDate = value?.from ? new Date(value.from) : null
  const toDate = value?.to ? new Date(value.to) : null

  const handleDayClick = (day: Date) => {
    if (disabled) return
    if (minDate && isBefore(day, startOfDay(minDate))) return
    if (maxDate && isAfter(day, endOfDay(maxDate))) return

    if (!fromDate || (fromDate && toDate)) {
      onChange?.({ from: day, to: null })
    } else if (isBefore(day, fromDate)) {
      onChange?.({ from: day, to: fromDate })
    } else {
      onChange?.({ from: fromDate, to: day })
    }
    setOpen(false)
  }

  const isInRange = (day: Date) => {
    if (!fromDate || !toDate) return false
    return isWithinInterval(day, { start: startOfDay(fromDate), end: endOfDay(toDate) })
  }

  const isRangeStart = (day: Date) => fromDate && isSameDay(day, fromDate)
  const isRangeEnd = (day: Date) => toDate && isSameDay(day, toDate)

  const daysInMonth = React.useMemo(() => {
    const start = startOfWeek(startOfMonth(displayMonth))
    const end = endOfWeek(endOfMonth(displayMonth))
    const days: Date[] = []
    let current = start
    while (isBefore(current, end) || isSameDay(current, end)) {
      days.push(current)
      current = addDays(current, 1)
    }
    return days
  }, [displayMonth])

  const prevMonth = () => setDisplayMonth(subMonths(displayMonth, 1))
  const nextMonth = () => setDisplayMonth(addMonths(displayMonth, 1))

  const today = new Date()

  return (
    <div className={cn("w-full", className)}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-text mb-1.5">
          {label}
        </label>
      )}
      <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
        <PopoverPrimitive.Trigger asChild>
          <Input
            id={inputId}
            placeholder={placeholder}
            value={
              fromDate && toDate
                ? `${format(fromDate, "yyyy-MM-dd")} - ${format(toDate, "yyyy-MM-dd")}`
                : fromDate
                ? format(fromDate, "yyyy-MM-dd")
                : ""
            }
            onClick={() => !disabled && setOpen(true)}
            readOnly
            disabled={disabled}
            error={error}
            helperText={helperText}
            className={cn("cursor-pointer", className)}
          >
            <Calendar className="h-4 w-4 text-text-muted" slot="prefix" />
          </Input>
        </PopoverPrimitive.Trigger>
        <PopoverPrimitive.Content
          className="w-auto p-0 bg-surface border border-border shadow-lg rounded-lg"
          sideOffset={5}
          align="start"
        >
          <div className="p-3">
            <div className="flex items-center justify-between mb-3">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={prevMonth}
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-medium text-text">{format(displayMonth, "MMMM yyyy")}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={nextMonth}
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-7 gap-0.5 text-center text-sm">
              {DAYS.map((day) => (
                <div key={day} className="text-text-muted font-medium py-1">
                  {day}
                </div>
              ))}
              {daysInMonth.map((day) => {
                const isCurrentMonth = isSameMonth(day, displayMonth)
                const isSelected = isRangeStart(day) || isRangeEnd(day)
                const inRange = isInRange(day)
                const isToday = isSameDay(day, today)
                const isDisabled = disabled ||
                  (minDate && isBefore(day, startOfDay(minDate))) ||
                  (maxDate && isAfter(day, endOfDay(maxDate)))

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => handleDayClick(day)}
                    disabled={isDisabled}
                    className={cn(
                      "h-9 w-9 rounded-lg text-sm font-medium transition-colors relative",
                      !isCurrentMonth && "text-text-muted/50",
                      isSelected && "bg-primary text-white",
                      inRange && !isSelected && "bg-primary/10 text-primary",
                      !isSelected && !inRange && isToday && "bg-primary/10 text-primary font-bold",
                      !isSelected && !inRange && !isToday && "hover:bg-bg text-text",
                      isDisabled && "opacity-50 cursor-not-allowed",
                      isRangeStart(day) && "rounded-r-none",
                      isRangeEnd(day) && "rounded-l-none",
                      inRange && !isSelected && !isRangeStart(day) && !isRangeEnd(day) && "rounded-none"
                    )}
                    aria-selected={isSelected ? "true" : "false"}
                    aria-current={isToday ? "date" : undefined}
                    aria-disabled={isDisabled ? "true" : "false"}
                  >
                    {format(day, "d")}
                  </button>
                )
              })}
            </div>
            <div className="mt-3 pt-3 border-t border-border flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => onChange?.({ from: null, to: null })} disabled={disabled}>
                Clear
              </Button>
              <Button size="sm" className="flex-1" onClick={() => setOpen(false)} disabled={!fromDate || !toDate || disabled}>
                Apply
              </Button>
            </div>
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Root>
      {error && (
        <p id={`${inputId}-error`} className="mt-1.5 text-sm text-danger" role="alert">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={`${inputId}-helper`} className="mt-1.5 text-sm text-text-muted">
          {helperText}
        </p>
      )}
    </div>
  )
}