import type { EditorCore } from "@/core";
import { BatchCommand } from "@/commands";
import { AddMediaAssetCommand } from "@/commands/media";
import { InsertElementCommand } from "@/commands/timeline";
import { processMediaAssets } from "@/media/processing";
import { DEFAULT_NEW_ELEMENT_DURATION } from "@/timeline/creation";
import { buildElementFromMedia } from "@/timeline/element-utils";
import { mediaTimeFromSeconds } from "@/wasm";

/**
 * Downloads a remote file through the same-origin stock proxy, adds it to the
 * project's media and places it on the timeline at the playhead (one undo step).
 */
export async function importMediaFromUrl({
	editor,
	url,
	name,
	trackUrl,
}: {
	editor: EditorCore;
	url: string;
	name: string;
	trackUrl?: string;
}): Promise<string> {
	const activeProject = editor.project.getActive();
	if (!activeProject) throw new Error("No active project");

	const params = new URLSearchParams({ url });
	if (trackUrl) params.set("track", trackUrl);
	const response = await fetch(`/api/stock/download?${params}`);
	if (!response.ok) throw new Error(`Download failed (${response.status})`);

	const blob = await response.blob();
	const file = new File([blob], name, { type: blob.type });
	const [asset] = await processMediaAssets({ files: [file] });
	if (!asset) throw new Error("Unsupported file type");

	const addMediaCmd = new AddMediaAssetCommand({
		projectId: activeProject.metadata.id,
		asset,
	});
	const duration =
		asset.duration != null
			? mediaTimeFromSeconds({ seconds: asset.duration })
			: DEFAULT_NEW_ELEMENT_DURATION;
	const element = buildElementFromMedia({
		mediaId: addMediaCmd.getAssetId(),
		mediaType: asset.type,
		name: asset.name,
		duration,
		startTime: editor.playback.getCurrentTime(),
		buffer:
			asset.type === "audio"
				? new AudioBuffer({ length: 1, sampleRate: 44100 })
				: undefined,
	});
	const insertCmd = new InsertElementCommand({
		element,
		placement: {
			mode: "auto",
			trackType: asset.type === "audio" ? "audio" : "video",
		},
	});
	editor.command.execute({
		command: new BatchCommand([addMediaCmd, insertCmd]),
	});

	return asset.name;
}
