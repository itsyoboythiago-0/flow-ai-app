"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type SubscriptionGateProps = {
  children: React.ReactNode;
};

export default function SubscriptionGate({ children }: SubscriptionGateProps) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    checkSubscriptionStatus();
  }, []);

  const checkSubscriptionStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // Mock user for demo
        const mockUserId = localStorage.getItem('flow_ai_mock_user_id');
        if (mockUserId) {
          const mockStatus = localStorage.getItem(`subscription_status_${mockUserId}`) || 'inactive';
          if (mockStatus === 'trialing' || mockStatus === 'active') {
            setHasAccess(true);
          } else {
            router.push('/paywall');
          }
        } else {
          router.push('/paywall');
        }
        setIsChecking(false);
        return;
      }

      // Check subscription status in Supabase
      const { data, error } = await supabase
        .from('profiles')
        .select('subscription_status')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error checking subscription:', error);
        router.push('/paywall');
        setIsChecking(false);
        return;
      }

      const status = data?.subscription_status || 'inactive';
      
      if (status === 'trialing' || status === 'active') {
        setHasAccess(true);
      } else {
        router.push('/paywall');
      }
    } catch (error) {
      console.error('Error in checkSubscriptionStatus:', error);
      router.push('/paywall');
    } finally {
      setIsChecking(false);
    }
  };

  if (isChecking) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-black flex items-center justify-center mx-auto mb-4 animate-pulse">
            <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-lg text-gray-500">Checking access...</p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return null;
  }

  return <>{children}</>;
}
