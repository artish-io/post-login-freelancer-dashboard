'use client';

interface SettingsActionButtonsProps {
  onSave?: () => void;
  onCancel?: () => void;
  saveText?: string;
  cancelText?: string;
  className?: string;
}

export default function SettingsActionButtons({
  onSave,
  onCancel,
  saveText = "Save Changes",
  cancelText = "Cancel",
  className = ""
}: SettingsActionButtonsProps) {
  return (
    <div className={`flex flex-col sm:flex-row gap-4 pt-4 ${className}`}>
      <button 
        onClick={onSave}
        className="bg-black text-white px-6 py-3 rounded-2xl font-medium hover:bg-gray-800 transition-colors"
      >
        {saveText}
      </button>
      <button 
        onClick={onCancel}
        className="border border-gray-300 text-gray-700 px-6 py-3 rounded-2xl font-medium hover:bg-gray-50 transition-colors"
      >
        {cancelText}
      </button>
    </div>
  );
}
