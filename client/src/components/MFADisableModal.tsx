import Modal from './Modal';
import AsyncButton from './AsyncButton';

interface MFADisableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isLoading: boolean;
}

export default function MFADisableModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading
}: MFADisableModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Disable Security Layer?"
      description="This will significantly reduce your account's protection."
      footer={
        <>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-6 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <AsyncButton
            onClick={onConfirm}
            isLoading={isLoading}
            className="px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-red-500/30 transition-all cursor-pointer"
          >
            Disable Anyway
          </AsyncButton>
        </>
      }
    >
      <div className="space-y-4">
        <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-2xl flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-50">Security Downgrade Warning</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              By disabling multi-factor authentication, you will no longer need your authenticator app to log in. We strongly recommend keeping MFA enabled to protect your messages and account data from unauthorized access.
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
