// Image Slider Behavior
function slide() {
  let slideValue = document.getElementById("slider").value;

  document.getElementById("imgbox").style.clipPath = "polygon(0 0," + slideValue + "% 0," + slideValue + "% 100%, 0 100%)";
}


// Pre-defined Samples

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

function getRandomSample() {
  return sample_list[Math.floor(Math.random()*sample_list.length)];
}

function insertRandom() {
  document.getElementById("name").value = getRandomSample();
}

function getSamples() {
  return sample_list;
}


// Utilities

function isValidHttpUrl(string) {
  let url;
  
  try {
    url = new URL(string);
  } catch (_) {
    return false;  
  }

  return url.protocol === "http:" || url.protocol === "https:";
}

function info(string) {
  console.log(string)
  document.getElementById("info").innerText = "STATUS - " + string
  // TODO: Force element redraw
}

function getImageURL() { 
  return document.getElementById("name").value
}
function setImageURL(url) {
  document.getElementById("name").value = url;
}

// Credit to @justadudewhohacks
// https://github.com/tensorflow/tfjs/issues/604#issuecomment-416135683
function imageToSquare(img, inputSize) {
  const dims = img instanceof HTMLImageElement 
    ? { width: img.naturalWidth, height: img.naturalHeight }
    : img 
  const scale = inputSize / Math.max(dims.height, dims.width)
  const width = scale * dims.width
  const height = scale * dims.height

  const targetCanvas = document.createElement('canvas')
  targetCanvas .width = inputSize
  targetCanvas .height = inputSize
  targetCanvas.getContext('2d').drawImage(img, 0, 0, width, height)

  return targetCanvas
}


// Functions to fetch and set image size from URL (or tensorflow cannot create tensors)

let tries = 0;
// onError on GET request of image URL, use a sample image 
function onError() {
  tries = tries +1;

  if (tries > 0) {
    info('Try #{}'.replace('{}', String(tries+1)));
  }
  else if (tries > 6) {
    info('Cannot fetch any image!');
    return
  }

  info('Error on the given image, trying on a random image instead');
  url = getRandomSample();
  this.src = url;
  setImageURL(url);
}
function onLoad() {
  // wait img to load src or else TensorFlow do not know image size and fails
  skinDetectContinue(this.pyodideWorker);
  tries = 0;
}
function getMeta(img, url, pyodideWorker){
  img.pyodideWorker = pyodideWorker; // append web worker to the object data
  img.addEventListener("load", onLoad);
  img.addEventListener("error", onError);
  
  img.src = url;
}


// Pyodide Detectors

// Ask the js worker to init python
function initPyodide(pyodideWorkerSrc) {
  let pyodideWorker = new Worker(pyodideWorkerSrc);
  // identify a Promise
  let id = 0; // ID=0 : init python and pyodide

  pyodideWorker.onmessage = (event) => {
    const { id, ...data } = event.data;

    if (data.info !== undefined) {
      info(data.info);
    }
    if (data.error !== undefined) {
      console.log(data.error);
    }
    if (data.results !== undefined) {
      updateSlider(data.results);
    }
  };

  // init python and pyodide
  pyodideWorker.postMessage({
    ...{},
    id,
  });

  return pyodideWorker
}

// Ask the js worker to skin detect
function skinDetect(pyodideWorker) {
  const img_ori = document.getElementById("imgbox-ori");
  // check if URL is valid
  info('Checking URL...')
  if (!isValidHttpUrl(getImageURL())) {
    info('Invalid URL. Does it start with https:// ?')
    //document.getElementById('info').innerText = 'STATUS - Invalid URL. Does it start with https:// ?'
    return;
  }
  // Fetch image
  info('Fetching image...');
  const img_url = getImageURL();
  getMeta(img_ori, img_url, pyodideWorker);
}

function skinDetectContinue(pyodideWorker) {
  // remove previous event listener or it will lag after setting img src
  const img_ori = document.getElementById("imgbox-ori");
  img_ori.removeEventListener("load", onLoad);
  img_ori.removeEventListener("error", onError);

  let id = 1;

  const context = {
    sample_list: getSamples(),
    img_url: getImageURL(),
  };

  // request skin detect
  pyodideWorker.postMessage({
    ...context,
    id,
  });
}

// Update img(s), slider, and slider container HTML elements with results of skin detection 
function updateSlider(results) {
  const img_data = results[0];
  const ori_data = results[1];
  const image_width = results[2];
  const image_height = results[3];

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

  imgbox_el.src = "data:image/png;base64," + img_data;
  imgboxori_el.src = "data:image/png;base64," + ori_data;

  // init comparison slider transparency
  const slideValue = document.getElementById("slider").value;
  imgbox_el.style.clipPath = "polygon(0 0," + slideValue + "% 0," + slideValue + "% 100%, 0 100%)";

  slidercont_el.style.visibility = "visible";
}
