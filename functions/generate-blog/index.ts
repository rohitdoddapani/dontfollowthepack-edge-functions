import { serve } from 'https://deno.land/std@0.152.0/http/server.ts'; // Use the latest version
// import { config } from 'https://deno.land/x/dotenv/mod.ts';
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.44.4";

// const { URL, SERVICE_ROLE_KEY, OPENAI_API_KEY } = config();

const URL = Deno.env.get('URL');
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY');

console.log(URL, SERVICE_ROLE_KEY);


serve(async (req) => {
  const { video_id, title, description, tags, channel_id } = await req.json();


  // Call OpenAI API to generate blog content
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an assistant that generates blog posts.'
        },
        {
          role: 'user',
          content: `Generate a blog post based on the following details:\nTitle: ${title}\nDescription: ${description}\nTags: ${tags.join(', ')}\n\nRespond in JSON format like this:\n{\n  "title": "New Title",\n  "short_desc": "Short description",\n  "content": "Full blog content with additional images in HTML format",\n  "tags": "Comma-separated tags",\n  "video_id": "${video_id}"\n}`
        }
      ],
      max_tokens: 500,
      temperature: 0.7,
    }),
  });

  const result = await response.json();
  // console.log('result',result);
  // console.log(result.choices[0]);
  const x = result.choices[0].message.content;
  // console.log('x',x);
  const blogData = JSON.parse(x);
  blogData.channel_id = channel_id; 

  console.log(blogData);
  // Save blog data to Supabase
  const supabase = createClient(URL,SERVICE_ROLE_KEY);

  console.log(`${URL}`,`${SERVICE_ROLE_KEY}`);
  
  const { error } = await supabase
    .from('blogs')
    .insert([blogData]);

  if (error) return new Response(JSON.stringify(error,blogData), { status: 400 });
  // return new Response(JSON.stringify([blogData,OPENAI_API_KEY,'key-end']), { status: 200 });

  return new Response('Blog content generated and saved', { status: 200 });
});
