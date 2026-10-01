import React, { useMemo } from 'react';
import Select from 'react-select';

export default function CustomSelect({ value, onChange, children, placeholder, className, isClearable = true, disabled = false, required = false }) {
    // Extract options and placeholder from children
    const { options, extractedPlaceholder } = useMemo(() => {
        let opts = [];
        let pHolder = placeholder || 'Select...';
        
        React.Children.forEach(children, child => {
            if (!child || child.type !== 'option') return;
            
            // If option has empty value, use its text as placeholder
            if (child.props.value === '' || child.props.value == null) {
                if (!placeholder) pHolder = child.props.children;
            } else {
                opts.push({ 
                    value: child.props.value, 
                    label: child.props.children 
                });
            }
        });
        
        return { options: opts, extractedPlaceholder: pHolder };
    }, [children, placeholder]);

    const selectedOption = options.find(o => String(o.value) === String(value)) || null;

    const selectStyles = {
        control: (provided, state) => ({
            ...provided,
            minHeight: "44px",
            borderRadius: "0.75rem",
            border: state.isFocused ? "1px solid var(--accent, #6366f1)" : "1px solid #d1d5db",
            boxShadow: state.isFocused ? "0 0 0 3px rgba(99, 102, 241, 0.15)" : "none",
            "&:hover": { borderColor: state.isFocused ? "var(--accent, #6366f1)" : "#9ca3af" },
            fontSize: "14px",
            background: disabled ? "#f9fafb" : "#fff",
            cursor: disabled ? "not-allowed" : "pointer"
        }),
        option: (provided, state) => ({
            ...provided,
            fontSize: "14px",
            backgroundColor: state.isSelected ? "var(--accent, #6366f1)" : state.isFocused ? "var(--accent-bg, #e0e7ff)" : "#fff",
            color: state.isSelected ? "#fff" : "#111827",
            cursor: "pointer",
        }),
        menuPortal: base => ({ ...base, zIndex: 9999 }),
        menu: (base) => ({ ...base, borderRadius: "0.75rem", overflow: "hidden", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" }),
        singleValue: (provided) => ({ ...provided, color: disabled ? "#9ca3af" : "#111827" }),
        placeholder: (provided) => ({ ...provided, color: "#9ca3af" })
    };

    return (
        <Select
            value={selectedOption}
            onChange={(opt) => {
                // Simulate standard event object for drop-in replacement
                if (onChange) {
                    onChange({
                        target: { value: opt ? opt.value : '' },
                        preventDefault: () => {},
                        stopPropagation: () => {}
                    });
                }
            }}
            options={options}
            placeholder={extractedPlaceholder}
            isClearable={isClearable && !disabled}
            isDisabled={disabled}
            styles={selectStyles}
            className={className}
            menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
            menuPosition="fixed"
        />
    );
}

