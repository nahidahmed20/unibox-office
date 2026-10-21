import { Link } from '@inertiajs/react';

export default function Guest({ children }) {
    return (
        <div className="unibox-wrapper">
            <div className="unibox-card">
                {children}
            </div>
            
            <div className="unibox-footer">
                &copy; {new Date().getFullYear()} Unibox. All rights reserved.
            </div>
        </div>
    );
}