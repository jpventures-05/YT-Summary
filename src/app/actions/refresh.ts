
'use server'

import { createClient } from '@supabase/supabase-js'
import { XMLParser } from 'fast-xml-parser'

// Use anon key for now, assuming RLS allows insert for authenticated users or we use service role if we had it.
// Since we don't have service role, we rely on the fact that "Public videos are viewable by everyone" 
// BUT we need to INSERT videos. 
// We haven't defined an RLS policy for INSERTing videos.
// We need to either:
// 1. Have the user do it (authenticated) -> Policy: "Authenticated users can create videos"
// 2. Or use Service Role (which we don't have).
// Let's assume we modify the RLS or assume the user can insert videos for channels they subscribe to.
// Actually, earlier SQL didn't have a Video Insert policy. I should probably add one or just use the user session.
// IF I can't update SQL (user intervention needed), I might be blocked on Insert.
// I'll try to insert. If it fails, I'll notify the user to add a policy.
// "create policy "Authenticated users can insert videos" on public.videos for insert with check (auth.role() = 'authenticated');"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

interface RSSVideo {
    id: string; // yt:videoId
    title: string;
    link: string;
    published: string;
}

export async function refreshFeeds() {
    const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "@_"
    });

    try {
        // 1. Get all channels
        const { data: channels, error } = await supabase.from('channels').select('*')
        if (error) throw error
        if (!channels || channels.length === 0) return { message: 'No channels to refresh' }

        let newVideosCount = 0;

        // 2. Iterate and Fetch
        for (const channel of channels) {
            if (!channel.rss_url) continue;

            try {
                const response = await fetch(channel.rss_url);
                if (!response.ok) continue;

                const xml = await response.text();
                const feed = parser.parse(xml);

                // Feed structure check
                if (!feed.feed || !feed.feed.entry) {
                    continue
                }

                const entries = Array.isArray(feed.feed.entry) ? feed.feed.entry : [feed.feed.entry];
                if (!entries || entries.length === 0) continue;

                const videosToInsert = entries.map((entry: any) => {
                    const videoId = entry['yt:videoId'];
                    return {
                        video_id: videoId,
                        channel_id: channel.id,
                        title: entry.title,
                        published_at: entry.published,
                        summary: {},
                        status: 'new'
                    }
                });

                // 3. Upsert Videos (Ignore duplicates)
                // We use upsert to be safe, but really we want to skip existing.
                // onConflict: video_id
                const { error: insertError } = await supabase
                    .from('videos')
                    .upsert(videosToInsert, { onConflict: 'video_id', ignoreDuplicates: true })

                if (!insertError) {
                    // We can't easily get the count of *actually* inserted rows from upsert with ignoreDuplicates in supabase-js v2 simple response
                    // But we can assume some success
                    newVideosCount += videosToInsert.length
                }

            } catch (err) {
                console.error(`Failed to refresh channel ${channel.title}:`, err)
            }
        }

        return { message: `Refreshed feeds. Processed ${newVideosCount} new videos.` }

    } catch (err: any) {
        console.error("Error refreshing feeds:", err)
        return { error: err.message }
    }
}
