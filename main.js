// Image Slider Behavior
function slide() {
  let slideValue = document.getElementById("slider").value;

  document.getElementById("imgbox").style.clipPath = "polygon(0 0," + slideValue + "% 0," + slideValue + "% 100%, 0 100%)";
}


// Pre-defined Samples

/**
 * List of pre-defined image samples  
 * (taken from websites which host the images on their domain, so
 * CORS is not an issue)
 */
const sample_list = [
  'https://upload.wikimedia.org/wikipedia/commons/thumb/d/db/Jennifer_Lawrence_TIFF_2%2C_2012.jpg/330px-Jennifer_Lawrence_TIFF_2%2C_2012.jpg',
  'https://i.imgur.com/S2lYrKD.gif',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=387&q=80',
  'https://upload.wikimedia.org/wikipedia/commons/d/d9/Morgan_Freeman_Cannes.jpg',
  'https://i.imgur.com/mDtRHQ5.jpeg',
  'https://i.imgur.com/4YnIDaG.jpeg',
  'https://i.imgur.com/EpqnLEq.jpeg',
  'https://i.imgur.com/5vDG9WQ.jpeg',
  'https://i.imgur.com/3sVZJel.jpeg',
  'https://i.imgur.com/Jzzdksj.jpeg',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Halle_Berry_by_Gage_Skidmore_2.jpg/330px-Halle_Berry_by_Gage_Skidmore_2.jpg',
  'https://live.staticflickr.com/65535/49866975356_962dbee9f7_z.jpg',
  'https://live.staticflickr.com/2277/2949090369_a05ec7ab18_z.jpg',
  'https://live.staticflickr.com/3085/2731117809_5f1ebddca4.jpg'
];
/**
 * Get a random URL from the image samples
 * @returns URL of a sample image
 */
function getRandomSample() {
  return sample_list[Math.floor(Math.random()*sample_list.length)];
}
/**
 * Update the search input with a random URL from the image samples
 */
function insertRandom() {
  document.getElementById("name").value = getRandomSample();
}
/**
 * Get the list of pre-defined image samples
 * @returns Pre-defined image samples
 */
function getSamples() {
  return sample_list;
}


// Utilities

/**
 * Whether the given URL is valid
 * @param {String} string String representing the URL to check
 * @returns true if the given string is a valid URL, false otherwise
 */
function isValidHttpUrl(string) {
  let url;
  
  try {
    url = new URL(string);
  } catch (_) {
    return false;  
  }

  return url.protocol === "http:" || url.protocol === "https:";
}
let debugInfo = false;
/**
 * Update the STATUS message, and also print to console
 * @param {String} string New STATUS message
 */
function info(string, prefix) {
  if (debugInfo) console.log(string)
  if (prefix === undefined) prefix = 'wait'
  document.getElementById("info").innerText = prefix.toUpperCase() + ' - ' + string
  // TODO: Force element redraw (sometimes the value is updated in the DOM, but page is not redrawn)
}
/**
 * Get the current value in the search input
 * @returns Current URL in the image search input
 */
function getImageURL() { 
  return document.getElementById("name").value
}
/**
 * Insert the given URL as the value of the image search input
 * @param {String} url
 */
function setImageURL(url) {
  document.getElementById("name").value = url;
}

/**
 * Whether OffscreenCanvas is supported.  
 * OffscreenCanvas is necessary to run TensorFlow.js in a web Worker using WebGL
 * @returns true if OffscreenCanvas is supported, false otherwise
 */
function canIUseOffscreenCanvas() {
  return typeof OffscreenCanvas !== "undefined"
}

/**
 * Resize image into a squared canvas of dimension (inputSize x inputSize),
 * with black paddings to the right if necessary
 * 
 * Credit to \@justadudewhohacks
 * https://github.com/tensorflow/tfjs/issues/604#issuecomment-416135683
 * @param {HTMLImageElement} img Source image
 * @param {number} inputSize Size of the side of the square
 * @returns {HTMLCanvasElement} Resulting canvas
 */
