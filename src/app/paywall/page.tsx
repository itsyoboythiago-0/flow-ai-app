"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function PaywallPage() {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">("yearly");
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    getUserId();
  }, []);

  const getUserId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
    } else {
      const mockUserId = localStorage.getItem('flow_ai_mock_user_id');
      setUserId(mockUserId);
    }
  };

  const handleStartTrial = async () => {
    setIsLoading(true);
    try {
      // In production, this would create a Stripe subscription
      // For now, we'll simulate it
      
      if (!userId) {
        alert('User not found. Please log in again.');
        setIsLoading(false);
        return;
      }

      // Check if real user or mock
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Real user - update Supabase
        const { error } = await supabase
          .from('profiles')
          .update({
            subscription_status: 'trialing',
            stripe_customer_id: `cus_mock_${Date.now()}`,
            stripe_subscription_id: `sub_mock_${Date.now()}`,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);

        if (error) {
          console.error('Error updating subscription:', error);
          alert('Failed to start trial. Please try again.');
          setIsLoading(false);
          return;
        }
      } else {
        // Mock user - use localStorage
        localStorage.setItem(`subscription_status_${userId}`, 'trialing');
        localStorage.setItem(`stripe_customer_id_${userId}`, `cus_mock_${Date.now()}`);
        localStorage.setItem(`stripe_subscription_id_${userId}`, `sub_mock_${Date.now()}`);
      }

      // Redirect to home
      router.push('/');
    } catch (error) {
      console.error('Error starting trial:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex-1 max-w-md mx-auto w-full px-6 pt-12 pb-32 overflow-y-auto">
        <div className="space-y-6 animate-fadeIn">
          <div className="text-center space-y-3">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-black to-gray-700 flex items-center justify-center mx-auto mb-4 shadow-xl">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-black">Start your free trial</h1>
            <p className="text-lg text-gray-500">Build discipline in minutes a day.</p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => setSelectedPlan("yearly")}
              className={`w-full rounded-3xl p-6 border-2 transition-all duration-200 active:scale-[0.98] relative overflow-hidden ${
                selectedPlan === "yearly"
                  ? "border-black bg-black text-white shadow-xl"
                  : "border-gray-200 bg-white text-black hover:border-gray-300"
              }`}
            >
              {selectedPlan === "yearly" && (
                <div className="absolute top-4 right-4">
                  <div className="px-3 py-1 bg-yellow-400 text-black text-xs font-bold rounded-full">
                    BEST VALUE
                  </div>
                </div>
              )}
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-4xl font-bold">$49.99</span>
                <span className="text-lg opacity-70">/year</span>
              </div>
              <p className={`text-sm ${selectedPlan === "yearly" ? "text-white/80" : "text-gray-500"}`}>
                7-day free trial • Just $4.17/month
              </p>
            </button>

            <button
              onClick={() => setSelectedPlan("monthly")}
              className={`w-full rounded-3xl p-6 border-2 transition-all duration-200 active:scale-[0.98] ${
                selectedPlan === "monthly"
                  ? "border-black bg-black text-white shadow-xl"
                  : "border-gray-200 bg-white text-black hover:border-gray-300"
              }`}
            >
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-4xl font-bold">$9.99</span>
                <span className="text-lg opacity-70">/month</span>
              </div>
              <p className={`text-sm ${selectedPlan === "monthly" ? "text-white/80" : "text-gray-500"}`}>
                7-day free trial • Billed monthly
              </p>
            </button>
          </div>

          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-black mb-4">What's included:</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-black flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-4 h-4 text-white" strokeWidth={3} />
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">Daily plan + reminders</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-black flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-4 h-4 text-white" strokeWidth={3} />
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">Habit & task streak tracking</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-black flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-4 h-4 text-white" strokeWidth={3} />
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">AI Coach that adapts to you</p>
              </div>
            </div>
          </div>

          <div className="space-y-2 text-center text-sm text-gray-500">
            <p>• 7-day free trial</p>
            <p>• Cancel anytime</p>
            <p>• No charge today</p>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100">
        <div className="max-w-md mx-auto px-6 py-4">
          <button
            onClick={handleStartTrial}
            disabled={isLoading}
            className="w-full bg-black text-white rounded-full py-4 px-6 font-semibold hover:bg-gray-900 transition-all duration-200 active:scale-[0.98] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Starting Trial..." : "Start Free Trial"}
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out;
        }
      `}</style>
    </div>
  );
}
