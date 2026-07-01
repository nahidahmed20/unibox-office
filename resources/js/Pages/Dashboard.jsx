import React from 'react';
import AdminLayout from '@/Layouts/AdminLayout'; // Layout ইম্পোর্ট করা হলো
import { Head } from '@inertiajs/react';

export default function Dashboard() {
    // সাইডবার বা মেনুর স্টেটগুলো এখন আর এখানে লাগবে না, কারণ সেগুলো Layout-এ আছে।

    return (
        <AdminLayout>
            <Head title="Dashboard Overview" />

            {/* শুধু ড্যাশবোর্ডের ভেতরের কন্টেন্টটুকু এখানে থাকবে */}
            <div>
                <h1 className="text-2xl font-semibold mb-6">Dashboard Overview</h1>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {/* Stats Card 1 */}
                    <div className="bg-white p-6 rounded-lg border shadow-sm">
                        <h3 className="text-sm text-gray-500 uppercase font-medium">System Users</h3>
                        <p className="text-3xl font-bold mt-2 text-[#202223]">12 <span className="text-sm font-normal text-gray-500">Active</span></p>
                    </div>

                    {/* Stats Card 2 */}
                    <div className="bg-white p-6 rounded-lg border shadow-sm">
                        <h3 className="text-sm text-gray-500 uppercase font-medium">Total Roles</h3>
                        <p className="text-3xl font-bold mt-2 text-[#202223]">4</p>
                    </div>

                    {/* Stats Card 3 */}
                    <div className="bg-white p-6 rounded-lg border shadow-sm">
                        <h3 className="text-sm text-gray-500 uppercase font-medium">System Status</h3>
                        <p className="text-3xl font-bold mt-2 text-[#008060]">Online</p>
                    </div>
                </div>
            </div>
            
        </AdminLayout>
    );
}