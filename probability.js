// webworker.js

// Setup your project to serve `py-worker.js`. You should also serve
// `pyodide.js`, and all its associated `.asm.js`, `.data`, `.json`,
// and `.wasm` files as well:
importScripts("https://cdn.jsdelivr.net/pyodide/dev/full/pyodide.js");

const python_fetchmodel = `
from pyodide.http import pyfetch
from js import info
import os
import pandas as pd


def read_model(model_csv: str):
  probability = pd.read_pickle(model_csv, compression='gzip')
  return probability

model_url = '/models/statistical/ECU.pickle'
try:
  response = await pyfetch(model_url, redirect = 'follow')
  if response.status == 200:
    modelname = os.path.basename(response.url)
    with open(modelname, "wb") as f:
      f.write(await response.bytes())
    info('Model fetched')
except:
  info('Critical: error on fetching the model')
  exit()

info('Reading probability...')
probability = read_model(modelname)
info('Probability data loaded')
`;

const python_skindetect = `
from PIL import Image
import os
import random
from js import info, img_url
import base64
from io import BytesIO
from pyodide.http import pyfetch
from livedemo import probability, samples

print(f'Running Pillow Image version: {Image.__version__}')

def open_image(src):
  # Convert to RGB as some image may be read as RGBA: https://stackoverflow.com/a/54713582
  return Image.open(src,'r').convert('RGB')

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

def skin_detect(image_in: str, image_out: str, probability):
  try:
    source = open_image(image_in)
  except:
    exit('No input image found')

  temp = source.copy()

  bw_final = create_image(temp, probability, image_out)
  return bw_final, source


# Download the given image to virtual file system
tries = 0
while True: # keep trying till getting a valid image
  if tries > 0:
    info(f'Try #{tries+1}')
  elif tries > 6:
    info(f'Cannot fetch any image!')
    break
  try:
    response = await pyfetch(img_url, redirect = 'follow')
    if response.status == 200:
      filename = os.path.basename(response.url)
      with open(filename, "wb") as f:
        f.write(await response.bytes())
      info('Image fetched')
      break
  except:
    info('Error on the given image, trying on a random image instead')
    img_url = random.choice(samples)
    tries = tries +1


# Run skin detector
out_img = 'img.png'

try:
  outcome, origin = skin_detect(filename, out_img, probability)
  info('Skin detector ran without issues')
except:
  info('Error while detecting skin, please try again with a different image')

info('Encoding image')

# Return image as base64 encoded string
buffered = BytesIO()
outcome.save(buffered, format="PNG")
img_data = base64.b64encode(buffered.getvalue()).decode()

if tries > 0:
  info('Finish with sample image (invalid url)')
else:
  info('Finish')

# Return original image
buffered = BytesIO()
origin.save(buffered, format="PNG")
ori_data = base64.b64encode(buffered.getvalue()).decode()

image_width, image_height = outcome.size
`;

function info(string) {
  self.postMessage({ info: string });
  // TODO: Force element redraw
}

async function loadPyodideAndPackages() {
  info('Loading python...');
  self.pyodide = await loadPyodide();
  await self.pyodide.loadPackage(["Pillow", "pandas"]);
  info('Ready, Waiting input');
}
let pyodideReadyPromise = loadPyodideAndPackages();

// Fetch Probability Model
async function fetchModel(){
  await pyodideReadyPromise;
  info('Fetching model...');
  await self.pyodide.runPythonAsync(python_fetchmodel);
  self.probability = self.pyodide.globals.get("probability");

  info('Ready, Waiting input');
}
let modelReadyPromise = fetchModel();

self.onmessage = async (event) => {
  // make sure loading is done
  await modelReadyPromise;
  
  const { id, ...context } = event.data;
  if (id == 0) return; // request to just init python and pyodide

  // The worker copies the context in its own "memory" (an object mapping name to values)
  for (const key of Object.keys(context)) {
    self[key] = context[key];
  }
  // Now is the easy part, the one that is similar to working in the main thread:
  try {
    await self.pyodide.loadPackagesFromImports(python_skindetect);

    const probability = self.probability;
    const samples = self.sample_list;
    const img_url = self.img_url; // img_url will be imported directly from js
    // livedemo contains STATIC variables: the imported content in python will not change on re-register
    self.pyodide.registerJsModule("livedemo", {probability, samples});
    info('Running script...');

    await self.pyodide.runPythonAsync(python_skindetect);
    const img_data = self.pyodide.globals.get("img_data");
    const ori_data = self.pyodide.globals.get("ori_data");
    const image_width = self.pyodide.globals.get("image_width");
    const image_height = self.pyodide.globals.get("image_height");

    self.postMessage({ results: [img_data, ori_data, image_width, image_height], id });

    // clean memory
    //img_data.destroy();
    //ori_data.destroy();
  } catch (error) {
    self.postMessage({ error: error.message, id });
  }
};