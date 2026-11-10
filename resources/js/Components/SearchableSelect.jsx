import React from 'react';
import CustomSelect from '@/Components/CustomSelect';

/** Adapter for the older value-based searchable select API. */
export default function SearchableSelect({
    options = [],
    value,
    onChange,
    getLabel,
    getValue,
    renderOption,
    isClearable = false,
    ...props
}) {
    return (
        <CustomSelect
            {...props}
            options={options}
            value={value}
            getOptionLabel={getLabel}
            getOptionValue={getValue}
            renderOption={renderOption}
            isClearable={isClearable}
            onChange={(event) => onChange?.(event.target.value)}
        />
    );
}
