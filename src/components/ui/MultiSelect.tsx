"use client"

import * as React from "react"
import { Check, ChevronDown, X, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/Popover"

interface Option {
  value: string
  label: string
  disabled?: boolean
}

interface MultiSelectProps {
  label?: string
  error?: string
  helperText?: string
  placeholder?: string
  options: Option[]
  value: string[]
  onChange: (value: string[]) => void
  disabled?: boolean
  searchable?: boolean
  maxSelections?: number
  className?: string
  id?: string
  name?: string
  required?: boolean
}

export function MultiSelect({
  label,
  error,
  helperText,
  placeholder = "Select options",
  options,
  value,
  onChange,
  disabled = false,
  searchable = true,
  maxSelections,
  className,
  id,
  name,
  required = false,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-") || "multiselect"
  const triggerRef = React.useRef<HTMLButtonElement>(null)

  const filteredOptions = React.useMemo(() => {
    if (!searchQuery) return options
    return options.filter((opt) =>
      opt.label.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [options, searchQuery])

  const handleToggle = (optionValue: string) => {
    if (disabled) return
    const option = options.find((o) => o.value === optionValue)
    if (option?.disabled) return

    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue))
    } else if (!maxSelections || value.length < maxSelections) {
      onChange([...value, optionValue])
    }
  }

  const handleRemove = (optionValue: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(value.filter((v) => v !== optionValue))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false)
      triggerRef.current?.focus()
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      setOpen(!open)
    }
  }

  const selectedOptions = options.filter((opt) => value.includes(opt.value))

  return (
    <div className={cn("w-full", className)}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-text mb-1.5">
          {label}
          {required && <span className="text-danger ml-1">*</span>}
        </label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            ref={triggerRef}
            type="button"
            id={inputId}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            className={cn(
              "w-full rounded-lg border border-border bg-surface px-4 py-2.5 pr-10 text-sm text-left focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors disabled:bg-bg disabled:cursor-not-allowed",
              error && "border-danger focus:border-danger focus:ring-danger/20",
              value.length > 0 ? "text-text" : "text-text-muted"
            )}
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-label={label}
            aria-required={required}
            aria-invalid={error ? "true" : "false"}
            aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          >
            <div className="flex flex-wrap gap-1.5 min-h-[1.5rem] items-center">
              {selectedOptions.map((opt) => (
                <span
                  key={opt.value}
                  className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                >
                  {opt.label}
                  <button
                    type="button"
                    onClick={(e) => handleRemove(opt.value, e)}
                    className="p-0.5 rounded hover:bg-primary/20 transition-colors"
                    aria-label={`Remove ${opt.label}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {value.length === 0 && <span className="text-text-muted">{placeholder}</span>}
            </div>
            <ChevronDown className={cn(
              "absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted transition-transform",
              open && "rotate-180"
            )} />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-full max-h-96 p-0" align="start">
          {searchable && (
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                <input
                  type="text"
                  placeholder="Search options..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full rounded-lg border border-border bg-surface px-4 py-2 pl-10 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          )}
          <div className="max-h-[300px] overflow-auto">
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-text-muted text-sm">
                {searchQuery ? "No options match your search" : "No options available"}
              </div>
            ) : (
              <ul role="listbox" aria-label={label}>
                {filteredOptions.map((option) => {
                  const isDisabled = option.disabled || (maxSelections && value.length >= maxSelections && !value.includes(option.value))
                  return (
                    <li
                      key={option.value}
                      role="option"
                      aria-selected={value.includes(option.value)}
                      aria-disabled={isDisabled ? "true" : "false"}
                    >
                      <button
                      type="button"
                      onClick={() => handleToggle(option.value)}
                      onMouseDown={(e) => e.preventDefault()}
                      disabled={!!(option.disabled || (maxSelections && value.length >= maxSelections && !value.includes(option.value)))}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors",
                        value.includes(option.value) ? "bg-primary/10 text-primary" : "text-text hover:bg-bg",
                        option.disabled && "opacity-50 cursor-not-allowed",
                        (maxSelections && value.length >= maxSelections && !value.includes(option.value)) && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <span className={cn(
                        "relative flex h-5 w-5 items-center justify-center rounded border transition-colors",
                        value.includes(option.value)
                          ? "border-primary bg-primary text-white"
                          : "border-border text-text-muted hover:border-primary"
                      )}>
                        {value.includes(option.value) && <Check className="h-3 w-3" />}
                      </span>
                      <span className="truncate">{option.label}</span>
                    </button>
                  </li>
                )
              })}
              </ul>
            )}
          </div>
          {maxSelections && value.length >= maxSelections && (
            <div className="p-3 border-t border-border text-xs text-text-muted text-center">
              Maximum of {maxSelections} selection{maxSelections > 1 ? "s" : ""} reached
            </div>
          )}
        </PopoverContent>
      </Popover>
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
      {name && (
        <input
          type="hidden"
          name={name}
          value={value.join(",")}
          readOnly
        />
      )}
    </div>
  )
}

interface TagInputProps {
  label?: string
  error?: string
  helperText?: string
  placeholder?: string
  value: string[]
  onChange: (value: string[]) => void
  suggestions?: string[]
  disabled?: boolean
  maxTags?: number
  className?: string
  id?: string
  name?: string
}

export function TagInput({
  label,
  error,
  helperText,
  placeholder = "Add tags...",
  value,
  onChange,
  suggestions = [],
  disabled = false,
  maxTags,
  className,
  id,
  name,
}: TagInputProps) {
  const [inputValue, setInputValue] = React.useState("")
  const [showSuggestions, setShowSuggestions] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-") || "taginput"

  const handleAddTag = () => {
    const tag = inputValue.trim()
    if (!tag) return
    if (value.includes(tag)) {
      setInputValue("")
      return
    }
    if (maxTags && value.length >= maxTags) return
    onChange([...value, tag])
    setInputValue("")
    setShowSuggestions(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      handleAddTag()
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      onChange(value.slice(0, -1))
    } else if (e.key === "Escape") {
      setShowSuggestions(false)
      inputRef.current?.blur()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/,/g, "")
    setInputValue(val)
    setShowSuggestions(val.length > 0)
  }

  const filteredSuggestions = suggestions
    .filter((s) => !value.includes(s))
    .filter((s) => s.toLowerCase().includes(inputValue.toLowerCase()))

  const handleSuggestionClick = (suggestion: string) => {
    if (maxTags && value.length >= maxTags) return
    onChange([...value, suggestion])
    setInputValue("")
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  const handleRemove = (tag: string) => {
    onChange(value.filter((v) => v !== tag))
  }

  return (
    <div className={cn("w-full", className)}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-text mb-1.5">
          {label}
        </label>
      )}
      <div
        className={cn(
          "flex flex-wrap gap-2 rounded-lg border bg-surface px-4 py-2.5 text-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-colors",
          disabled && "bg-bg cursor-not-allowed",
          error && "border-danger focus-within:border-danger focus-within:ring-danger/20"
        )}
        onClick={() => !disabled && inputRef.current?.focus()}
      >
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
          >
            {tag}
            {!disabled && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleRemove(tag) }}
                className="p-0.5 rounded hover:bg-primary/20 transition-colors"
                aria-label={`Remove ${tag}`}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          id={inputId}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder={value.length === 0 ? placeholder : ""}
          disabled={!!(disabled || (maxTags && value.length >= maxTags))}
          className="flex-1 min-w-[80px] bg-transparent border-none outline-none text-sm text-text placeholder:text-text-muted"
          aria-label={label}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
        />
      </div>
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-40 overflow-auto rounded-lg border border-border bg-surface shadow-lg">
          <ul>
            {filteredSuggestions.map((suggestion) => (
              <li key={suggestion}>
                <button
                  type="button"
                  onClick={() => handleSuggestionClick(suggestion)}
                  onMouseDown={(e) => e.preventDefault()}
                  className="w-full px-4 py-2 text-left text-sm text-text hover:bg-bg transition-colors"
                >
                  {suggestion}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
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
      {name && (
        <input
          type="hidden"
          name={name}
          value={value.join(",")}
          readOnly
        />
      )}
    </div>
  )
}