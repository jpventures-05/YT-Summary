import { Innertube, UniversalCache } from 'youtubei.js';
import { YoutubeTranscript } from 'youtube-transcript';

export interface TranscriptItem {
    text: string;
    duration: number;
    offset: number;
}

const INVIDIOUS_INSTANCES = [
    'https://inv.tux.pizza',
    'https://vid.puffyan.us',
    'https://invidious.kavin.rocks',
    'https://yt.artemislena.eu',
    'https://invidious.flokinet.to',
    'https://inv.bp.projectsegfau.lt',
    'https://yewtu.be',
    'https://invidious.privacydev.net',
    'https://invidious.drgns.space',
    'https://youtube.076.ne.jp',
    'https://invidious.jing.rocks',
    'https://invidious.nerdvpn.de'
];

export class TranscriptFetcher {
    static async fetchTranscript(videoId: string): Promise<TranscriptItem[]> {
        const errors: string[] = [];

        // 1. Try yt-dlp (via Python Proxy on Vercel, or local binary)
        try {
            console.log(`[Transcript] MODE 1: Proxy/yt-dlp for ${videoId}`);
            const result = await this.fetchWithYtDlp(videoId);
            console.log(`[Transcript] MODE 1 SUCCESS: ${result.length} items`);
            return result;
        } catch (ytDlpError: any) {
            console.warn(`[Transcript] MODE 1 FAILED: ${ytDlpError.message}`);
            errors.push(`yt-dlp: ${ytDlpError.message}`);
        }

        // 2. Try Innertube (WEB Client - often better for transcripts)
        try {
            console.log(`[Transcript] MODE 2: Innertube for ${videoId}`);
            const youtube = await Innertube.create({
                cache: new UniversalCache(false),
                generate_session_locally: true
            });

            const info = await youtube.getInfo(videoId);
            const transcriptData = await info.getTranscript();

            if (!transcriptData || !transcriptData.transcript) {
                throw new Error('No transcript found via Innertube');
            }

            // @ts-ignore - Innertube types can be tricky
            const segments = transcriptData.transcript.content?.body?.initial_segments || [];
            console.log(`[Transcript] MODE 2 SUCCESS: ${segments.length} items`);

            return segments.map((seg: any) => ({
                text: seg.snippet.text,
                offset: Number(seg.start_ms),
                duration: Number(seg.end_ms) - Number(seg.start_ms)
            }));

        } catch (innerError: any) {
            console.warn(`[Transcript] MODE 2 FAILED: ${innerError.message}`);
            errors.push(`Innertube: ${innerError.message}`);
        }

        // 3. Try youtube-transcript (Scraper - Robust)
        try {
            console.log(`[Transcript] MODE 3: youtube-transcript for ${videoId}`);
            const transcript = await YoutubeTranscript.fetchTranscript(videoId);

            if (transcript && transcript.length > 0) {
                console.log(`[Transcript] MODE 3 SUCCESS: Found ${transcript.length} items`);
                return transcript.map(item => ({
                    text: item.text,
                    offset: item.offset,
                    duration: item.duration
                }));
            }
            throw new Error('youtube-transcript returned empty');
        } catch (ytError: any) {
            console.warn(`[Transcript] MODE 3 FAILED: ${ytError.message}`);
            errors.push(`youtube-transcript: ${ytError.message}`);
        }

        // 4. Try Fallbacks (Invidious)
        const shuffled = [...INVIDIOUS_INSTANCES].sort(() => 0.5 - Math.random());
        console.log(`[Transcript] MODE 4: Invidious (Trying ${shuffled.length} nodes)`);

        for (const instance of shuffled) {
            try {
                const result = await this.fetchInvidious(videoId, instance);
                console.log(`[Transcript] MODE 4 SUCCESS via ${instance}`);
                return result;
            } catch (invError: any) {
                errors.push(`${instance.replace('https://', '')}: ${invError.message}`);
                continue;
            }
        }

        throw new Error(`ALL_METHODS_FAILED: ${errors.join(' | ')}`);
    }

    private static async fetchInvidious(videoId: string, baseUrl: string): Promise<TranscriptItem[]> {
        const response = await fetch(`${baseUrl}/api/v1/videos/${videoId}`, {
            signal: AbortSignal.timeout(8000)
        });

        if (!response.ok) throw new Error(`Invidious API Error: ${response.status}`);

        const data = await response.json();
        const captions = data.captions || [];

        const track = captions.find((t: any) => t.language === 'English') || captions[0];
        if (!track) throw new Error('No captions found on Invidious');

        const captionUrl = track.url.startsWith('http') ? track.url : `${baseUrl}${track.url}`;

        const subResponse = await fetch(captionUrl);
        const subText = await subResponse.text();
        return this.parseVtt(subText);
    }

