import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { webEnv } from "@/env/web";
import {
	STOCK_SOURCES,
	type StockItem,
	type StockKind,
	type StockSearchResponse,
} from "@/stock/types";

const PAGE_SIZE = 30;
const DEFAULT_QUERY = "nature";

const searchParamsSchema = z.object({
	q: z.string().max(200).optional(),
	source: z.enum(STOCK_SOURCES).default("pexels"),
	kind: z.enum(["image", "video"]).default("image"),
});

interface PexelsPhoto {
	id: number;
	url: string;
	photographer: string;
	src: { medium: string; large2x: string };
}

interface PexelsVideo {
	id: number;
	url: string;
	image: string;
	user: { name: string };
	video_files: { link: string; quality: string | null; width: number | null }[];
}

interface PixabayHit {
	id: number;
	pageURL: string;
	user: string;
	webformatURL?: string;
	largeImageURL?: string;
	videos?: {
		medium: { url: string; thumbnail?: string };
		tiny: { url: string; thumbnail?: string };
	};
}

interface UnsplashPhoto {
	id: string;
	urls: { small: string; regular: string; full: string };
	user: { name: string };
	links: { html: string; download_location: string };
}

/** Treat empty strings and the `.env.example` placeholders as "no key" */
function getKey({ value }: { value: string | undefined }): string | null {
	if (!value || value.startsWith("your_")) return null;
	return value;
}

function pickPexelsVideoFile({ video }: { video: PexelsVideo }): string | null {
	const files = [...video.video_files].sort(
		(a, b) => (b.width ?? 0) - (a.width ?? 0),
	);
	// Prefer HD over 4K so imports stay a reasonable size
	const hd = files.find((file) => file.quality === "hd" && (file.width ?? 0) <= 1920);
	return hd?.link ?? files[0]?.link ?? null;
}

async function searchPexels({
	query,
	kind,
	apiKey,
}: {
	query: string;
	kind: StockKind;
	apiKey: string;
}): Promise<StockItem[]> {
	const params = new URLSearchParams({ query, per_page: String(PAGE_SIZE) });
	const baseUrl =
		kind === "video"
			? "https://api.pexels.com/videos/search"
			: "https://api.pexels.com/v1/search";
	const response = await fetch(`${baseUrl}?${params}`, {
		headers: { Authorization: apiKey },
	});
	if (!response.ok) throw new Error(`Pexels ${response.status}`);
	const data = await response.json();

	if (kind === "video") {
		return (data.videos as PexelsVideo[]).flatMap((video) => {
			const downloadUrl = pickPexelsVideoFile({ video });
			if (!downloadUrl) return [];
			return [
				{
					id: `pexels-video-${video.id}`,
					source: "pexels" as const,
					kind: "video" as const,
					previewUrl: video.image,
					downloadUrl,
					author: video.user.name,
					pageUrl: video.url,
				},
			];
		});
	}

	return (data.photos as PexelsPhoto[]).map((photo) => ({
		id: `pexels-photo-${photo.id}`,
		source: "pexels" as const,
		kind: "image" as const,
		previewUrl: photo.src.medium,
		downloadUrl: photo.src.large2x,
		author: photo.photographer,
		pageUrl: photo.url,
	}));
}

async function searchPixabay({
	query,
	kind,
	apiKey,
}: {
	query: string;
	kind: StockKind;
	apiKey: string;
}): Promise<StockItem[]> {
	const params = new URLSearchParams({
		key: apiKey,
		q: query,
		per_page: String(PAGE_SIZE),
		safesearch: "true",
	});
	const baseUrl =
		kind === "video" ? "https://pixabay.com/api/videos/" : "https://pixabay.com/api/";
	const response = await fetch(`${baseUrl}?${params}`);
	if (!response.ok) throw new Error(`Pixabay ${response.status}`);
	const data = await response.json();

	return (data.hits as PixabayHit[]).flatMap((hit) => {
		const previewUrl =
			kind === "video"
				? (hit.videos?.medium.thumbnail ?? hit.videos?.tiny.thumbnail)
				: hit.webformatURL;
		const downloadUrl =
			kind === "video" ? hit.videos?.medium.url : hit.largeImageURL;
		if (!previewUrl || !downloadUrl) return [];
		return [
			{
				id: `pixabay-${kind}-${hit.id}`,
				source: "pixabay" as const,
				kind,
				previewUrl,
				downloadUrl,
				author: hit.user,
				pageUrl: hit.pageURL,
			},
		];
	});
}

async function searchUnsplash({
	query,
	apiKey,
}: {
	query: string;
	apiKey: string;
}): Promise<StockItem[]> {
	const params = new URLSearchParams({ query, per_page: String(PAGE_SIZE) });
	const response = await fetch(
		`https://api.unsplash.com/search/photos?${params}`,
		{ headers: { Authorization: `Client-ID ${apiKey}` } },
	);
	if (!response.ok) throw new Error(`Unsplash ${response.status}`);
	const data = await response.json();

	return (data.results as UnsplashPhoto[]).map((photo) => ({
		id: `unsplash-${photo.id}`,
		source: "unsplash" as const,
		kind: "image" as const,
		previewUrl: photo.urls.small,
		downloadUrl: photo.urls.regular,
		author: photo.user.name,
		pageUrl: photo.links.html,
		trackUrl: photo.links.download_location,
	}));
}

export async function GET(request: NextRequest) {
	const validation = searchParamsSchema.safeParse(
		Object.fromEntries(new URL(request.url).searchParams),
	);
	if (!validation.success) {
		return NextResponse.json(
			{ error: "Invalid parameters", details: validation.error.flatten().fieldErrors },
			{ status: 400 },
		);
	}

	const { source, kind } = validation.data;
	const query = validation.data.q?.trim() || DEFAULT_QUERY;

	const apiKey = getKey({
		value:
			source === "pexels"
				? webEnv.PEXELS_API_KEY
				: source === "pixabay"
					? webEnv.PIXABAY_API_KEY
					: webEnv.UNSPLASH_ACCESS_KEY,
	});
	if (!apiKey) {
		return NextResponse.json<StockSearchResponse>({ items: [], missingKey: true });
	}

	try {
		const items =
			source === "pexels"
				? await searchPexels({ query, kind, apiKey })
				: source === "pixabay"
					? await searchPixabay({ query, kind, apiKey })
					: kind === "image"
						? await searchUnsplash({ query, apiKey })
						: [];
		return NextResponse.json<StockSearchResponse>({ items });
	} catch (error) {
		console.error("Stock search failed:", error);
		return NextResponse.json({ error: "Stock search failed" }, { status: 502 });
	}
}
