'use server'

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export async function getSubscriptions(userId: string) {
    const { data, error } = await supabase
        .from('subscriptions')
        .select(`
            id,
            areas,
            channels (
                id,
                title,
                thumbnail_url
            )
        `)
        .eq('user_id', userId)

    if (error) throw error
    return data
}

export async function deleteSubscription(subscriptionId: string) {
    const { error } = await supabase
        .from('subscriptions')
        .delete()
        .eq('id', subscriptionId)

    if (error) throw error
    return { success: true }
}
