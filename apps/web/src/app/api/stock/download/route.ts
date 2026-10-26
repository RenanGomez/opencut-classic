import { type NextRequest, NextResponse } from "next/server";
import { webEnv } from "@/env/web";
import { STOCK_DOWNLOAD_HOSTS } from "@/stock/types";

const UNSPLASH_API_ORIGIN = "https://api.unsplash.com";

function parseAllowedUrl({ value }: { value: string | null }): URL | null {
	if (!value) return null;
	try {
		const url = new URL(value);
		if (url.protocol !== "https:") return null;
		return STOCK_DOWNLOAD_HOSTS.includes(url.hostname) ? url : null;
	} catch {
		return null;
	}
}

/**
 * Proxies stock downloads so the browser gets a same-origin file (no CORS issues).
 * Only hosts in STOCK_DOWNLOAD_HOSTS are fetched, so this is not an open proxy.
 */
export async function GET(request: NextRequest) {
	const { searchParams } = new URL(request.url);
	const url = parseAllowedUrl({ value: searchParams.get("url") });
	if (!url) {
		return NextResponse.json({ error: "Host not allowed" }, { status: 400 });
	}

	const trackUrl = searchParams.get("track");
	const unsplashKey = webEnv.UNSPLASH_ACCESS_KEY;
	if (trackUrl?.startsWith(`${UNSPLASH_API_ORIGIN}/`) && unsplashKey) {
		void fetch(trackUrl, {
			headers: { Authorization: `Client-ID ${unsplashKey}` },
		}).catch((error) => console.error("Unsplash download tracking failed:", error));
	}

	const upstream = await fetch(url);
	const finalUrl = parseAllowedUrl({ value: upstream.url });
	if (!upstream.ok || !upstream.body || !finalUrl) {
		return NextResponse.json({ error: "Download failed" }, { status: 502 });
	}

	return new NextResponse(upstream.body, {
		headers: {
			"Content-Type":
				upstream.headers.get("Content-Type") ?? "application/octet-stream",
		},
	});
}
