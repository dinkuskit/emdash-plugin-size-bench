export function sampleCount(value, fallback, name) {
	const n = value === undefined ? fallback : Number(value);
	if (!Number.isInteger(n) || n < 1 || n > 20) throw new Error(`${name} must be an integer from 1 to 20`);
	return n;
}

export function summarize(samples) {
	return {
		attempted: samples.length,
		success: samples.filter((s) => s.ok).length,
		failed: samples.filter((s) => !s.ok).length,
		coldSamples: samples.filter((s) => s.phase === "cold").length,
		warmSamples: samples.filter((s) => s.phase === "warm").length,
		errors: samples.filter((s) => !s.ok).map((s) => `${s.phase}[${s.index}]: ${s.error}`),
	};
}
