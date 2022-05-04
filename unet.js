// Web Worker

importScripts("https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@3.16.0/dist/tf.min.js");

const modelURL = '/models/web_model-20210428-155148/model.json';
const debugMemory = false;

// Print GPU memory usage (tensors, bytes)
function printMemory() {
  if (debugMemory) self.postMessage({ table: tf.memory() });
}

function info(string) {
  self.postMessage({ info: string });
  // TODO: Force element redraw
}

// Fetch deep learning model
async function loadModel() {
  // Init tfjs
  info('Using backend: ' + tf.getBackend());
  // This fixes GPU memory leak (bytes), but inference is slower
  if (tf.getBackend() === 'webgl')
    tf.ENV.set('WEBGL_DELETE_TEXTURE_THRESHOLD', 0);
  
  info('Loading model...');
  self.model =  await tf.loadGraphModel(modelURL);
}
let modelReadyPromise = loadModel();
// Warmup the model before using real data to get a faster 1st prediction
async function warmupModel() {
  // make sure loading is done
  await modelReadyPromise;

  info('Model warmup...');
  const inputShape = [1, self.square_size, self.square_size, 3];
  const warmupResult = await self.model.execute({ 'feature' : tf.zeros(inputShape) });
  warmupResult.dataSync(); // we don't care about the result
  warmupResult.dispose();

  info('Ready, Waiting input');
  printMemory();
}
let modelWarmupPromise = warmupModel();

self.onmessage = async (event) => {
  const { id, ...context } = event.data;
  // The worker copies the context in its own "memory" (an object mapping name to values)
  for (const key of Object.keys(context)) {
    self[key] = context[key];
  }
  const square_size = self.square_size;

  // make sure loading is done
  await modelWarmupPromise;
  
  if (id == 0) return; // request to just init python and pyodide


  // Now is the easy part, the one that is similar to working in the main thread:
  try {
    const canvas = self.canvas;
    const ori_data = self.ori_data;

//TODO: canvas cannot be passed to web worker - run tf.from/topixels from main thread?

    // Start Preprocessing
    info('Preprocessing...')
    const tensor = tf.tidy(() => {
      // Now that image has dimensions, finally get image pixels
      //const squared_image = imageToSquare(img_ori, square_size);
      let result = tf.browser.fromPixels(squared_image); // img in 0-255
      // Normalize to 0-1
      result = result.cast('float32').div(tf.scalar(255));
      return result;
    });
    printMemory();
    
    // Save pre-processed original image
    canvas.width = tensor.shape[1]
    canvas.height = tensor.shape[0]
    await tf.browser.toPixels(tensor, canvas);
    const ori_data_post = canvas.toDataURL() // will return the base64 encoding

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
    const image_width = outcome.shape[1];
    const image_height = outcome.shape[0];
    canvas.width = image_width;
    canvas.height = image_height;
    await tf.browser.toPixels(outcome, canvas);
    outcome.dataSync(); // clean GPU
    tf.dispose(outcome);
    const img_data = canvas.toDataURL() // will return the base64 encoding


    self.postMessage({ results: [img_data, ori_data_post, image_width, image_height], id });

    // clean memory
    //img_data.destroy();
    //ori_data.destroy();
  } catch (error) {
    info('Critical: error on predict, refresh and retry');
    self.postMessage({ error: error.message, id });
  }

  printMemory();
};
