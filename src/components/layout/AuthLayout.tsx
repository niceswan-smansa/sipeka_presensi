'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

interface AuthLayoutProps {
  children: React.ReactNode;
  userName?: string;
  title?: string;
}

export default function AuthLayout({
  children,
  userName,
  title = 'Dashboard',
}: AuthLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main content area */}
      <div className="flex flex-col flex-1 lg:ml-64">
        {/* Header */}
        <Header
          title={title}
          userName={userName}
          onMenuClick={() => setSidebarOpen((prev) => !prev)}
        />

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
