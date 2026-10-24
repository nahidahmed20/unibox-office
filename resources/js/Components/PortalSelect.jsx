import React from 'react';
import Select from 'react-select';

export default function PortalSelect({ menuPortalTarget, menuPosition, styles, ...props }) {
    const portalTarget = typeof document !== 'undefined' ? document.body : menuPortalTarget;
    const mergedStyles = {
        ...styles,
        menuPortal: (base, state) => ({
            ...(typeof styles?.menuPortal === 'function' ? styles.menuPortal(base, state) : styles?.menuPortal),
            zIndex: 100000,
        }),
    };

    return (
        <Select
            {...props}
            styles={mergedStyles}
            menuPortalTarget={portalTarget}
            menuPosition={menuPosition || 'fixed'}
        />
    );
}