    private static parseVtt(vtt: string): TranscriptItem[] {
        const items: TranscriptItem[] = [];
        const lines = vtt.split('\n');
        let currentStart = 0;
        let currentDur = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.includes('-->')) {
                const parts = line.split('-->');
                const start = this.parseTime(parts[0].trim());
                const end = this.parseTime(parts[1].trim());
                currentStart = start;
                currentDur = end - start;
            } else if (line && !line.startsWith('WEBVTT') && !/^\d+$/.test(line)) {
                items.push({
                    offset: currentStart,
                    duration: currentDur,
                    text: line
                });
            }
        }
        return items;
    }

    private static parseJsonTranscript(jsonText: string): TranscriptItem[] {
        try {
            const data = JSON.parse(jsonText);
            const events = data.events || [];

            return events.map((event: any) => {
                const segs = event.segs || [];
                const text = segs.map((s: any) => s.utf8).join('');
                return {
                    text,
                    offset: Number(event.tStartMs),
                    duration: Number(event.dDurationMs || 0)
                };
            }).filter((item: TranscriptItem) => item.text && item.text.trim().length > 0);
        } catch (e) {
            console.error('Failed to parse JSON transcript:', e);
            throw new Error('Failed to parse JSON transcript');
        }
    }

    private static parseTime(timeStr: string): number {
        const parts = timeStr.split(':');
        let seconds = 0;
        if (parts.length === 3) {
            seconds = parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseFloat(parts[2]);
        } else if (parts.length === 2) {
            seconds = parseInt(parts[0]) * 60 + parseFloat(parts[1]);
        } else {
            seconds = parseFloat(parts[0]);
        }
        return seconds * 1000;
    }

    private static async fetchWithYtDlp(videoId: string): Promise<TranscriptItem[]> {
        const host = process.env.VERCEL_URL || 'localhost:3000';
        const protocol = host.includes('localhost') ? 'http' : 'https';
        const baseUrl = `${protocol}://${host}`;

        try {
            console.log(`[Transcript] Calling Proxy: ${baseUrl}/api/transcript?v=${videoId}`);
            const apiRes = await fetch(`${baseUrl}/api/transcript?v=${videoId}`, {
                cache: 'no-store'
            });

            if (!apiRes.ok) {
                const text = await apiRes.text().catch(() => 'No body');
                console.error(`[Transcript] Proxy Error Status: ${apiRes.status}`);
                console.error(`[Transcript] Proxy Error Body: ${text.substring(0, 200)}`);
                throw new Error(`Proxy failed: ${apiRes.status}`);
            }

            const data = await apiRes.json();
            if (data.error) throw new Error(data.error);

            const { url, ext } = data;
            if (!url) throw new Error('No URL in proxy response');

            console.log(`[Transcript] Proxy success, fetching ${ext} from Google...`);
            const subRes = await fetch(url);
            if (!subRes.ok) throw new Error(`Google fetch failed: ${subRes.status}`);

            const text = await subRes.text();
            return ext === 'json3' ? this.parseJsonTranscript(text) : this.parseVtt(text);

        } catch (proxyErr: any) {
            console.warn(`[Transcript] yt-dlp/Proxy failed: ${proxyErr.message}`);

            if (process.env.NODE_ENV === 'development') {
                console.log('[Transcript] Dev fallback to local binary...');
                try {
                    const youtubedl = require('youtube-dl-exec');
                    const info = await youtubedl(`https://www.youtube.com/watch?v=${videoId}`, {
                        dumpSingleJson: true,
                        noWarnings: true,
                        noCheckCertificates: true,
                        preferFreeFormats: true
                    });
                    const subtitles = info.automatic_captions || info.subtitles;
                    const enSubs = subtitles['en'] || subtitles['en-orig'] || subtitles['en-US'];
                    const subTrack = enSubs.find((s: any) => s.ext === 'json3') || enSubs[0];
                    const subRes = await fetch(subTrack.url);
                    const text = await subRes.text();
                    return subTrack.ext === 'json3' ? this.parseJsonTranscript(text) : this.parseVtt(text);
                } catch (binErr: any) {
                    console.error('[Transcript] Local binary failed:', binErr.message);
                }
            }
            throw proxyErr;
        }
    }
}
