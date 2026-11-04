import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  CheckCircle2,
  Clock,
  FileCheck,
  FileEdit,
  Sparkles,
  UserCheck,
  UserMinus,
} from 'lucide-react';
import { EncounterStatus, PatientStatus } from '../types';

interface EncounterStatusBadgeProps {
  status: EncounterStatus;
}

export const EncounterStatusBadge: React.FC<EncounterStatusBadgeProps> = ({ status }) => {
  const getConfig = () => {
    switch (status) {
      case 'Finalized':
        return {
          color: 'text-[#16A34A]',
          Icon: CheckCircle2,
          label: 'Finalized',
        };
      case 'Reviewed':
        return {
          color: 'text-[#1769E0]',
          Icon: FileCheck,
          label: 'Reviewed',
        };
      case 'Pending Review':
        return {
          color: 'text-[#D97706]',
          Icon: Clock,
          label: 'Pending Review',
        };
      case 'AI Generated':
        return {
          color: 'text-[#0E9F9A]',
          Icon: Sparkles,
          label: 'AI Generated',
        };
      case 'Draft':
      default:
        return {
          color: 'text-[#64748B]',
          Icon: FileEdit,
          label: 'Draft',
        };
    }
  };

  const { color, Icon, label } = getConfig();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={status}
        initial={{ opacity: 0, scale: 0.94, y: 3 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: -3 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className={`inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap transition-colors duration-200 ${color}`}
      >
        <Icon className="w-3.5 h-3.5 shrink-0 transition-transform duration-200" />
        <span>{label}</span>
        {status === 'Pending Review' && (
          <span
            aria-hidden="true"
            className="w-1.5 h-1.5 rounded-full bg-[#D97706] animate-pulse"
          />
        )}
      </motion.span>
    </AnimatePresence>
  );
};

interface PatientStatusBadgeProps {
  status: PatientStatus;
}

export const PatientStatusBadge: React.FC<PatientStatusBadgeProps> = ({ status }) => {
  const getConfig = () => {
    switch (status) {
      case 'Active':
        return {
          color: 'text-[#16A34A]',
          Icon: UserCheck,
          label: 'Active',
        };
      case 'Follow-Up':
        return {
          color: 'text-[#D97706]',
          Icon: Clock,
          label: 'Follow-Up',
        };
      case 'Discharged':
      default:
        return {
          color: 'text-[#64748B]',
          Icon: UserMinus,
          label: 'Discharged',
        };
    }
  };

  const { color, Icon, label } = getConfig();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={status}
        initial={{ opacity: 0, scale: 0.94, y: 3 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: -3 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className={`inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap transition-colors duration-200 ${color}`}
      >
        <Icon className="w-3.5 h-3.5 shrink-0 transition-transform duration-200" />
        <span>{label}</span>
      </motion.span>
    </AnimatePresence>
  );
};
