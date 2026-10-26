"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEditor } from "@/editor/use-editor";
import { importMediaFromUrl } from "@/media/import-from-url";
import {
	STOCK_SOURCE_LABELS,
	STOCK_SOURCES,
	type StockItem,
	type StockKind,
	type StockSearchResponse,
	type StockSource,
} from "@/stock/types";
import { cn } from "@/utils/ui";
import { Image01Icon, PlayIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

const SEARCH_DEBOUNCE_MS = 400;

const ENV_KEY_BY_SOURCE: Record<StockSource, string> = {
	pexels: "PEXELS_API_KEY",
	pixabay: "PIXABAY_API_KEY",
	unsplash: "UNSPLASH_ACCESS_KEY",
};

function getFileName({ item }: { item: StockItem }): string {
	const author = item.author.replace(/[^\w-]+/g, "");
	const extension = item.kind === "video" ? "mp4" : "jpg";
	return `${item.id}-${author}.${extension}`;
}

export function StockView() {
	const editor = useEditor();
	const [query, setQuery] = useState("");
	const [source, setSource] = useState<StockSource>("pexels");
	const [kind, setKind] = useState<StockKind>("image");
	const [items, setItems] = useState<StockItem[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [missingKey, setMissingKey] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [importingId, setImportingId] = useState<string | null>(null);

	const supportsVideo = source !== "unsplash";
	const effectiveKind: StockKind = supportsVideo ? kind : "image";

	useEffect(() => {
		const controller = new AbortController();
		const timeoutId = setTimeout(async () => {
			setIsLoading(true);
			setError(null);
			try {
				const params = new URLSearchParams({
					q: query,
					source,
					kind: effectiveKind,
				});
				const response = await fetch(`/api/stock/search?${params}`, {
					signal: controller.signal,
				});
				if (!response.ok) throw new Error(`Search failed (${response.status})`);
				const data = (await response.json()) as StockSearchResponse;
				setItems(data.items);
				setMissingKey(Boolean(data.missingKey));
			} catch (searchError) {
				if (controller.signal.aborted) return;
				setItems([]);
				setError(
					searchError instanceof Error ? searchError.message : "Search failed",
				);
			} finally {
				if (!controller.signal.aborted) setIsLoading(false);
			}
		}, SEARCH_DEBOUNCE_MS);

		return () => {
			controller.abort();
			clearTimeout(timeoutId);
		};
	}, [query, source, effectiveKind]);

	async function addItem({ item }: { item: StockItem }) {
		if (importingId) return;
		setImportingId(item.id);
		try {
			await toast.promise(
				importMediaFromUrl({
					editor,
					url: item.downloadUrl,
					name: getFileName({ item }),
					trackUrl: item.trackUrl,
				}),
				{
					loading: `Downloading from ${STOCK_SOURCE_LABELS[item.source]}...`,
					success: "Added to media and timeline",
					error: (importError) =>
						importError instanceof Error ? importError.message : "Download failed",
				},
			).unwrap();
		} catch (importError) {
			console.error("Stock import failed:", importError);
		} finally {
			setImportingId(null);
		}
	}

	return (
		<div className="flex h-full flex-col py-2">
			<div className="px-2">
				<Input
					size="sm"
					placeholder={`Search ${STOCK_SOURCE_LABELS[source]}...`}
					value={query}
					onChange={(event) => setQuery(event.target.value)}
					showClearIcon
					onClear={() => setQuery("")}
					className="w-full"
					containerClassName="w-full"
				/>
			</div>

			<Tabs
				value={source}
				onValueChange={(value) => setSource(value as StockSource)}
				variant="underline"
				className="mt-2"
			>
				<TabsList aria-label="Stock sources">
					{STOCK_SOURCES.map((stockSource) => (
						<TabsTrigger key={stockSource} value={stockSource}>
							{STOCK_SOURCE_LABELS[stockSource]}
						</TabsTrigger>
					))}
				</TabsList>
			</Tabs>

			<div className="flex gap-1 px-2 pt-2">
				{(["image", "video"] as const).map((option) => (
					<button
						key={option}
						type="button"
						disabled={option === "video" && !supportsVideo}
						onClick={() => setKind(option)}
						className={cn(
							"rounded-md px-2 py-1 text-xs disabled:opacity-40",
							effectiveKind === option
								? "bg-accent text-foreground"
								: "text-muted-foreground hover:text-foreground",
						)}
					>
						{option === "image" ? "Photos" : "Videos"}
					</button>
				))}
			</div>

			<div className="min-h-0 flex-1 overflow-y-auto px-2 pt-2">
				{missingKey ? (
					<StockMessage
						title="API key missing"
						description={`Add ${ENV_KEY_BY_SOURCE[source]} to apps/web/.env.local and restart bun dev:web.`}
					/>
				) : error ? (
					<StockMessage title="Something went wrong" description={error} />
				) : isLoading && items.length === 0 ? (
					<div className="flex justify-center py-8">
						<Spinner className="text-muted-foreground size-6" />
					</div>
				) : items.length === 0 ? (
					<StockMessage title="No results" description="Try another search." />
				) : (
					<div className="grid grid-cols-2 gap-2 pb-4">
						{items.map((item) => (
							<button
								key={item.id}
								type="button"
								onClick={() => addItem({ item })}
								disabled={importingId !== null}
								title={`${item.author} · ${STOCK_SOURCE_LABELS[item.source]}`}
								className="group relative overflow-hidden rounded-md bg-accent disabled:cursor-wait"
							>
								{/* biome-ignore lint/performance/noImgElement: remote thumbnails from several CDNs */}
								<img
									src={item.previewUrl}
									alt={item.author}
									loading="lazy"
									className="aspect-video w-full object-cover transition-opacity group-hover:opacity-80"
								/>
								{item.kind === "video" && (
									<HugeiconsIcon
										icon={PlayIcon}
										className="absolute left-1.5 top-1.5 size-4 text-white drop-shadow"
									/>
								)}
								{importingId === item.id && (
									<div className="absolute inset-0 flex items-center justify-center bg-black/40">
										<Spinner className="size-5 text-white" />
									</div>
								)}
								<span className="absolute inset-x-0 bottom-0 truncate bg-black/50 px-1.5 py-0.5 text-left text-[10px] text-white opacity-0 group-hover:opacity-100">
									{item.author}
								</span>
							</button>
						))}
					</div>
				)}
			</div>
		</div>
	);
}

function StockMessage({
	title,
	description,
}: {
	title: string;
	description: string;
}) {
	return (
		<div className="flex flex-col items-center gap-3 p-4 text-center">
			<HugeiconsIcon icon={Image01Icon} className="text-muted-foreground size-10" />
			<p className="text-lg font-medium">{title}</p>
			<p className="text-muted-foreground text-sm text-balance">{description}</p>
		</div>
	);
}
