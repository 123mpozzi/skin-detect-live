// Web Worker

importScripts("https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@3.16.0/dist/tf.min.js");

const modelURL = 'models/web_model-20210428-155148/model.json';
/** Whether to print memory usage in main steps */
const debugMemory = false;

/** Ask the main thread to print GPU memory usage (tensors, bytes) if debugMemory flag is set */
function printMemory() {
  if (debugMemory) self.postMessage({ table: tf.memory() });
}

/** Ask the main thread to update the STATUS message */
function info(string, prefix) {
  self.postMessage({ info: [string, prefix] });
  // TODO: Force element redraw
}

/**
 * Load deep learning model and tfjs.  
 * Place the loaded model into self.model
 */
async function loadModel() {
  info('Loading model...');
  self.model = await tf.loadGraphModel(modelURL);

  // Init tfjs
  info('Using backend: ' + tf.getBackend());
  // This fixes GPU memory leak (bytes), but inference is slower
  if (tf.getBackend() === 'webgl')
    tf.ENV.set('WEBGL_DELETE_TEXTURE_THRESHOLD', 0);
}
let modelReadyPromise = loadModel();

/**
 * Warmup the model before using real data to get a faster 1st prediction.  
 * Passing a tensor of zeros with the same size of the real inputs to the model
 * will compile all the shader programs and upload weights to the GPU,
 * thus making the first inference much faster.
 */
async function warmupModel() {
  // make sure loading is done
  await modelReadyPromise;

  info('Model warmup...');
  const inputShape = [1, self.square_size, self.square_size, 3];
  const warmupResult = await self.model.execute({ 'feature' : tf.zeros(inputShape) });
  warmupResult.dataSync(); // we don't care about the result
  warmupResult.dispose();

  info('Waiting input', 'ready');
  printMemory();
}
let modelWarmupPromise = warmupModel();


// Work
self.onmessage = async (event) => {
  const { id, ...context } = event.data;
  // The worker copies the context in its own "memory" (an object mapping name to values)
  for (const key of Object.keys(context)) {
    self[key] = context[key];
  }
  const square_size = self.square_size; // needed in init tasks

  // make sure loading is done
  await modelWarmupPromise;
  self.postMessage({ ready: true, id });
  
  if (id == 0) return; // request to just run init tasks


  // Now is the easy part, the one that is similar to working in the main thread:
  try {
    const from_pixels_base = self.from_pixels; // [tensorData, tensorShape] from main thread
    // Start Preprocessing
    info('Preprocessing...')
    const tensor = tf.tidy(() => {
      // img in 0-255
      const from_pixels = tf.tensor(from_pixels_base[0], from_pixels_base[1], 'int32');
      // Normalize to 0-1
      return from_pixels.cast('float32').div(tf.scalar(255));
    });
    printMemory();
    
    // Save pre-processed original image
    let data_shape = tensor.shape;
    let data = await tensor.data();
    self.postMessage({ topixels: [data, data_shape], id });

    // Predict
    const outcome = tf.tidy(() => {
      info('Feeding model...')
      // insert image into 4D tensor and place in dict as the feature image
      const outputs = model.execute({ 'feature' : tensor.expandDims(0) });
      // Extract image from 4D tensor and Binarize
      return outputs.squeeze(0).round();
    });
    tensor.dataSync();
    tf.dispose(tensor)

    // Get resulting image data
    info('Encoding prediction...')
    data_shape = outcome.shape;
    data = await outcome.data();
    self.postMessage({ topixels: [data, data_shape], id });
    const image_width = outcome.shape[1];
    const image_height = outcome.shape[0];
    outcome.dataSync(); // clean GPU
    tf.dispose(outcome);

    self.postMessage({ results: [null, null, image_width, image_height], id });
  } catch (error) {
    info('Predict error, refresh and retry', 'critical');
    self.postMessage({ error: error.message, id });
  }

  printMemory();
};
