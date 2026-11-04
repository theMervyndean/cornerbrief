import React from 'react';
import { CornerBriefLogo } from './CornerBriefLogo';

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading dashboard data">
      {/* Header Skeleton */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="cb-skeleton h-6 w-56 rounded-md" />
          <div className="cb-skeleton h-4 w-40 rounded-md" />
        </div>
        <div className="flex items-center gap-3">
          <div className="cb-skeleton h-9 w-28 rounded-lg" />
          <div className="cb-skeleton h-9 w-32 rounded-lg" />
        </div>
      </div>

      {/* 4 Metric Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="cb-skeleton h-3.5 w-28 rounded" />
              <div className="cb-skeleton h-4 w-4 rounded" />
            </div>
            <div className="cb-skeleton h-7 w-14 rounded-md" />
            <div className="cb-skeleton h-3 w-36 rounded" />
          </div>
        ))}
      </div>

      {/* Recent Lists Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {[0, 1].map((col) => (
          <div
            key={col}
            className="lg:col-span-6 bg-white border border-[#E2E8F0] rounded-xl overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
              <div className="space-y-1.5">
                <div className="cb-skeleton h-4 w-36 rounded" />
                <div className="cb-skeleton h-3 w-48 rounded" />
              </div>
              <div className="cb-skeleton h-3.5 w-14 rounded" />
            </div>
            <div className="divide-y divide-[#E2E8F0]">
              {[0, 1, 2, 3].map((row) => (
                <div key={row} className="px-6 py-4 flex items-center justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="cb-skeleton h-4 w-44 rounded" />
                    <div className="cb-skeleton h-3 w-32 rounded" />
                  </div>
                  <div className="cb-skeleton h-4 w-20 rounded" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const PatientTableSkeleton: React.FC = () => {
  return (
    <div className="divide-y divide-[#E2E8F0]" aria-busy="true" aria-label="Loading patient records">
      {[0, 1, 2, 3, 4].map((row) => (
        <div key={row} className="px-5 py-4 flex items-center justify-between gap-4">
          <div className="cb-skeleton h-4 w-28 rounded" />
          <div className="cb-skeleton h-4 w-36 rounded" />
          <div className="cb-skeleton h-3.5 w-20 rounded hidden sm:block" />
          <div className="cb-skeleton h-3.5 w-28 rounded hidden md:block" />
          <div className="cb-skeleton h-4 w-16 rounded" />
          <div className="cb-skeleton h-7 w-24 rounded-lg" />
        </div>
      ))}
    </div>
  );
};

export const EncounterTableSkeleton: React.FC = () => {
  return (
    <div className="divide-y divide-[#E2E8F0]" aria-busy="true" aria-label="Loading clinical encounters">
      {[0, 1, 2, 3, 4].map((row) => (
        <div key={row} className="px-5 py-4 flex items-center justify-between gap-4">
          <div className="cb-skeleton h-4 w-24 rounded" />
          <div className="space-y-1.5">
            <div className="cb-skeleton h-4 w-36 rounded" />
            <div className="cb-skeleton h-3 w-24 rounded" />
          </div>
          <div className="cb-skeleton h-3.5 w-32 rounded hidden md:block" />
          <div className="cb-skeleton h-3.5 w-44 rounded hidden lg:block" />
          <div className="cb-skeleton h-4 w-24 rounded" />
          <div className="cb-skeleton h-7 w-24 rounded-lg" />
        </div>
      ))}
    </div>
  );
};

export const PatientProfileSkeleton: React.FC = () => {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading patient profile">
      <div className="cb-skeleton h-4 w-40 rounded" />
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-2.5">
          <div className="cb-skeleton h-7 w-56 rounded-md" />
          <div className="cb-skeleton h-3.5 w-64 rounded" />
        </div>
        <div className="flex items-center gap-3">
          <div className="cb-skeleton h-9 w-28 rounded-lg" />
          <div className="cb-skeleton h-9 w-32 rounded-lg" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[0, 1, 2].map((card) => (
          <div key={card} className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-3">
            <div className="cb-skeleton h-3.5 w-32 rounded" />
            <div className="cb-skeleton h-4 w-44 rounded" />
            <div className="cb-skeleton h-4 w-36 rounded" />
            <div className="cb-skeleton h-4 w-48 rounded" />
          </div>
        ))}
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-4">
        <div className="cb-skeleton h-5 w-40 rounded" />
        {[0, 1].map((item) => (
          <div key={item} className="border border-[#E2E8F0] rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="cb-skeleton h-4 w-48 rounded" />
              <div className="cb-skeleton h-4 w-24 rounded" />
            </div>
            <div className="cb-skeleton h-4 w-full rounded" />
            <div className="cb-skeleton h-4 w-3/4 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
};

export const WorkspaceBootSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#F6F9FC] flex">
      {/* Sidebar Skeleton */}
      <div className="hidden lg:flex lg:w-64 bg-[#0B1F33] flex-col justify-between p-5 shrink-0">
        <div className="space-y-6">
          <CornerBriefLogo
            size="md"
            theme="dark"
            badge="WORKSPACE"
          />
          <div className="space-y-2 pt-2">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-9 rounded-lg bg-white/10 animate-pulse" />
            ))}
          </div>
        </div>
        <div className="h-14 rounded-lg bg-white/10 animate-pulse" />
      </div>

      {/* Main Content Skeleton */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-16 bg-white border-b border-[#E2E8F0] px-6 flex items-center justify-between">
          <div className="cb-skeleton h-4 w-48 rounded" />
          <div className="cb-skeleton h-8 w-64 rounded-lg hidden sm:block" />
          <div className="cb-skeleton h-8 w-28 rounded-lg" />
        </div>
        <div className="p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <DashboardSkeleton />
        </div>
      </div>
    </div>
  );
};
