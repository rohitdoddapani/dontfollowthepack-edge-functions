

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.44.4";

// const { URL, SERVICE_ROLE_KEY, OPENAI_API_KEY } = config();

const URL = Deno.env.get('URL');
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY');
const YOUTUBE_KEY = Deno.env.get('YOUTUBE_KEY');

console.log('worked',URL,SERVICE_ROLE_KEY, YOUTUBE_KEY);


Deno.serve(async (req) => {

  // Ensure all required environment variables are present
  if (!URL || !SERVICE_ROLE_KEY || !YOUTUBE_KEY) {
    return new Response('Missing environment variables', { status: 500 });
  }

  const supabase = createClient(URL, SERVICE_ROLE_KEY);

  // Fetch channels from Supabase
  const { data: channels, error } = await supabase
    .from('channels')
    .select('*')
    .eq('auto_fetch', true);

  // console.log(channels,error);
  
  if (error) {
    console.error('Error fetching channels:', error);
    return new Response(JSON.stringify(error), { status: 400 });
  }


  for (const channel of channels) {
    const { channel_id, last_video_id } = channel;

    try {

      console.log(channel_id,last_video_id);
      
      // Fetch latest video ID from YouTube API
      const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channel_id}&order=date&maxResults=1&key=${YOUTUBE_KEY}`);
      const youtubeData = await response.json();
      console.log('youtubeData: ', youtubeData);
      
      if (youtubeData.items.length > 0) {
        const latestVideoId = youtubeData.items[0].id.videoId;

        if (latestVideoId !== last_video_id) {
          // Update channel with new video ID
          const { error: updateError } = await supabase
            .from('channels')
            .update({ last_video_id: latestVideoId })
            .eq('channel_id', channel_id);

          if (updateError) {
            console.error('Error updating channel:', updateError);
          } else {
            console.log('Updated channel with new video ID:', latestVideoId);

            console.log(`Attempting to call generate-blog with URL: http://qakkspvhxfwkttmbalej.supabase.co/functions/v1/generate-blog`);

            // Call the blog generation function
            const response = await fetch(`https://qakkspvhxfwkttmbalej.supabase.co/functions/v1/generate-blog`, {
              method: 'POST',
              // headers: { 'Content-Type': 'application/json' },
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SERVICE_ROLE_KEY}` // Ensure this is the correct key
              },            
              body: JSON.stringify({
                video_id: latestVideoId,
                title: youtubeData.items[0].snippet.title,
                description: youtubeData.items[0].snippet.description,
                tags: youtubeData.items[0].snippet.tags || [],
                channel_id: channel_id
              }),
            });

            console.log('generate-blog function response:', response);

          }
        }
      }
    } catch (err) {
      console.error('Error fetching video details:', err);
    }
  }


  return new Response('Blog content generated and saved', { status: 200 });
});