function imageToSquare(img, inputSize) {
  const dims = img instanceof HTMLImageElement 
    ? { width: img.naturalWidth, height: img.naturalHeight }
    : img;
  
  const scale = inputSize / Math.max(dims.height, dims.width)
  const width = scale * dims.width
  const height = scale * dims.height

  const targetCanvas = document.createElement('canvas')
  targetCanvas .width = inputSize
  targetCanvas .height = inputSize
  targetCanvas.getContext('2d').drawImage(img, 0, 0, width, height)

  return targetCanvas
}
/**
 * Resize image into a canvas with maximum dimension equal to inputSize
 * while keeping the aspect ratio
 * @param {HTMLImageElement} img Source image
 * @param {number} inputSize Size of maximum dimension
 * @returns {HTMLCanvasElement} Resulting canvas
 */
function imageToMax(img, inputSize) {
  const dims = img instanceof HTMLImageElement 
    ? { width: img.naturalWidth, height: img.naturalHeight }
    : img;
  
  const scale = inputSize / Math.max(dims.height, dims.width)
  const width = scale * dims.width
  const height = scale * dims.height

  const targetCanvas = document.createElement('canvas')
  targetCanvas .width = width
  targetCanvas .height = height
  targetCanvas.getContext('2d').drawImage(img, 0, 0, width, height)

  return targetCanvas
}


// Functions to fetch and set image size from URL (or tensorflow cannot create tensors)

/** Number of failed GET requests to fetch the image */
let tries = 0;
// 
/**
 * When receiving error on GET request of the image URL, use a pre-defined sample image 
 * @returns Return early if the number of failed GET requests reach 6
 */
function onError() {
  tries = tries +1;

  if (tries > 0) {
    info('Try #{}'.replace('{}', String(tries+1)));
  }
  else if (tries > 6) {
    info('Cannot fetch any image!');
    return
  }

  url = getRandomSample();
  this.src = url;
  setImageURL(url);
}
/** 
 * After image src is loaded, continue skin detection.
 * Waiting the \<img> to load its src is necessary because TensorFlow.js
 * require to know the shape in which tensors will be created
 */
function onLoad() {
  skinDetectContinue(this.webWorker);
}
/**
 * Get img metadata (size) from url
 * @param {HTMLImageElement} img \<img> element
 * @param {String} url 
 * @param {Worker} webWorker worker passed to skinDetectContinue(webWorker)
 */
function getMeta(img, url, webWorker){
  img.webWorker = webWorker; // append web worker to the object data
  img.addEventListener("load", onLoad);
  img.addEventListener("error", onError);
  
  img.src = url;
}


// Skin Detection

/** Size of each side of the images fed into the U-Net */
const square_size = 352;
/**
 * Ask the js worker to run init tasks
 * @param  {String} workerSrc The js script used to init the web worker
 * @returns {Worker} initialized web Worker
*/
function initWorker(workerSrc) {
  let webWorker = new Worker(workerSrc);

  // variables used in tfjs workers because the received data is not
  // directly base64, but need to be first drawn into a canvas
  let ori_data = null;
  let img_data = null;

  // identify a Promise
  let id = 0; // ID=0 : init tasks

  webWorker.onmessage = async (event) => {
    const { id, ...data } = event.data;

    // update canRun flag
    if (data.ready !== undefined) {
      canRun = true;
    }
    // update status message
    if (data.info !== undefined) {
      info(data.info[0], data.info[1]);
    }
    // log errors
    if (data.error !== undefined) {
      console.log(data.error);
    }
    // draw results into <img> elements
    if (data.results !== undefined) {
      // check if tfjs local variables are set
      if (img_data !== null) {
        data.results[0] = img_data;
        img_data = null; // if variable is set, reset it
      }
      if (ori_data !== null) {
        data.results[1] = ori_data;
        ori_data = null;
      }

      updateSlider(data.results);
    }
    // used to print tf.memory()
    if (data.table !== undefined) {
      console.table(data.table);
    }
    // tensor data to draw into <img> elements
    // data is in format [tensorData, tensorShape]
    if (data.topixels !== undefined) {
      const data_shape = data.topixels[1];
      const image_width = data_shape[0];
      const image_height = data_shape[1];
      const tensor = tf.tensor(data.topixels[0], data_shape, 'float32');

      // Draw tensor to canvas to later get the base64 encoding
      // (used to update src of \<img> elements)
      const canvas = document.createElement('canvas');
      canvas.width = image_width;
      canvas.height = image_height;
      await tf.browser.toPixels(tensor, canvas);

      tensor.dataSync(); // clean GPU
      tensor.dispose();

      // Check which local variable to update
      if (data_shape[2] === 3) // if has 3 channels, it is the original image
        img_data = canvas.toDataURL();
      else // if has 1 channel, it is the prediction
        ori_data = canvas.toDataURL();
    }
  };

  // Request to run init tasks
  // square_size is needed for model warmup
  webWorker.postMessage({
    ...{ square_size: square_size },
    id,
  });

  return webWorker
}

