import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScheduleEvent {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  location: string | null;
  activity_type: string;
}

// Format date to iCal format (YYYYMMDDTHHMMSSZ)
function formatICalDate(date: string): string {
  const d = new Date(date);
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

// Escape special characters in iCal text fields
function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get schedule type from query parameter (intensive or club)
    const url = new URL(req.url);
    const scheduleType = url.searchParams.get('type') || 'intensive';
    
    console.log(`Fetching ${scheduleType} schedule events...`);

    // Fetch schedule events filtered by type
    const { data: schedules, error } = await supabase
      .from('schedules')
      .select('id, title, description, start_time, end_time, location, activity_type, schedule_type')
      .eq('is_active', true)
      .eq('schedule_type', scheduleType)
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Error fetching schedules:', error);
      throw error;
    }

    console.log(`Found ${schedules?.length || 0} events`);

    // Generate iCal file
    const icalLines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//KEMP//Schedule//RU',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:КЭМП - ${scheduleType === 'intensive' ? 'Интенсив' : 'Мужской Клуб'}`,
      'X-WR-TIMEZONE:Europe/Moscow',
      `X-WR-CALDESC:Расписание ${scheduleType === 'intensive' ? 'интенсива' : 'мужского клуба'} КЭМП`,
      'REFRESH-INTERVAL;VALUE=DURATION:PT1H', // Refresh every hour
      'X-PUBLISHED-TTL:PT1H',
    ];

    // Add each event
    (schedules || []).forEach((event: ScheduleEvent) => {
      const uid = `${event.id}@kemp.club`;
      const summary = escapeICalText(event.title);
      const description = event.description ? escapeICalText(event.description) : '';
      const location = event.location ? escapeICalText(event.location) : 'КЭМП';
      
      icalLines.push(
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${formatICalDate(new Date().toISOString())}`,
        `DTSTART:${formatICalDate(event.start_time)}`,
        `DTEND:${formatICalDate(event.end_time)}`,
        `SUMMARY:${summary}`,
        `DESCRIPTION:${description}`,
        `LOCATION:${location}`,
        `CATEGORIES:${escapeICalText(event.activity_type)}`,
        'STATUS:CONFIRMED',
        'SEQUENCE:0',
        'END:VEVENT'
      );
    });

    icalLines.push('END:VCALENDAR');

    const icalContent = icalLines.join('\r\n');

    console.log('iCal feed generated successfully');

    return new Response(icalContent, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `inline; filename="kemp-${scheduleType}.ics"`,
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error('Error generating iCal feed:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);
