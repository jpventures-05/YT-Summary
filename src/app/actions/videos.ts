'use server'

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export async function fetchVideos(offset: number, limit: number, channelId?: string, channelIds?: string[]) {
    let query = supabase
        .from('videos')
        .select('*')
        .order('published_at', { ascending: false })
        .range(offset, offset + limit - 1)

    if (channelId) {
        query = query.eq('channel_id', channelId)
    } else if (channelIds && channelIds.length > 0) {
        query = query.in('channel_id', channelIds)
    }

    const { data, error } = await query

    if (error) {
        console.error('Error fetching videos:', error)
        return []
    }

    return data
}
