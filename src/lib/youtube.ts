
import * as cheerio from 'cheerio';

export interface ChannelInfo {
    id: string;
    title: string;
    description: string;
    thumbnailUrl: string;
    rssUrl: string;
    customUrl: string;
}

export async function resolveChannelInfo(url: string): Promise<ChannelInfo | null> {
    try {
        // 1. Basic validation
        if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
            throw new Error('Invalid YouTube URL');
        }

        // 2. Fetch the channel page
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch channel page: ${response.statusText}`);
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        // 3. Extract Metadata
        // YouTube usually puts the channelId in a meta tag
        const channelId = $('meta[itemprop="channelId"]').attr('content');
        const title = $('meta[property="og:title"]').attr('content') || $('title').text().replace(' - YouTube', '');
        const description = $('meta[property="og:description"]').attr('content') || '';
        const thumbnailUrl = $('meta[property="og:image"]').attr('content') || '';
        const rssUrl = channelId ? `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}` : '';

        if (!channelId) {
            // Fallback: Try to find standard RSS link tag which some pages have
            const rssLink = $('link[rel="alternate"][type="application/rss+xml"]').attr('href');
            if (rssLink) {
                // rssLink is usually like ...?channel_id=XYZ
                const idMatch = rssLink.match(/channel_id=([^&]+)/);
                if (idMatch) {
                    return {
                        id: idMatch[1],
                        title,
                        description,
                        thumbnailUrl,
                        rssUrl: rssLink,
                        customUrl: url
                    };
                }
            }
            throw new Error('Could not find Channel ID');
        }

        return {
            id: channelId,
            title,
            description,
            thumbnailUrl,
            rssUrl,
            customUrl: url
        };

    } catch (error) {
        console.error('Error resolving channel:', error);
        return null;
    }
}
