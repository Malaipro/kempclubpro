
import React, { useState, useEffect } from 'react';
import { Timer } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type TimeLeft = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

interface CountdownTimerProps {
  targetDate?: Date;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({ targetDate }) => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [streamStartDate, setStreamStartDate] = useState<Date | null>(null);

  // Fetch active stream start date and subscribe to changes
  useEffect(() => {
    const fetchActiveStream = async () => {
      try {
        const { data, error } = await supabase
          .from('streams')
          .select('start_date, name')
          .eq('is_active', true)
          .maybeSingle();

        if (data && !error) {
          setStreamStartDate(new Date(data.start_date));
        }
      } catch (error) {
        console.error('Error fetching active stream:', error);
      }
    };

    fetchActiveStream();

    // Subscribe to real-time changes in streams table
    const streamsSubscription = supabase
      .channel('streams-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'streams'
        },
        (payload) => {
          console.log('Stream data changed:', payload);
          fetchActiveStream(); // Refetch active stream when any stream changes
        }
      )
      .subscribe();

    return () => {
      streamsSubscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    // Use provided targetDate, fetched streamStartDate, or fallback to default date
    const calculatedTargetDate = targetDate || streamStartDate || new Date('2025-11-08T00:00:00');
    
    const interval = setInterval(() => {
      const now = new Date();
      const difference = calculatedTargetDate.getTime() - now.getTime();
      
      if (difference <= 0) {
        clearInterval(interval);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      
      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);
      
      setTimeLeft({ days, hours, minutes, seconds });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [targetDate, streamStartDate]);

  return (
    <div className="mb-8">
      <p className="text-white/80 mb-2 flex items-center">
        <Timer size={16} className="mr-2" />
        До начала интенсива:
      </p>
      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
          <div className="text-3xl font-bold">{timeLeft.days}</div>
          <div className="text-xs text-white/70 mt-1">дней</div>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
          <div className="text-3xl font-bold">{timeLeft.hours}</div>
          <div className="text-xs text-white/70 mt-1">часов</div>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
          <div className="text-3xl font-bold">{timeLeft.minutes}</div>
          <div className="text-xs text-white/70 mt-1">минут</div>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
          <div className="text-3xl font-bold">{timeLeft.seconds}</div>
          <div className="text-xs text-white/70 mt-1">секунд</div>
        </div>
      </div>
    </div>
  );
};
