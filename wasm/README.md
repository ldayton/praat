# Spectrogram WebAssembly experiment

This branch adds an array-oriented C adapter around `Sound_to_Spectrogram_e`.
The upstream algorithm is unchanged. The module has no main entry point and
runs analysis in single-thread mode; browser integration should instantiate it
inside a Web Worker. A message-based browser Worker adapter is included; no microphone or Soundglow integration is included yet.

## Build and test

Install and activate Emscripten 6.0.12 with emsdk, then:

```sh
source /path/to/emsdk/emsdk_env.sh
python3 wasm/build.py
node wasm/test.cjs
```

`JOBS=4 python3 wasm/build.py` limits compiler concurrency. Outputs are ignored
under `wasm/build/`: `praat-spectrogram.js` and `praat-spectrogram.wasm`.
The SDK zlib port is used because upstream's vendored zlib headers omit zconf.h.
`sources.txt` starts from the native probe's linker dependency set; reducing it
and removing incidental object-system dependencies are follow-up work.

## Browser Worker

Serve the repository over HTTP and construct `new Worker('wasm/worker.js')`.
Send `{id, pcm: Float32Array, sampleRate: 44100}` (optionally transfer the PCM
buffer). The reply contains the same id, dimensions, frame coordinates and a
transferred `power` array, or `{id, error}`. Calls are serialized within each
worker. No SharedArrayBuffer, pthreads, or cross-origin isolation is required.
Open `wasm/demo.html` on that server for a one-click browser Worker smoke test.
The test passed in the Codex in-app browser with the same tone metadata and
peak as Node/native; the first local run took 41 ms including module loading.
That is a desktop smoke test, not a mobile performance benchmark.

## Initial validation

With Emscripten 6.0.12, the Node smoke test passes for a 1 kHz tone, silence,
invalid parameters and a too-short buffer. The tone matches the native probe's
191 frames, 325 bins, 5 ms time step, 10.7666015625 Hz frequency step and
1001.2939453125 Hz peak. This is metadata/peak agreement, not yet a full
native-vs-WASM power-matrix comparison. Initial uncompressed output is roughly
4.6 MB WASM + 70 KB JavaScript; size and performance optimization remain.

## Interface

Instantiate the generated `PraatSpectrogram` module. Allocate input with
`_malloc(length * 4)`, copy mono float PCM into `HEAPF32`, then call:

```
_sg_analyse(pointer, length, sampleRate, windowSeconds,
            maximumFrequencyHz, minimumTimeStepSeconds, minimumFrequencyStepHz)
```

Returns 0 on success or -1 on error. `_sg_error()` points to a UTF-8 error string.
C++ exceptions are caught inside the adapter. Inputs and outputs live in WASM
memory, not JavaScript memory; obtain fresh `HEAPF32` views after analysis in
case memory growth replaced the backing buffer.

Result accessors:

- `_sg_frames()`, `_sg_bins()`
- `_sg_first_time()`, `_sg_time_step()` (seconds)
- `_sg_first_frequency()`, `_sg_frequency_step()` (Hz)
- `_sg_data()` (float power spectral density, time-major: `t * bins + f`)

Output belongs to the module and is replaced by the next analysis call. Copy it
before another call; free the caller-owned input with `_free()`.
There is one module-global result, so serialize requests per instance.

The wrapper currently uses a Gaussian window and time/frequency oversampling
limits of 8. Praat's Gaussian window consumes twice its effective duration:
a 25 ms setting needs 50 ms of input. Short buffers return an error.
Results use Praat's power normalization, not Web Audio AnalyserNode's dB scale.
Do not apply microphone physical-unit calibration claims to uncalibrated PCM.

## Scope and next steps

- Validate native-vs-WASM power values across tone, silence and speech fixtures.
- Establish an absolute frame grid and overlap policy before live streaming.
- Benchmark mobile execution, allocation cost, module size and batch latency.
- Make a browser Worker demo, then evaluate integration into Soundglow.

The code is distributed under the same GPL-3.0-or-later terms as the spectrogram
source it wraps. Keep upstream notices and provide corresponding source when
redistributing a compiled module.
