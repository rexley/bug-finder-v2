export const MODEL_ID = 'Xenova/mobileclip_s0';
export const LIBRARY_URL = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.min.js';

// MobileCLIP publishes two encoders, not the combined model.onnx expected by
// the generic CLIP pipeline in Transformers.js 3.8.1.
export async function loadBugModel(labels, onProgress = () => {}, library) {
  const lib = library ?? await import(LIBRARY_URL);
  const { env, AutoTokenizer, AutoProcessor, CLIPTextModelWithProjection,
    CLIPVisionModelWithProjection, RawImage } = lib;
  env.allowLocalModels = false;
  env.backends.onnx.wasm.numThreads = 1;
  env.backends.onnx.wasm.proxy = false;
  let textModel, visionModel;
  try {
    const options = { device: 'wasm', progress_callback: onProgress };
    const tokenizer = await AutoTokenizer.from_pretrained(MODEL_ID, options);
    const processor = await AutoProcessor.from_pretrained(MODEL_ID, options);
    textModel = await CLIPTextModelWithProjection.from_pretrained(MODEL_ID, {
      ...options, model_file_name: 'text_model', dtype: 'q8',
    });
    const textInput = tokenizer(labels, { padding: 'max_length', truncation: true });
    const { text_embeds } = await textModel(textInput);
    const embeddings = text_embeds.tolist().map(normalize);
    text_embeds.dispose?.();
    for (const tensor of Object.values(textInput)) tensor.dispose?.();
    await textModel.dispose();
    textModel = null;
    // Preserve this model's recommended full-precision vision encoder.
    visionModel = await CLIPVisionModelWithProjection.from_pretrained(MODEL_ID, {
      ...options, model_file_name: 'vision_model', dtype: 'fp32',
    });
    const classify = async (image) => {
      const input = await processor(await RawImage.read(image));
      let output;
      try {
        output = await visionModel(input);
        return scoreEmbeddings(output.image_embeds.tolist()[0], embeddings, labels);
      } finally {
        for (const tensor of Object.values(input)) tensor.dispose?.();
        if (output) for (const tensor of Object.values(output)) tensor.dispose?.();
      }
    };
    classify.dispose = () => visionModel.dispose();
    return classify;
  } catch (error) {
    await textModel?.dispose().catch(() => {});
    await visionModel?.dispose().catch(() => {});
    throw error;
  }
}

function normalize(values) {
  const norm = Math.hypot(...values) || 1;
  return values.map(value => value / norm);
}

export function scoreEmbeddings(image, texts, labels) {
  const vector = normalize(image);
  // Standard CLIP cosine logits. These are relative scores, not probabilities
  // of a real-world insect; the strict detector still requires repeated checks.
  const logits = texts.map(text => 100 * normalize(text).reduce((sum, value, i) => sum + value * vector[i], 0));
  const max = Math.max(...logits);
  const weights = logits.map(value => Math.exp(value - max));
  const sum = weights.reduce((a, b) => a + b, 0);
  return labels.map((label, i) => ({ label, score: weights[i] / sum })).sort((a, b) => b.score - a.score);
}
