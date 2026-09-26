import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://arrirfnzdgxisxsvbwdv.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFycmlyZm56ZGd4aXN4c3Zid2R2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1NDkyMjgsImV4cCI6MjEwNTEyNTIyOH0.OGLQzTomx2Q8k471TJ7CqI5FzWG8EfySoR-ucpwkpD4";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Fetch latest rooms state from Supabase
 */
export async function fetchCloudRooms() {
  try {
    const { data, error } = await supabase
      .from('app_data')
      .select('roomsJson')
      .eq('id', 'state')
      .single();

    if (error) {
      console.warn('Supabase fetch error:', error.message);
      return { success: false, error: error.message };
    }

    if (data && data.roomsJson) {
      const parsed = JSON.parse(data.roomsJson);
      return { success: true, data: parsed };
    }
    return { success: false, error: 'No data returned' };
  } catch (err) {
    console.error('Supabase fetch exception:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Save updated rooms state to Supabase
 */
export async function saveCloudRooms(rooms) {
  try {
    const roomsJson = JSON.stringify(rooms);
    const { error } = await supabase
      .from('app_data')
      .upsert({ id: 'state', roomsJson });

    if (error) {
      console.error('Supabase upsert error:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    console.error('Supabase save exception:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Subscribe to realtime updates from Supabase
 */
export function subscribeToCloudChanges(onUpdate) {
  const channel = supabase
    .channel('blw_app_data_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'app_data',
        filter: 'id=eq.state'
      },
      (payload) => {
        if (payload?.new?.roomsJson) {
          try {
            const parsed = JSON.parse(payload.new.roomsJson);
            onUpdate(parsed);
          } catch (e) {
            console.error('Realtime parse error', e);
          }
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
