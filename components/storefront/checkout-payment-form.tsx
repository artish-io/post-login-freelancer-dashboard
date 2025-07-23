'use client';

import { useState } from 'react';
import { CreditCard } from 'lucide-react';
import Image from 'next/image';
import { useCart } from './cart-context';

type PaymentMethod = 'card' | 'paypal';

export default function CheckoutPaymentForm() {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [formData, setFormData] = useState({
    nameOnCard: '',
    cardNumber: '',
    cvv: '',
    expiry: '',
    email: '',
    country: '',
  });

  const { clearCart } = useCart();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (paymentMethod === 'paypal') {
      // Redirect to PayPal (to be implemented later)
      alert('PayPal integration will be implemented later');
      return;
    }

    // Handle card payment
    console.log('Processing card payment:', formData);
    alert('Payment processing will be implemented later');
    
    // Clear cart after successful payment
    // clearCart();
  };

  return (
    <div className="bg-gray-50 rounded-2xl p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Payment Method Selection */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Pay with</h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setPaymentMethod('card')}
              className={`p-4 rounded-xl border-2 transition-colors ${
                paymentMethod === 'card'
                  ? 'border-black bg-white'
                  : 'border-gray-300 bg-white hover:border-gray-400'
              }`}
            >
              <CreditCard className="w-6 h-6 mx-auto mb-2 text-gray-700" />
              <span className="block text-sm font-medium text-gray-900">Card</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('paypal')}
              className={`p-4 rounded-xl border-2 transition-colors ${
                paymentMethod === 'paypal'
                  ? 'border-black bg-white'
                  : 'border-gray-300 bg-white hover:border-gray-400'
              }`}
            >
              <div className="w-6 h-6 mx-auto mb-2 relative">
                <Image
                  src="/icons/paypal-logo.png"
                  alt="PayPal"
                  fill
                  className="object-contain"
                />
              </div>
              <span className="block text-sm font-medium text-gray-900">PayPal</span>
            </button>
          </div>
        </div>

        {/* Card Payment Form */}
        {paymentMethod === 'card' && (
          <>
            {/* Name on Card */}
            <div>
              <label htmlFor="nameOnCard" className="block text-sm font-medium text-gray-900 mb-2">
                Name on Card
              </label>
              <input
                type="text"
                id="nameOnCard"
                name="nameOnCard"
                value={formData.nameOnCard}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent"
                required
              />
            </div>

            {/* Card Number */}
            <div>
              <label htmlFor="cardNumber" className="block text-sm font-medium text-gray-900 mb-2">
                Card Number
              </label>
              <input
                type="text"
                id="cardNumber"
                name="cardNumber"
                value={formData.cardNumber}
                onChange={handleInputChange}
                placeholder="1234 5678 9012 3456"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent"
                required
              />
            </div>

            {/* CVV and Expiry */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="cvv" className="block text-sm font-medium text-gray-900 mb-2">
                  CVV
                </label>
                <input
                  type="text"
                  id="cvv"
                  name="cvv"
                  value={formData.cvv}
                  onChange={handleInputChange}
                  placeholder="123"
                  maxLength={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label htmlFor="expiry" className="block text-sm font-medium text-gray-900 mb-2">
                  Expiry
                </label>
                <input
                  type="text"
                  id="expiry"
                  name="expiry"
                  value={formData.expiry}
                  onChange={handleInputChange}
                  placeholder="MM/YY"
                  maxLength={5}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent"
                  required
                />
              </div>
            </div>
          </>
        )}

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-900 mb-2">
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent"
            required
          />
        </div>

        {/* Country */}
        <div>
          <label htmlFor="country" className="block text-sm font-medium text-gray-900 mb-2">
            Country
          </label>
          <input
            type="text"
            id="country"
            name="country"
            value={formData.country}
            onChange={handleInputChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent"
            required
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full bg-black text-white py-4 rounded-xl font-semibold hover:bg-gray-800 transition-colors"
        >
          Complete Purchase
        </button>
      </form>
    </div>
  );
}
