import React, { useState } from 'react';
import { Link, usePage, Head } from '@inertiajs/react';

export default function AdminLayout({ children }) {
    const { auth, flash = {} } = usePage().props;
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [profileDropdown, setProfileDropdown] = useState(false);
    
    const [openMenus, setOpenMenus] = useState({
        expenses: false,
        access: true 
    });

    const toggleMenu = (menuName) => {
        setOpenMenus(prev => ({ ...prev, [menuName]: !prev[menuName] }));
    };

    return (
        <div className="flex min-h-screen bg-[#f6f6f7] text-[#202223]  antialiased">
            
            {/* Sidebar */}
            <nav className={`w-[260px] bg-[#010e22] text-[#e3e4e5] min-h-screen fixed z-50 transition-all duration-300 ${isSidebarOpen ? 'left-0' : '-left-[260px] md:left-0'}`}>
                <div className="p-[24px_20px] bg-[#010e22] text-[18px] font-semibold tracking-[0.5px] border-b border-[#2f3133] flex justify-between items-center">
                    <span><i className="fa-brands fa-shopify text-[#008060] me-2"></i> Office Admin</span>
                    <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-400 hover:text-white">
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>
                
                <ul className="list-none p-0 m-0 mt-3 space-y-1">
                    <div className="text-[11px] uppercase tracking-[1px] text-[#8c9196] px-[25px] pt-[15px] pb-[5px] font-semibold">Main</div>
                    
                    <li className="mx-3">
                        <Link href={route('dashboard')} className={`flex items-center px-5 py-2.5 text-[14px] rounded-md font-medium ${route().current('dashboard') ? 'bg-[#008060] text-white' : 'text-[#b5b9bc] hover:text-white hover:bg-white/5'}`}>
                            <i className="fa-solid fa-chart-bar w-5 text-center mr-3 opacity-90"></i> Dashboard
                        </Link>
                    </li>

                    {/* Expenses Menu */}
                    <li className="mx-3">
                        <button onClick={() => toggleMenu('expenses')} className="w-full flex items-center px-5 py-2.5 text-[14px] text-[#b5b9bc] hover:text-white hover:bg-white/5 rounded-md font-medium transition-colors">
                            <i className="fa-solid fa-credit-card w-5 text-center mr-3 opacity-80"></i> Office Expenses
                            <i className={`fa-solid fa-chevron-right ml-auto text-[11px] transition-transform duration-200 ${openMenus.expenses ? 'rotate-90' : ''}`}></i>
                        </button>
                        {openMenus.expenses && (
                            <ul className="list-none p-0 mt-1 mb-2 bg-[#021528] rounded-md py-1">
                                <li><Link href="#" className="flex items-center pl-11 py-2 text-[13px] text-[#a1a5a8] hover:text-white">All Expenses</Link></li>
                                <li><Link href="#" className="flex items-center pl-11 py-2 text-[13px] text-[#a1a5a8] hover:text-white">Add Expense</Link></li>
                            </ul>
                        )}
                    </li>

                    {/* Security - Access Control */}
                    <div className="text-[11px] uppercase tracking-[1px] text-[#8c9196] px-[25px] pt-[15px] pb-[5px] font-semibold">System Security</div>
                    <li className="mx-3">
                        <button onClick={() => toggleMenu('access')} className="w-full flex items-center px-5 py-2.5 text-[14px] text-[#b5b9bc] hover:text-white hover:bg-white/5 rounded-md font-medium transition-colors">
                            <i className="fa-solid fa-user-shield w-5 text-center mr-3 opacity-80"></i> Access Control
                            <i className={`fa-solid fa-chevron-right ml-auto text-[11px] transition-transform duration-200 ${openMenus.access ? 'rotate-90' : ''}`}></i>
                        </button>
                        {openMenus.access && (
                            <ul className="list-none p-0 mt-1 mb-2 bg-[#021528] rounded-md py-1">
                                <li>
                                    <Link href={route('admin.users.index')} className={`flex items-center pl-11 py-2 text-[13px] hover:text-white ${route().current('admin.users.*') ? 'text-white font-bold' : 'text-[#a1a5a8]'}`}>
                                        <i className="fa-solid fa-users mr-2 text-[8px]"></i> Manage Users
                                    </Link>
                                </li>
                                <li>
                                    <Link href={route('admin.roles.index')} className={`flex items-center pl-11 py-2 text-[13px] hover:text-white ${route().current('admin.roles.*') ? 'text-white font-bold' : 'text-[#a1a5a8]'}`}>
                                        <i className="fa-solid fa-user-tag mr-2 text-[8px]"></i> User Roles
                                    </Link>
                                </li>
                                <li>
                                    <Link href={route('admin.permissions.index')} className={`flex items-center pl-11 py-2 text-[13px] hover:text-white ${route().current('admin.permissions.*') ? 'text-white font-bold' : 'text-[#a1a5a8]'}`}>
                                        <i className="fa-solid fa-key mr-2 text-[8px]"></i> Permissions
                                    </Link>
                                </li>
                            </ul>
                        )}
                    </li>

                    <li className="mx-3 mt-2">
                        <Link href="#" className="flex items-center px-5 py-2.5 text-[14px] text-[#b5b9bc] hover:text-white hover:bg-white/5 rounded-md font-medium transition-colors">
                            <i className="fa-solid fa-sliders w-5 text-center mr-3 opacity-80"></i> Settings
                        </Link>
                    </li>
                </ul>
            </nav>

            {/* Main Content Area */}
            <div className="flex-1 md:pl-[260px] w-full transition-all duration-300">
                
                {/* Navbar */}
                <div className="bg-white border-b border-[#e1e3e5] px-6 py-3 flex items-center justify-between sticky top-0 z-30">
                    <button onClick={() => setIsSidebarOpen(true)} className="p-1.5 bg-gray-50 border border-[#e1e3e5] rounded-md md:hidden text-gray-700">
                        <i className="fa-solid fa-bars"></i>
                    </button>
                    
                    <div className="text-gray-500 text-[14px]">Admin Portal</div>

                    <div className="relative">
                        <button onClick={() => setProfileDropdown(!profileDropdown)} className="flex items-center px-3 py-1.5 bg-gray-50 border border-[#e1e3e5] rounded-md hover:bg-gray-100 transition-colors">
                            <i className="fa-regular fa-circle-user text-lg mr-2 text-gray-500"></i>
                            <span className="font-medium text-[14px] text-gray-800">{auth?.user?.name || "User"}</span>
                        </button>
                        
                        {profileDropdown && (
                            <div className="absolute right-0 mt-2 w-[190px] bg-white border border-[#e1e3e5] rounded-lg shadow-lg p-1.5 z-50">
                                <Link href="#" className="flex items-center px-3 py-2 text-[13.5px] font-medium rounded-md text-[#202223] hover:bg-[#f6f6f7]">
                                    <i className="fa-regular fa-user w-5 text-gray-500 mr-2"></i> My Profile
                                </Link>
                                <div className="my-1.5 border-t border-[#e1e3e5]"></div>
            
                                <Link href={route('logout')} method="post" as="button" className="w-full flex items-center px-3 py-2 text-[13.5px] font-medium rounded-md text-red-600 hover:bg-[#f6f6f7]">
                                    <i className="fa-solid fa-arrow-right-from-bracket w-5 mr-2"></i> Log out
                                </Link>
                            </div>
                        )}
                    </div>
                </div>

                {/* Content Container */}
                <div className="">

                    {children}
                </div>
            </div>
        </div>
    );
}