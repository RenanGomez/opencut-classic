import {
	AudioBufferSource,
	BufferTarget,
	canEncodeAudio,
	Mp3OutputFormat,
	Output,
	WavOutputFormat,
} from "mediabunny";
import { registerMp3Encoder } from "@mediabunny/mp3-encoder";
import type { EditorCore } from "@/core";
import { createTimelineAudioBuffer } from "@/media/audio";
import type { ExportQuality } from "./index";

export const AUDIO_EXPORT_FORMAT_VALUES = ["mp3", "wav"] as const;

export type AudioExportFormat = (typeof AUDIO_EXPORT_FORMAT_VALUES)[number];

export const AUDIO_EXPORT_MIME_TYPES: Record<AudioExportFormat, string> = {
	mp3: "audio/mpeg",
	wav: "audio/wav",
};

const MP3_BITRATES: Record<ExportQuality, number> = {
	low: 128_000,
	medium: 192_000,
	high: 256_000,
	very_high: 320_000,
};

export function isAudioExportFormat(
	value: string,
): value is AudioExportFormat {
	return AUDIO_EXPORT_FORMAT_VALUES.some((formatValue) => formatValue === value);
}

let mp3EncoderReady: Promise<void> | null = null;

/** Browsers have no native MP3 encoder, so fall back to the LAME WASM build */
function ensureMp3Encoder(): Promise<void> {
	mp3EncoderReady ??= (async () => {
		if (!(await canEncodeAudio("mp3"))) {
			registerMp3Encoder();
		}
	})();
	return mp3EncoderReady;
}

/**
 * Mixes every audible element on the active scene's timeline (trims, retime,
 * animated volume such as fades, mastering) and encodes it as an audio file.
 */
export async function exportTimelineAudio({
	editor,
	format,
	quality,
}: {
	editor: EditorCore;
	format: AudioExportFormat;
	quality: ExportQuality;
}): Promise<ArrayBuffer> {
	const audioBuffer = await createTimelineAudioBuffer({
		tracks: editor.scenes.getActiveScene().tracks,
		mediaAssets: editor.media.getAssets(),
		duration: editor.timeline.getTotalDuration(),
	});
	if (!audioBuffer) {
		throw new Error("The timeline has no audio to export");
	}

	if (format === "mp3") {
		await ensureMp3Encoder();
	}

	const target = new BufferTarget();
	const output = new Output({
		format: format === "mp3" ? new Mp3OutputFormat() : new WavOutputFormat(),
		target,
	});
	const source = new AudioBufferSource(
		format === "mp3"
			? { codec: "mp3", bitrate: MP3_BITRATES[quality] }
			: { codec: "pcm-s16" },
	);
	output.addAudioTrack(source);

	await output.start();
	await source.add(audioBuffer);
	source.close();
	await output.finalize();

	if (!target.buffer) {
		throw new Error("Audio encoding produced no data");
	}
	return target.buffer;
}
