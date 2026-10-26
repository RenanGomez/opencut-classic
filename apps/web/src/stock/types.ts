export const STOCK_SOURCES = ["pexels", "pixabay", "unsplash"] as const;

export type StockSource = (typeof STOCK_SOURCES)[number];

export type StockKind = "image" | "video";

export interface StockItem {
	id: string;
	source: StockSource;
	kind: StockKind;
	previewUrl: string;
	downloadUrl: string;
	author: string;
	pageUrl: string;
	/** Unsplash requires pinging this endpoint whenever a photo is used */
	trackUrl?: string;
}

export interface StockSearchResponse {
	items: StockItem[];
	/** Set when the source has no API key configured */
	missingKey?: boolean;
}

export const STOCK_SOURCE_LABELS: Record<StockSource, string> = {
	pexels: "Pexels",
	pixabay: "Pixabay",
	unsplash: "Unsplash",
};

export const STOCK_DOWNLOAD_HOSTS = [
	"images.pexels.com",
	"videos.pexels.com",
	"pixabay.com",
	"cdn.pixabay.com",
	"images.unsplash.com",
	"plus.unsplash.com",
];