/** Whether there is already a skin detection task running */
let running = false;
/** Whether skin detection init tasks have already been executed */
let canRun = false;
/**
 * Ask the js worker to init skin detection:
 * check URL validity and fetch the image
 * @param {Worker} webWorker 
 * @returns Returns early if the URL in the search input is not valid
 */
function skinDetect(webWorker) {
  if (!canRun || running) return; // prevent users from spamming clicks on "Skin Detect" button
  running = true;

  const img_ori = document.getElementById("imgbox-ori");

  // check if URL is valid
  info('Checking URL...')
  if (!isValidHttpUrl(getImageURL())) {
    info('Invalid URL. Does it start with https:// ?')
    running = false; // early stop
    return;
  }
  // Fetch image
  info('Fetching image...');
  const img_url = getImageURL();
  getMeta(img_ori, img_url, webWorker);
}


/** Max dimension of original images used in python detectors */
const pyodideMaxImageSize = 352;
/**
 * After img src is loaded, run the skin detection
 * @param {Worker} pyodideWorker Pyodide web Worker 
 */
function skinDetectContinue(pyodideWorker) {
  // remove previous event listener or else it will lag after setting \<img> src
  const img_ori = document.getElementById("imgbox-ori");
  img_ori.removeEventListener("load", onLoad);
  img_ori.removeEventListener("error", onError);

  const img_canvas = imageToMax(img_ori, pyodideMaxImageSize);
  const ori_data = img_canvas.toDataURL("image/jpeg", 1);

  let id = 1;

  // pass base64 data of the img to web worker
  const context = {
    ori_data: ori_data,
  };

  // Request skin detection
  pyodideWorker.postMessage({
    ...context,
    id,
  });
}

/**
 * Update the src of \<img> elements representing original and prediction image.  
 * Update the size of \<img>, slider, and slider-container HTML elements to reflect
 * the new src content.
 * @param {Array} results Array containing necessary data: [img_base64, ori_base64, img_width, img_height]
 */
function updateSlider(results) {
  const img_data = results[0]; // prediciton image base64
  const ori_data = results[1]; // original image base64
  const image_width = results[2];
  const image_height = results[3];
  /** base64 prefix. Default to empty because strings may already have the base64 HTML prefix */
  let prefix = '';

  const imgbox_el = document.getElementById("imgbox");
  const imgboxori_el = document.getElementById("imgbox-ori");
  const slider_el = document.getElementById("slider");
  const slidercont_el = document.getElementById("slider-container");

  // Update widths
  imgbox_el.style.width = String(image_width) + 'px';
  imgboxori_el.style.width = String(image_width) + 'px';
  slider_el.style.width = String(image_width+50) + 'px';
  // Update heights
  imgbox_el.style.height = String(image_height) + 'px';
  imgboxori_el.style.height = String(image_height) + 'px';
  slider_el.style.height = String(image_height) + 'px';
  slidercont_el.style.height = String(image_height+50) + 'px';

  // Update src content
  if (!img_data.startsWith('data:image')) prefix = 'data:image/png;base64,';
  imgbox_el.src = prefix + img_data;
  if (!ori_data.startsWith('data:image')) prefix = 'data:image/png;base64,';
  imgboxori_el.src = prefix + ori_data;

  // Init comparison slider transparency
  const slideValue = document.getElementById("slider").value;
  imgbox_el.style.clipPath = "polygon(0 0," + slideValue + "% 0," + slideValue + "% 100%, 0 100%)";

  slidercont_el.style.visibility = "visible";

  // Update STATUS message
  if (tries > 0) {
    info('Invalid URL, Used sample image', 'finish');
  } else {
    info('Waiting new input', 'finish');
  }

  // Reset run status
  tries = 0;
  running = false;
}
