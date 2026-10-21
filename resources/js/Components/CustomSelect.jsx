import React, { useState, useRef, useEffect, useMemo } from 'react';

/**
 * CustomSelect - Seamless, rock-solid dropdown component.
 * Replaces native <select> and buggy react-select throughout the application.
 * Never floats detached, never loses scroll alignment in modals, opens downwards naturally.
 */
export default function CustomSelect({
    value,
    onChange,
    children,
    options: propOptions,
    placeholder = 'Select an option...',
    className = '',
    isClearable = true,
    disabled = false,
    isDisabled = false,
    required = false,
    error = null,
    name = '',
    id = '',
}) {
    const isActuallyDisabled = disabled || isDisabled;
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [openUpward, setOpenUpward] = useState(false);

    const wrapperRef = useRef(null);
    const inputRef = useRef(null);
    const menuRef = useRef(null);

    // Parse options from either propOptions or children <option> elements
    const { options, extractedPlaceholder } = useMemo(() => {
        let opts = [];
        let pHolder = placeholder;

        if (propOptions && Array.isArray(propOptions)) {
            opts = propOptions.map(opt => {
                if (typeof opt === 'object' && opt !== null) {
                    return {
                        value: opt.value !== undefined ? opt.value : opt.id,
                        label: opt.label !== undefined ? opt.label : (opt.name || opt.title || String(opt.value)),
                        raw: opt
                    };
                }
                return { value: opt, label: String(opt), raw: opt };
            });
        } else if (children) {
            React.Children.forEach(children, child => {
                if (!child || child.type !== 'option') return;
                const cVal = child.props.value;
                if (cVal === '' || cVal == null) {
                    if (child.props.children) pHolder = child.props.children;
                } else {
                    opts.push({
                        value: cVal,
                        label: child.props.children,
                        raw: child.props
                    });
                }
            });
        }

        return { options: opts, extractedPlaceholder: pHolder };
    }, [propOptions, children, placeholder]);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(e) {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setOpen(false);
                setSearch('');
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Only open upwards if strictly necessary (very little space below, e.g. < 140px, and much more space above)
    useEffect(() => {
        if (open && wrapperRef.current) {
            const rect = wrapperRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;
            if (spaceBelow < 150 && spaceAbove > 200) {
                setOpenUpward(true);
            } else {
                setOpenUpward(false);
            }
            if (inputRef.current) {
                setTimeout(() => inputRef.current?.focus(), 50);
            }
        }
    }, [open]);

    // Find selected item
    const selected = useMemo(() => {
        if (value === '' || value === null || value === undefined) return null;
        return options.find(opt => String(opt.value) === String(value)) || null;
    }, [options, value]);

    // Filter options by search
    const filteredOptions = useMemo(() => {
        if (!search.trim()) return options;
        const q = search.toLowerCase();
        return options.filter(opt => String(opt.label).toLowerCase().includes(q));
    }, [options, search]);

    const handleSelect = (opt) => {
        const val = opt ? opt.value : '';
        const syntheticEvent = {
            target: { value: val, name: name || id },
            value: val,
            label: opt ? opt.label : '',
            option: opt,
            preventDefault: () => {},
            stopPropagation: () => {},
        };

        if (onChange) {
            onChange(syntheticEvent);
        }
        setOpen(false);
        setSearch('');
    };

    const handleClear = (e) => {
        e.stopPropagation();
        handleSelect(null);
    };

    const showSearch = options.length > 7;

    // Extract layout / sizing classes from caller className
    const containerClasses = useMemo(() => {
        const parts = className.split(/\s+/).filter(Boolean);
        const layout = parts.filter(c => 
            c.startsWith('w-') || c.startsWith('max-w-') || c.startsWith('min-w-') ||
            c.startsWith('flex') || c.startsWith('col-') || c.startsWith('m-') ||
            c.startsWith('mt-') || c.startsWith('mb-') || c.startsWith('ml-') || c.startsWith('mr-') ||
            c.startsWith('mx-') || c.startsWith('my-')
        );
        return layout.join(' ') || 'w-full';
    }, [className]);

    return (
        <div ref={wrapperRef} className={`relative ${containerClasses} z-[60]`}>
            {/* Control Trigger */}
            <div
                role="combobox"
                aria-expanded={open}
                aria-haspopup="listbox"
                tabIndex={isActuallyDisabled ? -1 : 0}
                onKeyDown={(e) => {
                    if (isActuallyDisabled) return;
                    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
                        e.preventDefault();
                        setOpen(true);
                    } else if (e.key === 'Escape') {
                        setOpen(false);
                    }
                }}
                onClick={() => {
                    if (!isActuallyDisabled) setOpen(prev => !prev);
                }}
                className={`flex w-full cursor-pointer items-center justify-between rounded-xl min-h-[42px] border px-3.5 py-2 outline-none transition-all duration-200 select-none ${
                    isActuallyDisabled
                        ? 'bg-slate-100 cursor-not-allowed opacity-70 border-slate-200 text-slate-400'
                        : open
                        ? 'bg-white border-indigo-600 ring-2 ring-indigo-600/15 shadow-sm'
                        : error
                        ? 'bg-white border-red-400 focus:ring-2 focus:ring-red-500/10 shadow-xs'
                        : 'bg-white border-slate-300 hover:border-slate-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/15 shadow-xs'
                }`}
            >
                <span className={`truncate flex-1 text-[13px] ${selected && !isActuallyDisabled ? 'text-slate-900 font-extrabold' : 'text-slate-400 font-bold'}`}>
                    {selected ? selected.label : extractedPlaceholder}
                </span>

                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {isClearable && selected && !isActuallyDisabled && (
                        <button
                            type="button"
                            onClick={handleClear}
                            aria-label="Clear selection"
                            className="h-5 w-5 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                        >
                            <i className="fa-solid fa-xmark text-[11px]"></i>
                        </button>
                    )}
                    <i className={`fa-solid fa-chevron-down text-[11px] text-slate-400 transition-transform duration-200 ${open ? 'rotate-180 text-indigo-600' : ''}`}></i>
                </div>
            </div>

            {/* Dropdown Menu - Opens downwards by default right under trigger */}
            {open && !isActuallyDisabled && (
                <div
                    ref={menuRef}
                    className={`absolute ${
                        openUpward ? 'bottom-[calc(100%+4px)]' : 'top-[calc(100%+4px)]'
                    } left-0 flex max-h-[260px] w-full flex-col overflow-hidden rounded-xl border border-slate-300 bg-white shadow-xl z-[99999] animate-[fadeIn_0.1s_ease-out]`}
                >
                    {/* Search Bar (Only shown for 8+ options) */}
                    {showSearch && (
                        <div className="border-b border-slate-200 bg-slate-50 p-2 shrink-0 relative">
                            <i className="fa-solid fa-magnifying-glass absolute left-4.5 top-1/2 -translate-y-1/2 text-slate-400 text-[11px]"></i>
                            <input
                                ref={inputRef}
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search..."
                                onKeyDown={(e) => {
                                    if (e.key === 'Escape') setOpen(false);
                                    if (e.key === 'Enter' && filteredOptions.length > 0) {
                                        e.preventDefault();
                                        handleSelect(filteredOptions[0]);
                                    }
                                }}
                                className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-7 pr-3 text-[12.5px] font-bold text-slate-900 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/20 shadow-xs"
                            />
                        </div>
                    )}

                    {/* Options List */}
                    <div className="overflow-y-auto py-1 custom-table-scroll max-h-[210px]">
                        {filteredOptions.length === 0 ? (
                            <div className="p-3 text-center text-[12.5px] text-slate-400 font-bold">
                                No matching options
                            </div>
                        ) : (
                            filteredOptions.map((opt) => {
                                const isActive = selected && String(selected.value) === String(opt.value);
                                return (
                                    <div
                                        key={String(opt.value)}
                                        onClick={() => handleSelect(opt)}
                                        className={`cursor-pointer px-3.5 py-2 text-[13px] font-bold transition-colors flex items-center justify-between border-b border-slate-50 last:border-0 ${
                                            isActive
                                                ? 'bg-indigo-600 text-white font-extrabold'
                                                : 'text-slate-800 hover:bg-indigo-50 hover:text-indigo-900'
                                        }`}
                                    >
                                        <span className="truncate flex-1">{opt.label}</span>
                                        {isActive && (
                                            <i className="fa-solid fa-check text-[11px] text-white shrink-0 ml-2"></i>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
