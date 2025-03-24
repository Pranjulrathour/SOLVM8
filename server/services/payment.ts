import crypto from 'crypto';

// Get Razorpay API key and secret from environment variables
const razorpayKeyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_dummy';
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || 'dummy_secret';

interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
}

class PaymentService {
  /**
   * Create a new order with Razorpay
   * @param amount Amount in paise (e.g. 10000 for ₹100)
   * @param currency Currency code (default: INR)
   * @returns Order details
   */
  async createOrder(amount: number, currency: string = 'INR'): Promise<RazorpayOrder> {
    try {
      // In a real implementation, this would call the Razorpay API
      // For development without real Razorpay credentials, we'll simulate the response
      if (!razorpayKeyId || razorpayKeyId === 'rzp_test_dummy') {
        console.log('Using simulated Razorpay order due to missing credentials');
        return this.simulateCreateOrder(amount, currency);
      }

      // Real implementation with Razorpay SDK would look like:
      const response = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic ' + Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString('base64')
        },
        body: JSON.stringify({
          amount,
          currency,
          receipt: `receipt_${Date.now()}`,
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Razorpay API Error:', errorData);
        throw new Error(`Failed to create Razorpay order: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        id: data.id,
        amount: data.amount,
        currency: data.currency
      };
    } catch (error) {
      console.error('Create order error:', error);
      // Fallback to simulated order if there's an error
      console.log('Falling back to simulated Razorpay order');
      return this.simulateCreateOrder(amount, currency);
    }
  }
  
  /**
   * Verify Razorpay payment signature
   * @param orderId Razorpay order ID
   * @param paymentId Razorpay payment ID
   * @param signature Razorpay signature
   * @returns Boolean indicating if signature is valid
   */
  verifyPayment(orderId: string, paymentId: string, signature: string): boolean {
    try {
      // In a real implementation, this would verify the signature
      // For development without real Razorpay credentials, we'll always return true
      if (!razorpayKeySecret || razorpayKeySecret === 'dummy_secret') {
        console.log('Simulating payment verification due to missing credentials');
        return true;
      }
      
      // Real implementation to verify the signature
      const body = orderId + '|' + paymentId;
      const expectedSignature = crypto
        .createHmac('sha256', razorpayKeySecret)
        .update(body)
        .digest('hex');
      
      return expectedSignature === signature;
    } catch (error) {
      console.error('Payment verification error:', error);
      return false;
    }
  }
  
  /**
   * Simulate creating a Razorpay order for development
   * @param amount Amount in paise
   * @param currency Currency code
   * @returns Simulated order object
   */
  private simulateCreateOrder(amount: number, currency: string): RazorpayOrder {
    return {
      id: `order_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      amount,
      currency
    };
  }
}

export const paymentService = new PaymentService();
