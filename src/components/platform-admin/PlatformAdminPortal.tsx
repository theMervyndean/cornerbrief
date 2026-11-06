import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Activity,
  Bell,
  Building2,
  FileCheck,
  LayoutDashboard,
  LogOut,
  Menu,
  Server,
  Shield,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { CornerBriefLogo } from '../CornerBriefLogo';
import { PlatformAdminLogin } from './PlatformAdminLogin';
import { PlatformAdminOverview } from './PlatformAdminOverview';
import { PlatformAdminFacilities } from './PlatformAdminFacilities';
import { PlatformAdminRegistrations } from './PlatformAdminRegistrations';
import { PlatformAdminStaff } from './PlatformAdminStaff';
import { PlatformAdminActivity } from './PlatformAdminActivity';
import { PlatformAdminSystem } from './PlatformAdminSystem';
import { PlatformAdminNotifications } from './PlatformAdminNotifications';

export interface AdminUser {
  uid: string;
  email: string;
  name: string;
  role: string;
  isPlatformAdmin: boolean;
}

export const PlatformAdminPortal: React.FC = () => {
  const [currentPath, setCurrentPath] = useState<string>(window.location.pathname);
  const [token, setToken] = useState<string | null>(
    localStorage.getItem('cornerbrief_platform_admin_token')
  );
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Platform Metrics state for Overview
  const [overviewStats, setOverviewStats] = useState<any>({
    totalFacilities: 0,
    pendingFacilities: 0,
    activeFacilities: 0,
    rejectedFacilities: 0,
    suspendedFacilities: 0,
    totalStaffMemberships: 0,
    activeStaffMemberships: 0,
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [systemStatus, setSystemStatus] = useState<any>({
    apiAvailable: true,
    persistenceStatus: 'IAM_RESTRICTED',
    firestoreDatabaseId: '(default)',
    serverRegistryActive: true,
  });
  const [allFacilities, setAllFacilities] = useState<any[]>([]);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState<boolean>(false);

  // Navigate helper that updates URL and internal state
  const navigateTo = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    setIsMobileMenuOpen(false);
  };

  // Sync with browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Verify stored token or redirect to login
  const verifyToken = async (existingToken: string) => {
    setIsVerifying(true);
    try {
      const res = await fetch('/api/platform-admin/verify', {
        headers: {
          Authorization: `Bearer ${existingToken}`,
          Accept: 'application/json',
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.admin) {
          setAdminUser(data.admin);
          setToken(existingToken);
          // If user was on /platform-admin/login, redirect to /platform-admin
          if (window.location.pathname === '/platform-admin/login') {
            navigateTo('/platform-admin');
          }
          return;
        }
      }
      // If verification failed
      localStorage.removeItem('cornerbrief_platform_admin_token');
      setToken(null);
      setAdminUser(null);
    } catch {
      localStorage.removeItem('cornerbrief_platform_admin_token');
      setToken(null);
      setAdminUser(null);
    } finally {
      setIsVerifying(false);
    }
  };

  useEffect(() => {
    if (token) {
      verifyToken(token);
    } else {
      setIsVerifying(false);
    }
  }, []);

  // Fetch central platform overview & facilities when logged in
  const fetchOverviewMetrics = async () => {
    if (!token) return;
    setIsLoadingMetrics(true);
    try {
      const [overviewRes, facilitiesRes] = await Promise.all([
        fetch('/api/platform-admin/overview', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/platform-admin/facilities', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (overviewRes.ok) {
        const oData = await overviewRes.json();
        if (oData.stats) setOverviewStats(oData.stats);
        if (oData.recentActivity) setRecentActivity(oData.recentActivity);
        if (oData.systemStatus) setSystemStatus(oData.systemStatus);
      }

      if (facilitiesRes.ok) {
        const fData = await facilitiesRes.json();
        if (fData.facilities) setAllFacilities(fData.facilities);
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingMetrics(false);
    }
  };

  useEffect(() => {
    if (adminUser && token) {
      fetchOverviewMetrics();
    }
  }, [adminUser, token]);

  const handleLoginSuccess = (newToken: string, user: AdminUser) => {
    setToken(newToken);
    setAdminUser(user);
    navigateTo('/platform-admin');
  };

  const handleLogout = async () => {
    if (token) {
      try {
        await fetch('/api/platform-admin/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // ignore
      }
    }
    localStorage.removeItem('cornerbrief_platform_admin_token');
    setToken(null);
    setAdminUser(null);
    navigateTo('/platform-admin/login');
  };

  // If loading session verification
  if (isVerifying) {
    return (
      <div className="min-h-screen bg-[#07131F] flex flex-col items-center justify-center text-slate-300">
        <div className="w-10 h-10 border-2 border-[#1769E0] border-t-transparent rounded-full animate-spin mb-4" />
        <span className="text-xs font-mono tracking-widest text-[#3B82F6] uppercase">
          Verifying Platform Authorization...
        </span>
      </div>
    );
  }

  // If unauthenticated or on /platform-admin/login
  if (!token || !adminUser || currentPath === '/platform-admin/login') {
    return (
      <PlatformAdminLogin
        onLoginSuccess={handleLoginSuccess}
        onNavigateHome={() => {
          window.location.href = '/';
        }}
      />
    );
  }

  // Navigation Items
  const navTabs = [
    {
      id: '/platform-admin',
      label: 'Overview',
      icon: LayoutDashboard,
    },
    {
      id: '/platform-admin/facility-registrations',
      label: 'Registrations',
      icon: FileCheck,
      badge: overviewStats.pendingFacilities > 0 ? overviewStats.pendingFacilities : undefined,
    },
    {
      id: '/platform-admin/facilities',
      label: 'Hospital Directory',
      icon: Building2,
    },
    {
      id: '/platform-admin/staff',
      label: 'Staff Directory',
      icon: Users,
    },
    {
      id: '/platform-admin/activity',
      label: 'Audit Events',
      icon: Activity,
    },
    {
      id: '/platform-admin/notifications',
      label: 'Notifications Hub',
      icon: Bell,
    },
    {
      id: '/platform-admin/system',
      label: 'System Diagnostics',
      icon: Server,
    },
  ];

  // Determine active view component
  const renderCurrentView = () => {
    if (currentPath === '/platform-admin/facility-registrations') {
      return (
        <PlatformAdminRegistrations
          token={token}
          onRefreshParent={fetchOverviewMetrics}
        />
      );
    }
    if (currentPath === '/platform-admin/facilities') {
      return (
        <PlatformAdminFacilities
          facilities={allFacilities}
          onRefresh={fetchOverviewMetrics}
          isLoading={isLoadingMetrics}
          token={token}
        />
      );
    }
    if (currentPath === '/platform-admin/staff') {
      return <PlatformAdminStaff token={token} />;
    }
    if (currentPath === '/platform-admin/activity') {
      return <PlatformAdminActivity token={token} />;
    }
    if (currentPath === '/platform-admin/notifications') {
      return <PlatformAdminNotifications token={token} />;
    }
    if (currentPath === '/platform-admin/system') {
      return <PlatformAdminSystem token={token} />;
    }
    // Default: /platform-admin Overview
    return (
      <PlatformAdminOverview
        stats={overviewStats}
        recentActivity={recentActivity}
        systemStatus={systemStatus}
        onNavigateTab={(tab) => navigateTo(tab)}
        onRefresh={fetchOverviewMetrics}
        isLoading={isLoadingMetrics}
      />
    );
  };

  return (
    <div className="min-h-screen bg-[#07131F] text-slate-100 flex flex-col font-sans">
      {/* Top Administrative Bar */}
      <header className="h-16 bg-[#0B1F33] border-b border-slate-700/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((o) => !o)}
            className="lg:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            aria-label="Toggle navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div
            onClick={() => navigateTo('/platform-admin')}
            className="cursor-pointer flex items-center gap-2"
          >
            <CornerBriefLogo size="sm" theme="dark" badge="PLATFORM ADMIN" />
          </div>
        </div>

        {/* Right context: Admin Profile & Actions */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-semibold text-white">{adminUser.name}</span>
            <span className="text-[10px] font-mono text-emerald-400">{adminUser.email}</span>
          </div>

          <div className="h-6 w-px bg-slate-700 hidden sm:block" />

          <button
            type="button"
            onClick={() => {
              window.location.href = '/';
            }}
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700 transition-colors"
          >
            <span>Exit to Public Website</span>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-rose-300 hover:text-white bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Administrative Layout with Sidebar */}
      <div className="flex-1 flex min-w-0">
        {/* Desktop Sidebar Navigation */}
        <aside className="hidden lg:flex flex-col w-64 bg-[#0B1F33]/80 border-r border-slate-800/80 p-4 space-y-1 shrink-0">
          <div className="px-3 py-2 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
            Platform Management
          </div>

          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive =
              currentPath === tab.id ||
              (tab.id === '/platform-admin' &&
                (currentPath === '/platform-admin/' || currentPath === '/platform-admin'));

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => navigateTo(tab.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[#1769E0] text-white font-semibold shadow-md shadow-[#1769E0]/20'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </div>
                {tab.badge !== undefined && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-[#07131F]">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}

          <div className="pt-6 mt-auto">
            <div className="p-3 bg-[#07131F] rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-xs">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Encrypted Session</span>
              </div>
              <p className="text-[10px] text-slate-500 leading-normal">
                HMAC-SHA256 signed. Role isolation enforced on all endpoints.
              </p>
            </div>
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <motion.aside
                initial={{ x: -260 }}
                animate={{ x: 0 }}
                exit={{ x: -260 }}
                transition={{ duration: 0.2 }}
                className="relative w-64 max-w-[80vw] h-full bg-[#0B1F33] p-4 flex flex-col space-y-1 shadow-2xl"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Platform Menu
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {navTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = currentPath === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => navigateTo(tab.id)}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium ${
                        isActive
                          ? 'bg-[#1769E0] text-white font-semibold'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4" />
                        <span>{tab.label}</span>
                      </div>
                      {tab.badge !== undefined && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-[#07131F]">
                          {tab.badge}
                        </span>
                      )}
                    </button>
                  );
                })}

                <div className="pt-4 border-t border-slate-800 mt-auto">
                  <button
                    type="button"
                    onClick={() => {
                      window.location.href = '/';
                    }}
                    className="w-full text-center py-2 text-xs text-slate-300 hover:text-white bg-slate-800 rounded-lg"
                  >
                    Exit to Public Website
                  </button>
                </div>
              </motion.aside>
            </div>
          )}
        </AnimatePresence>

        {/* Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
          {renderCurrentView()}
        </main>
      </div>
    </div>
  );
};
