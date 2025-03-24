import { useState } from 'react';
import { X } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface SubscriptionModalProps {
  open: boolean;
  onClose: () => void;
  remainingAttempts: number;
}

type SubscriptionPlan = 'monthly' | 'pack';

const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ open, onClose, remainingAttempts }) => {
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>('monthly');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handlePayment = async () => {
    setIsLoading(true);
    
    try {
      const response = await apiRequest('POST', '/api/payment/initiate', {
        plan: selectedPlan
      });
      
      const data = await response.json();
      
      // Handle Razorpay integration
      if (data.order_id) {
        // In a real implementation, this would open the Razorpay modal
        // For now, we'll simulate a successful payment
        const simulateSuccessfulPayment = true;
        
        if (simulateSuccessfulPayment) {
          toast({
            title: "Payment Successful",
            description: selectedPlan === 'monthly' 
              ? "Your monthly subscription has been activated" 
              : "20 attempts have been added to your account",
          });
          onClose();
        }
      }
    } catch (error) {
      console.error('Payment initiation error:', error);
      toast({
        title: "Payment Failed",
        description: error instanceof Error ? error.message : "Failed to initiate payment",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogTitle className="text-2xl font-bold text-gray-900">
          Upgrade Your Plan
        </DialogTitle>
        
        <div className="mt-4">
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <div className="text-sm text-gray-500 mb-2">Current Status</div>
            <div className="flex justify-between items-center">
              <div>
                <div className="text-lg font-medium text-gray-900">Free Plan</div>
                <div className="text-sm text-gray-500">{remainingAttempts} attempts remaining</div>
              </div>
              <div className={`text-sm py-1 px-3 rounded-full ${
                remainingAttempts > 0 
                  ? 'bg-primaryGreen bg-opacity-10 text-primaryGreen' 
                  : 'bg-errorRed bg-opacity-10 text-errorRed'
              }`}>
                {remainingAttempts > 0 ? 'Active' : 'Depleted'}
              </div>
            </div>
          </div>
          
          <RadioGroup value={selectedPlan} onValueChange={(value) => setSelectedPlan(value as SubscriptionPlan)}>
            <div className={`border rounded-lg p-4 cursor-pointer relative mb-4 ${
              selectedPlan === 'monthly' ? 'border-accentBluePurple' : 'border-gray-200'
            }`}>
              <div className="flex items-start">
                <RadioGroupItem 
                  id="monthly-plan" 
                  value="monthly" 
                  className="mt-1 text-accentBluePurple"
                />
                <Label htmlFor="monthly-plan" className="ml-3 cursor-pointer block flex-1">
                  <div className="text-lg font-medium text-gray-900 mb-1">Monthly Subscription</div>
                  <div className="text-sm text-gray-500 mb-2">Unlimited attempts for a full month</div>
                  <div className="text-xl font-bold text-accentBluePurple">₹199/month</div>
                </Label>
              </div>
            </div>
            
            <div className={`border rounded-lg p-4 cursor-pointer relative ${
              selectedPlan === 'pack' ? 'border-accentBluePurple' : 'border-gray-200'
            }`}>
              <div className="flex items-start">
                <RadioGroupItem 
                  id="pack-plan" 
                  value="pack" 
                  className="mt-1 text-accentBluePurple"
                />
                <Label htmlFor="pack-plan" className="ml-3 cursor-pointer block flex-1">
                  <div className="text-lg font-medium text-gray-900 mb-1">20 Attempts Pack</div>
                  <div className="text-sm text-gray-500 mb-2">One-time purchase, no renewal</div>
                  <div className="text-xl font-bold text-accentBluePurple">₹299</div>
                </Label>
              </div>
            </div>
          </RadioGroup>
        </div>
        
        <div className="flex justify-end space-x-3 mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            className="bg-accentBluePurple hover:bg-accentBluePurple/90"
            onClick={handlePayment}
            disabled={isLoading}
          >
            {isLoading ? "Processing..." : "Proceed to Payment"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SubscriptionModal;
