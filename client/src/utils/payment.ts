/**
 * Utility functions for payment handling
 */

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  orderId: string;
  prefill: {
    name: string;
    email: string;
  };
  theme: {
    color: string;
  };
  handler: (response: any) => void;
}

/**
 * Initialize Razorpay payment
 * @param options Configuration for Razorpay
 * @returns Promise that resolves when payment completes
 */
export const initializeRazorpay = (options: RazorpayOptions): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      // Check if Razorpay is loaded
      if (!(window as any).Razorpay) {
        loadRazorpayScript()
          .then(() => processPayment(options, resolve, reject))
          .catch(err => reject(err));
      } else {
        processPayment(options, resolve, reject);
      }
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Load the Razorpay script if not already loaded
 */
const loadRazorpayScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Razorpay script'));
    document.body.appendChild(script);
  });
};

/**
 * Process the payment using Razorpay
 */
const processPayment = (
  options: RazorpayOptions, 
  resolve: (value: void) => void, 
  reject: (reason?: any) => void
): void => {
  try {
    const razorpay = new (window as any).Razorpay(options);
    razorpay.on('payment.failed', (response: any) => {
      reject(new Error(`Payment failed: ${response.error.description}`));
    });
    razorpay.open();
    
    // Resolve will be called by the handler function when payment completes
  } catch (err) {
    reject(err);
  }
};

/**
 * Calculate subscription prices
 * @param plan The subscription plan type
 * @returns The price in rupees
 */
export const calculatePrice = (plan: 'monthly' | 'pack'): number => {
  return plan === 'monthly' ? 199 : 299;
};

/**
 * Format price for display
 * @param amount The price in rupees
 * @returns Formatted price string
 */
export const formatPrice = (amount: number): string => {
  return `₹${amount}`;
};
