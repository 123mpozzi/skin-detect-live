// Web Worker

importScripts("https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js");

// Read probability data from pickle model
const python_fetchmodel = `
from pyodide.http import pyfetch
from js import info
import os
import pandas as pd


def read_model(model_csv: str):
  probability = pd.read_pickle(model_csv, compression='gzip')
  return probability

model_url = 'models/statistical/ECU.pickle'
try:
  response = await pyfetch(model_url, redirect = 'follow')
  if response.status == 200:
    modelname = os.path.basename(response.url)
    with open(modelname, "wb") as f:
      f.write(await response.bytes())
except:
  info('Cannot fetch the model', 'critical')
  exit()

info('Reading probability...')

try:
  probability = read_model(modelname)
except MemoryError:
  info('Memory is not enough to run this detector', 'critical')
  exit()
except Exception:
  info('Failed to read probability', 'critical')
  exit()
`;

const python_skindetect = `
from PIL import Image
import os
import random
from js import info, ori_data
import base64
from io import BytesIO
from pyodide.http import pyfetch
from livedemo import probability
import re

print(f'Running Pillow Image version: {Image.__version__}')

def open_image(b64js):
  '''
  Credits to answers at https://stackoverflow.com/q/26070547

  There is a metadata prefix of data:image/jpeg;base64, being included in 
  the img field. Normally this metadata is used in a CSS or HTML data URI 
  when embedding image data into the document or stylesheet.

  Also convert to RGB as some image may be read as RGBA: 
  https://stackoverflow.com/a/54713582
  '''
  image_data = re.sub('^data:image/.+;base64,', '', b64js)
  return Image.open(BytesIO(base64.b64decode(image_data))).convert('RGB')

def create_image(im: Image, probability, out_p) -> float:
    im.load()

    # ALGO
    newimdata = []
    
    for r,g,b in im.getdata():
        row_num = (r*256*256) + (g*256) + b # calculating the serial row number 
        if probability['Probability'][row_num] < 0.555555:
            newimdata.append((0,0,0))
        else:
            newimdata.append((255,255,255))
    
    im.putdata(newimdata)
    #im.save(out_p)
    return im

def skin_detect(data_in: str, image_out: str, probability):
  try:
    source = open_image(data_in)
  except:
    exit('No input image found')

  temp = source.copy()

  bw_final = create_image(temp, probability, image_out)
  return bw_final, source


# Run skin detector
out_img = 'img.png'

try:
  outcome, origin = skin_detect(ori_data, out_img, probability)
except:
  info('Failed to detect skin, please try with a different image', 'error')

info('Encoding image...')

# Return image as base64 encoded string
buffered = BytesIO()
outcome.save(buffered, format="PNG")
img_data = base64.b64encode(buffered.getvalue()).decode()

# Return original image
buffered = BytesIO()
origin.save(buffered, format="PNG")
ori_data = base64.b64encode(buffered.getvalue()).decode()

image_width, image_height = outcome.size
`;

/** Ask the main thread to update the STATUS message */
function info(string, prefix) {
  self.postMessage({ info: [string, prefix] });
  // TODO: Force element redraw
}

/**
 * Load Pyodide and packages.  
 * Place the loaded pyodide into self.pyodide
 */
async function loadPyodideAndPackages() {
  info('Loading python...');
  self.pyodide = await loadPyodide();
  info('Loading packages...');
  await self.pyodide.loadPackage(["Pillow", "pandas"]);
  info('Waiting input', 'ready');
}
let pyodideReadyPromise = loadPyodideAndPackages();

/**
 * Fetch the probability model.  
 * Place the probability data into self.probability
 */
async function fetchModel(){
  await pyodideReadyPromise; // need Pyodide
  info('Fetching model...');
  await self.pyodide.runPythonAsync(python_fetchmodel);
  self.probability = self.pyodide.globals.get("probability");

  info('Waiting input', 'ready');
}
let modelReadyPromise = fetchModel();


// Work
self.onmessage = async (event) => {
  // make sure loading is done
  await modelReadyPromise;
  
  const { id, ...context } = event.data;
  self.postMessage({ ready: true, id });
  if (id == 0) return; // request to just init python and pyodide

  // The worker copies the context in its own "memory" (an object mapping name to values)
  for (const key of Object.keys(context)) {
    self[key] = context[key];
  }


  // Now is the easy part, the one that is similar to working in the main thread:
  try {
    await self.pyodide.loadPackagesFromImports(python_skindetect);

    const probability = self.probability;
    const ori_data = self.ori_data; // original image as base64 will be imported directly from js
    // livedemo contains STATIC variables: the imported content in python will not change on re-register
    self.pyodide.registerJsModule("livedemo", {probability});
    info('Running script...');

    await self.pyodide.runPythonAsync(python_skindetect);

    // fetch results from python
    const img_data = self.pyodide.globals.get("img_data");
    const ori_data_post = self.pyodide.globals.get("ori_data");
    const image_width = self.pyodide.globals.get("image_width");
    const image_height = self.pyodide.globals.get("image_height");
    self.postMessage({ results: [img_data, ori_data_post, image_width, image_height], id });

    // clean memory
    //img_data.destroy(); // .destroy() is not a function
    //ori_data.destroy();
  } catch (error) {
    info('Predict error, refresh and retry', 'critical');
    self.postMessage({ error: error.message, id });
  }
};