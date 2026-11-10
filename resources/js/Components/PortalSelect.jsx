import React from 'react';
import CustomSelect from '@/Components/CustomSelect';

/**
 * Select2-style adapter for the react-select API used across existing pages.
 * All searchable dropdowns now use the same control and menu implementation.
 */
export default function PortalSelect({ value, onChange, options = [], isClearable, isDisabled, ...props }) {
    const selectedValue = value && typeof value === 'object'
        ? (value.value ?? value.id ?? '')
        : (value ?? '');

    return (
        <CustomSelect
            {...props}
            options={options}
            value={selectedValue}
            isClearable={isClearable ?? false}
            isDisabled={isDisabled}
            onChange={(event) => {
                if (!onChange) return;
                const option = event.option?.raw ?? null;
                onChange(option);
            }}
        />
    );
}
