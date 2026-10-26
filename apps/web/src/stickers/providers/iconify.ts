import { buildStickerId, parseStickerId } from "../sticker-id";
import type {
	StickerBrowseResult,
	StickerItem,
	StickerProvider,
	StickerSearchResult,
} from "../types";

const ICONIFY_API_URL = "https://api.iconify.design";
const DEFAULT_SEARCH_LIMIT = 64;
const PREVIEW_SIZE = 96;
const DEFAULT_RESOLVE_SIZE = 512;

interface IconifySearchResponse {
	icons: string[];
	total: number;
}

const EMPTY_SEARCH_RESPONSE: IconifySearchResponse = { icons: [], total: 0 };

function buildIconUrl({ icon, size }: { icon: string; size: number }): string {
	const [prefix, name] = icon.split(":");
	return `${ICONIFY_API_URL}/${encodeURIComponent(prefix)}/${encodeURIComponent(name)}.svg?width=${size}&height=${size}`;
}

function getIconName({ icon }: { icon: string }): string {
	return icon.split(":")[1]?.replaceAll("-", " ") ?? icon;
}

export function createIconifyProvider({
	id,
	prefixes,
	browseQuery,
}: {
	id: string;
	prefixes: string[];
	browseQuery: string;
}): StickerProvider {
	function toStickerItem({ icon }: { icon: string }): StickerItem {
		return {
			id: buildStickerId({ providerId: id, providerValue: icon }),
			provider: id,
			name: getIconName({ icon }),
			previewUrl: buildIconUrl({ icon, size: PREVIEW_SIZE }),
			metadata: { icon, collection: icon.split(":")[0] },
		};
	}

	async function searchIcons({
		query,
		limit,
	}: {
		query: string;
		limit: number;
	}): Promise<IconifySearchResponse> {
		const normalizedQuery = query.trim() || browseQuery;
		const params = new URLSearchParams({
			query: normalizedQuery,
			// Iconify rejects limits below 32
			limit: String(Math.max(32, limit)),
			prefixes: prefixes.join(","),
		});

		try {
			const response = await fetch(`${ICONIFY_API_URL}/search?${params}`);
			if (!response.ok) {
				return EMPTY_SEARCH_RESPONSE;
			}
			const data = (await response.json()) as Partial<IconifySearchResponse>;
			const icons = (data.icons ?? []).slice(0, limit);
			return { icons, total: data.total ?? icons.length };
		} catch (error) {
			console.error(`Iconify search failed for "${id}":`, error);
			return EMPTY_SEARCH_RESPONSE;
		}
	}

	return {
		id,
		async search({ query, options }): Promise<StickerSearchResult> {
			const limit = options?.limit ?? DEFAULT_SEARCH_LIMIT;
			const { icons, total } = await searchIcons({ query, limit });
			return {
				items: icons.map((icon) => toStickerItem({ icon })),
				total,
				hasMore: total > icons.length,
			};
		},
		async browse({ options }): Promise<StickerBrowseResult> {
			const limit = options?.limit ?? DEFAULT_SEARCH_LIMIT;
			const { icons, total } = await searchIcons({ query: browseQuery, limit });
			return {
				sections: [
					{
						id: "all",
						items: icons.map((icon) => toStickerItem({ icon })),
						hasMore: total > icons.length,
						layout: "grid",
					},
				],
			};
		},
		resolveUrl({ stickerId, options }): string {
			const { providerValue } = parseStickerId({ stickerId });
			return buildIconUrl({
				icon: providerValue,
				size: options?.width ?? DEFAULT_RESOLVE_SIZE,
			});
		},
	};
}

// Only collections whose licenses allow commercial use without attribution
export const emojiProvider = createIconifyProvider({
	id: "emoji",
	prefixes: ["fluent-emoji", "noto"],
	browseQuery: "face",
});

export const iconsProvider = createIconifyProvider({
	id: "icons",
	prefixes: ["mdi", "tabler", "lucide", "ph"],
	browseQuery: "star",
});
