

'use client';

import { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadIcon } from 'lucide-react';
import CategorySelector from './category-selector';
import TagAutocomplete from './tag-autocomplete';

export default function ListNewProductModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [productName, setProductName] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!productName.trim() || !description.trim() || !category) {
      setSubmitMessage('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage('');

    try {
      const formData = new FormData();
      formData.append('productName', productName);
      formData.append('description', description);
      formData.append('category', category);
      formData.append('tags', tags);
      if (file) {
        formData.append('file', file);
      }

      const response = await fetch('/api/storefront/submit-product', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setSubmitMessage('Product submitted successfully for review!');
        // Reset form
        setProductName('');
        setDescription('');
        setFile(null);
        setCategory('');
        setTags('');
        setTimeout(() => {
          onClose();
          setSubmitMessage('');
        }, 2000);
      } else {
        setSubmitMessage(result.error || 'Failed to submit product');
      }
    } catch (error) {
      setSubmitMessage('Failed to submit product. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onClose={onClose} className="relative z-50">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/30"
            aria-hidden="true"
          />
          <div className="fixed inset-0 flex items-end md:items-center justify-center p-4">
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{
                type: "spring",
                damping: 25,
                stiffness: 300,
                duration: 0.3
              }}
              className="mx-auto w-full max-w-2xl rounded-t-2xl md:rounded-2xl bg-white py-10 px-8 relative"
            >
              <button onClick={onClose} className="absolute top-6 left-6 text-sm text-gray-500 hover:text-black">
                ← Back
              </button>

              <h2 className="text-center text-3xl font-bold mb-8 tracking-tight">List a new product</h2>

              <div className="flex flex-col items-center gap-3 mb-8">
                <div className="w-40 h-40 rounded-full bg-gray-100 flex items-center justify-center">
                  {/* Gray circular placeholder with upload icon */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-14 w-14 text-gray-300"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V8m0 0l-3.5 3.5M12 8l3.5 3.5M21 16.5V19a2 2 0 01-2 2H5a2 2 0 01-2-2v-2.5" />
                  </svg>
                </div>
                <label className="mt-2 text-base font-medium text-black underline cursor-pointer transition hover:text-primary">
                  Upload a cover image
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
              </div>

              <div className="flex flex-col gap-5">
                <input
                  type="text"
                  placeholder="Product Name"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black transition"
                />

                <textarea
                  placeholder="Short product description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-black transition resize-none"
                />

                <div className="flex gap-3">
                  <label className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm bg-white hover:bg-gray-50 transition cursor-pointer flex items-center justify-center gap-2">
                    <UploadIcon className="w-4 h-4" />
                    <span>{file ? file.name : 'Attach File'}</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleFileChange}
                      accept=".pdf,.zip,.rar,.jpg,.jpeg,.png,.gif,.mp4,.mov,.avi,.mp3,.wav,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
                    />
                  </label>

                  <div className="w-full">
                    <CategorySelector
                      value={category}
                      onChange={setCategory}
                      placeholder="Select Product Category"
                    />
                  </div>
                </div>

                <TagAutocomplete
                  value={tags}
                  onChange={setTags}
                  placeholder="Tags (comma separated)"
                />
              </div>

              {submitMessage && (
                <div className={`text-sm text-center p-3 rounded-lg ${
                  submitMessage.includes('successfully')
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-700'
                }`}>
                  {submitMessage}
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !productName.trim() || !description.trim() || !category}
                className="mt-10 w-full bg-black text-white py-4 rounded-lg font-semibold text-lg hover:bg-gray-900 disabled:bg-gray-400 disabled:cursor-not-allowed transition shadow-sm"
              >
                {isSubmitting ? 'Submitting...' : 'Submit For Review'}
              </button>
            </motion.div>
          </div>
        </Dialog>
      )}
    </AnimatePresence>
  );
}