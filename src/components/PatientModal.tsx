import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle, CheckCircle2, Loader2, X } from 'lucide-react';
import { Patient, PatientStatus } from '../types';
import { generateUniquePatientCode } from '../data/seedData';
import { Tooltip } from './Tooltip';

interface PatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (patientData: Omit<Patient, 'id' | 'ownerId' | 'facilityId' | 'createdAt'>) => Promise<void>;
  initialPatient?: Patient | null;
  existingPatientsCount: number;
}

export const PatientModal: React.FC<PatientModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialPatient,
  existingPatientsCount,
}) => {
  const [patientId, setPatientId] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [sex, setSex] = useState<'Female' | 'Male' | 'Other'>('Female');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [status, setStatus] = useState<PatientStatus>('Active');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setAttemptedSubmit(false);
    if (initialPatient) {
      setPatientId(initialPatient.patientId);
      setFirstName(initialPatient.firstName);
      setLastName(initialPatient.lastName);
      setDateOfBirth(initialPatient.dateOfBirth);
      setSex(initialPatient.sex);
      setPhone(initialPatient.phone);
      setEmail(initialPatient.email);
      setAddress(initialPatient.address);
      setEmergencyContact(initialPatient.emergencyContact);
      setStatus(initialPatient.status);
      setNotes(initialPatient.notes);
    } else {
      setPatientId(generateUniquePatientCode(existingPatientsCount));
      setFirstName('');
      setLastName('');
      setDateOfBirth('');
      setSex('Female');
      setPhone('');
      setEmail('');
      setAddress('');
      setEmergencyContact('');
      setStatus('Active');
      setNotes('');
    }
  }, [isOpen, initialPatient, existingPatientsCount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAttemptedSubmit(true);
    setError(null);

    if (!firstName.trim() || !lastName.trim() || !dateOfBirth.trim() || !phone.trim()) {
      setError('Please provide the required patient information (First Name, Last Name, Date of Birth, and Phone Number).');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        patientId: patientId.trim(),
        firstName: firstName.trim().slice(0, 80),
        lastName: lastName.trim().slice(0, 80),
        dateOfBirth: dateOfBirth.trim().slice(0, 20),
        sex,
        phone: phone.trim().slice(0, 40),
        email: (email.trim() || 'Not provided').slice(0, 160),
        address: (address.trim() || 'Not provided').slice(0, 300),
        emergencyContact: (emergencyContact.trim() || 'Not provided').slice(0, 200),
        status,
        notes: notes.trim().slice(0, 2000),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save patient record. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFieldStateClass = (val: string, requiredField: boolean = false) => {
    if (requiredField && attemptedSubmit && !val.trim()) {
      return 'cb-input cb-input-error';
    }
    if (val.trim().length > 0 && val.trim() !== 'Not provided') {
      return 'cb-input cb-input-valid';
    }
    return 'cb-input';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-50 bg-[#0B1F33]/60 backdrop-blur-[1px] flex items-center justify-center p-4 overflow-y-auto"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 6 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-[#E2E8F0] rounded-xl w-full max-w-2xl overflow-hidden my-8 shadow-xl"
          >
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F6F9FC]">
              <div>
                <h2 className="font-display text-lg font-bold text-[#0B1F33]">
                  {initialPatient ? 'Edit Patient Record' : 'Register New Patient'}
                </h2>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Internal Patient ID:{' '}
                  <span className="font-mono font-semibold text-[#0B1F33]">
                    {patientId}
                  </span>
                </p>
              </div>
              <Tooltip content="Close modal" side="left">
                <button
                  type="button"
                  onClick={onClose}
                  className="cb-icon-btn p-1.5 rounded-lg text-[#64748B] hover:text-[#17212B] hover:bg-slate-200/60"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5 transition-transform duration-150 hover:rotate-90" />
                </button>
              </Tooltip>
            </div>

            <form
              onSubmit={handleSubmit}
              noValidate
              className="p-6 space-y-4 max-h-[80vh] overflow-y-auto"
            >
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.16 }}
                    className="p-3 rounded-lg bg-[#DC2626]/10 border border-[#DC2626]/30 flex items-start gap-2.5 text-xs text-[#DC2626]"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-[#17212B]">
                      First Name <span className="text-[#DC2626]">*</span>
                    </label>
                    {firstName.trim().length > 0 && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
                    )}
                  </div>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. Oluwaseun"
                    className={`w-full px-3 py-2 text-sm rounded-lg ${getFieldStateClass(
                      firstName,
                      true
                    )}`}
                    required
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-[#17212B]">
                      Last Name <span className="text-[#DC2626]">*</span>
                    </label>
                    {lastName.trim().length > 0 && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
                    )}
                  </div>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="e.g. Adeyemi"
                    className={`w-full px-3 py-2 text-sm rounded-lg ${getFieldStateClass(
                      lastName,
                      true
                    )}`}
                    required
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-[#17212B]">
                      Date of Birth <span className="text-[#DC2626]">*</span>
                    </label>
                    {dateOfBirth.trim().length > 0 && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
                    )}
                  </div>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className={`w-full px-3 py-2 text-sm font-mono rounded-lg ${getFieldStateClass(
                      dateOfBirth,
                      true
                    )}`}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#17212B] mb-1">
                    Sex <span className="text-[#DC2626]">*</span>
                  </label>
                  <select
                    value={sex}
                    onChange={(e) =>
                      setSex(e.target.value as 'Female' | 'Male' | 'Other')
                    }
                    className="cb-input w-full px-3 py-2 text-sm rounded-lg"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-[#17212B]">
                      Phone Number <span className="text-[#DC2626]">*</span>
                    </label>
                    {phone.trim().length >= 7 && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
                    )}
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +234 803 412 8891"
                    className={`w-full px-3 py-2 text-sm font-mono rounded-lg ${getFieldStateClass(
                      phone,
                      true
                    )}`}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#17212B] mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. patient.synthetic@example.ng"
                    className={`w-full px-3 py-2 text-sm rounded-lg ${getFieldStateClass(
                      email
                    )}`}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[#17212B] mb-1">
                    Residential Address
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. 24 Bode Thomas Street, Surulere, Lagos"
                    className={`w-full px-3 py-2 text-sm rounded-lg ${getFieldStateClass(
                      address
                    )}`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#17212B] mb-1">
                    Emergency Contact (Name, Relation &amp; Phone)
                  </label>
                  <input
                    type="text"
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    placeholder="e.g. Folake Adeyemi (Spouse) — +234 802 914 3302"
                    className={`w-full px-3 py-2 text-sm rounded-lg ${getFieldStateClass(
                      emergencyContact
                    )}`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#17212B] mb-1">
                    Administrative Care Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as PatientStatus)}
                    className="cb-input w-full px-3 py-2 text-sm rounded-lg"
                  >
                    <option value="Active">Active</option>
                    <option value="Follow-Up">Follow-Up</option>
                    <option value="Discharged">Discharged</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[#17212B] mb-1">
                    Administrative / Intake Notes
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Enter relevant registration or intake notes (synthetic test data only)..."
                    className={`w-full px-3 py-2 text-sm rounded-lg ${getFieldStateClass(
                      notes
                    )}`}
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="cb-btn cb-btn-secondary py-2 px-4 text-xs font-medium rounded-lg whitespace-nowrap"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="cb-btn cb-btn-primary py-2 px-4 text-xs font-medium rounded-lg gap-2 whitespace-nowrap"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Record...</span>
                    </>
                  ) : initialPatient ? (
                    'Save Patient Changes'
                  ) : (
                    'Register Patient'
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
