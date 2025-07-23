"use client";

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, DollarSign, Shield, AlertCircle, CheckCircle } from 'lucide-react';
import CommissionerHeader from '../../../../../components/commissioner-dashboard/commissioner-header';

export default function PayInvoicePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const invoiceNumber = searchParams.get('invoice');
  
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvoice = async () => {
      if (!invoiceNumber) {
        setError('No invoice number provided');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/invoices');
        if (response.ok) {
          const invoices = await response.json();
          const foundInvoice = invoices.find((inv: any) => inv.invoiceNumber === invoiceNumber);
          
          if (foundInvoice) {
            setInvoice(foundInvoice);
          } else {
            setError('Invoice not found');
          }
        } else {
          setError('Failed to fetch invoice');
        }
      } catch (error) {
        console.error('Error fetching invoice:', error);
        setError('Error loading invoice');
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [invoiceNumber]);

  const handlePayment = async () => {
    if (!invoice) return;

    setProcessing(true);
    setError(null);

    try {
      // SIMULATION: Add 2-second delay to simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      const response = await fetch('/api/invoices/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceNumber: invoice.invoiceNumber,
          commissionerId: invoice.commissionerId,
          amount: invoice.totalAmount,
          paymentMethodId: 'pm_simulation_123', // TODO: Real payment method ID
          currency: 'USD'
        })
      });

      if (response.ok) {
        const result = await response.json();
        setPaymentSuccess(true);
        
        // Redirect to success page after 3 seconds
        setTimeout(() => {
          router.push('/commissioner-dashboard/projects-and-invoices/project-list');
        }, 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Payment failed');
      }
    } catch (error) {
      console.error('Payment error:', error);
      setError('Payment processing failed');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <section className="flex flex-col gap-3 p-4 md:p-6">
        <CommissionerHeader />
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading invoice...</div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="flex flex-col gap-3 p-4 md:p-6">
        <CommissionerHeader />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <div className="text-red-600 text-lg">{error}</div>
          </div>
        </div>
      </section>
    );
  }

  if (paymentSuccess) {
    return (
      <section className="flex flex-col gap-3 p-4 md:p-6">
        <CommissionerHeader />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <div className="text-green-600 text-xl font-semibold mb-2">Payment Successful!</div>
            <div className="text-gray-600">Redirecting to project list...</div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3 p-4 md:p-6">
      <CommissionerHeader />
      
      <motion.div
        className="max-w-2xl mx-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-2xl font-bold mb-6">Pay Invoice</h1>
        
        {/* Invoice Details Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Invoice Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="text-sm font-medium text-gray-600">Invoice Number</label>
              <div className="text-lg font-mono">{invoice?.invoiceNumber}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Project</label>
              <div className="text-lg">{invoice?.projectTitle}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Milestone</label>
              <div className="text-lg">{invoice?.milestoneDescription}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Due Date</label>
              <div className="text-lg">{invoice?.dueDate}</div>
            </div>
          </div>
          
          <div className="border-t pt-4">
            <div className="flex justify-between items-center text-xl font-bold">
              <span>Total Amount:</span>
              <span className="text-green-600">${invoice?.totalAmount?.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Payment Simulation Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <Shield className="w-5 h-5 text-blue-500 mt-0.5 mr-3" />
            <div>
              <h3 className="font-semibold text-blue-800">Simulation Mode</h3>
              <p className="text-blue-700 text-sm mt-1">
                This is a payment simulation. No real payment will be processed. 
                When payment gateways are integrated, this will handle real transactions.
              </p>
            </div>
          </div>
        </div>

        {/* Payment Method Simulation */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <CreditCard className="w-5 h-5 mr-2" />
            Payment Method (Simulation)
          </h2>
          
          <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-8 h-5 bg-blue-600 rounded mr-3"></div>
                <div>
                  <div className="font-medium">•••• •••• •••• 4242</div>
                  <div className="text-sm text-gray-600">Expires 12/25</div>
                </div>
              </div>
              <div className="text-sm text-gray-600">Visa</div>
            </div>
          </div>
          
          <p className="text-xs text-gray-500 mt-2">
            * This is a simulated payment method. Real integration will use Stripe, Paystack, or similar.
          </p>
        </div>

        {/* Payment Button */}
        <button
          onClick={handlePayment}
          disabled={processing || invoice?.status === 'paid'}
          className={`w-full py-4 px-6 rounded-lg font-semibold text-white transition-all duration-200 flex items-center justify-center ${
            processing 
              ? 'bg-gray-400 cursor-not-allowed' 
              : invoice?.status === 'paid'
              ? 'bg-green-500 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
          }`}
        >
          {processing ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Processing Payment...
            </>
          ) : invoice?.status === 'paid' ? (
            <>
              <CheckCircle className="w-5 h-5 mr-2" />
              Already Paid
            </>
          ) : (
            <>
              <DollarSign className="w-5 h-5 mr-2" />
              Pay ${invoice?.totalAmount?.toFixed(2)}
            </>
          )}
        </button>

        {/* Security Notice */}
        <div className="text-center text-xs text-gray-500 mt-4">
          <Shield className="w-4 h-4 inline mr-1" />
          Your payment information is secure and encrypted
        </div>
      </motion.div>
    </section>
  );
}
