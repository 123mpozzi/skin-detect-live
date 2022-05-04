// Web Worker

importScripts("https://cdn.jsdelivr.net/pyodide/dev/full/pyodide.js");

const python = `
import cv2
import numpy as np
from math import ceil
import os
import random
from js import info, ori_data
import base64
from pyodide.http import pyfetch
print(f'Running OpenCV version: {cv2.__version__}')

bins = 256
tolCr = 1
tolCb = 1
hist_size = (bins, bins)
ranges1 = (0, 255)
ranges2 = (0, 255)
ranges = (ranges1, ranges2)

#  sort of the histogram
def sortHist(iBins: list, values: list, num: int):
  tmpN = num
  while tmpN >= 0:
    ultimo = -1
    for i in range(tmpN):
      if iBins[i] > iBins[i + 1]:
        tmp = iBins[i]
        iBins[i] = int(iBins[i + 1])
        iBins[i + 1] = int(tmp)
        ultimo = i
        tmp = values[i]
        values[i] = values[i + 1]
        values[i + 1] = tmp
    tmpN = ultimo
  return iBins
#  Computation of Min and Max of the histogram (5th and 95th percentile)
def calcMinMaxHist(yValues: int, iBins: list, vect: list) -> None:
  flag = 0
  maxVal = 0
  percentage = 0
  app = [0] * bins #  TODO: rewrite these assignments in a more pythonic way
  for i in range(yValues[0]):
    app[i] = 0
  for i in range(1, yValues[0]):
    maxVal = maxVal + yValues[i]
  i = 1
  if int(maxVal != 0):
    while flag != 1:
      percentage = percentage + int(yValues[i])
      if ceil((percentage / maxVal) * 100) >= 5:
        flag = 1
      i = i+1
    vect[0] = i - 1
    i = 1
    flag = 0
    percentage = 0
    while flag != 1:
      percentage = percentage + int(yValues[i])
      if ceil((percentage / maxVal) * 100) >= 95:
        flag = 1
      i = i+1
    vect[1] = i - 1
    k = 0
    for i in range(vect[0], vect[1] +1):
      if iBins[i] != 0:
        app[k] = iBins[i]
        k = k+1
    app = sortHist(app, iBins, k - 1)
    vect[0] = 255
    vect[1] = 0
    for i in range(k):
      if app[i] != 0:
        vect[0] = app[i]
        break
    for i in range(k - 1, -1, -1):
      if app[i] != 0:
        vect[1] = app[i]
        break
  else:
    vect[0] = 255
    vect[1] = 0
#  TODO: this function takes 90% of execution time, improve it
#  Computation of the vertices (Y0,CrMax) and (Y1,CrMax) of the trapezium in the YCr subspace
#  Computation of the vertices (Y2,CbMin) and (Y3,CbMin) of the trapezium in the YCb subspace
def calculateValueMinMaxY(image, val: float, hist, canal: int) -> list:
  minMax = [0] * 2
  min = 255
  max = 0
  indMax = 0
  indMin = 0
  tmpVal = val
  if canal == 1:
    tol = tolCr
  else:
    tol = tolCb
  indTol = (2 * (tol + 1)) - 1
  app = [0] * bins
  iBins = [0] * bins
  app2 = [0] * bins
  iBins2 = [0] * bins
  for i in range(bins):
    app[i] = 0
    app2[i] = 0
    iBins2[i] = 0
    iBins[i] = 0
  yValue = [0] * indTol
  iBinsVal = [0] * indTol
  for i in range(indTol):
    yValue[i] = [0] * bins
    iBinsVal[i] = [0] * bins
  for j in range(indTol):
    for i in range(bins):
      yValue[j][i] = 0
      iBinsVal[j][i] = 0
  
  height, width, channels = image.shape
  for i in range(height - 1):
    for j in range(width - 1):
      spk = image[i, j, canal]
      if spk >= tmpVal - tol and spk <= tmpVal + tol:
        k = image[i, j, 0]
        bin_val = 0
        bin_val = hist[k, spk]
        if bin_val != 0:
          for l in range(indTol):
            if int(tmpVal - spk + l) == tol:
              yValue[l][k] = bin_val
              iBinsVal[l][k] = k
  for i in range(indTol):
    for k in range(bins):
      app[k] = yValue[i][k]
      iBins[k] = iBinsVal[i][k]
    app = sortHist(app, iBins, k - 1)
    j = 1
    for k in range(bins):
      if app[k] != 0:
        app2[j] = app[k]
        iBins2[j] = iBins[k]
        j = j+1
    app2[0] = j
    minMax[0] = 255
    minMax[1] = 0
    #  Computation of Min and Max of the histogram
    calcMinMaxHist(app2, iBins2, minMax)
    if minMax[0] != minMax[1]:
      if minMax[0] != 255:
        indMin = indMin+1
        if minMax[0] < min:
          min = minMax[0]
      if minMax[1] != 0:
        indMax = indMax+1
        if minMax[1] > max:
          max = minMax[1]
  minMax[0] = min
  minMax[1] = max
  return minMax
def calculateHist(plane1):
  return cv2.calcHist([plane1],[0],None,[256],[0,256])
def calculateHist2(plane1, plane2):
  img = np.dstack((plane1,plane2))
  return cv2.calcHist([img], [0, 1], None, [256, 256], [0, 256, 0, 256])
#  TODO: improve precision with more consistent data types
def skin_detect(data_in: str, image_out: str):
  '''
  Detect skin pixels in data_in and save the result into a 
  file named like image_out   
  '''
  CrMin = float(133)
  CrMax = float(183)
  CbMin = float(77)
  CbMax = float(128)
  try:
    source = readb64(data_in) # cv2.imread(data_in, cv2.IMREAD_COLOR)
  except:
    exit('No input image found')
  
  height, width, channels = source.shape
  minMaxCr = [0] * 2
  minMaxCb = [0] * 2
  #  ALGORITHM
  frame_rgb = source.copy()
  perc = width * height * 0.1 / 100
  frame_ycrcb = cv2.cvtColor(frame_rgb, cv2.COLOR_BGR2YCR_CB)
  y_plane, cr_plane, cb_plane = cv2.split(frame_ycrcb)
  histCb = calculateHist(cb_plane)
  histCr = calculateHist(cr_plane)
  max_valCr = 0
  minMaxCr[0] = 255
  minMaxCr[1] = 0
  minMaxCb[0] = 255
  minMaxCb[1] = 0
  #  Computation of Crmax
  for i in range(bins - 1, -1, -1):
    if histCr[i] != 0 and histCr[i] > perc:
      max_valCr = i
      break
  #  Computation of Cbmin
  min_valCb = 0
  for i in range(bins):
    if histCb[i] != 0 and histCb[i] > perc:
      min_valCb = i
      break
  
  histYCb = calculateHist2(y_plane, cb_plane)
  histYCr = calculateHist2(y_plane, cr_plane)
  
  #  Computation of (Y0,CrMax) and (Y1,CrMax) by means of the calculus of percentiles
  if max_valCr != -1:
    if max_valCr > CrMax:
      max_valCr = CrMax
    minMaxCr = calculateValueMinMaxY(frame_ycrcb, max_valCr, histYCr, 1)
    if max_valCr < CrMax:
      CrMax = max_valCr
  #  Computation of (Y2,CbMin) and (Y3,CbMin) by means of the calculus of percentiles
  if min_valCb != -1:
    if min_valCb < CbMin:
      min_valCb = CbMin
    minMaxCb = calculateValueMinMaxY(frame_ycrcb, min_valCb, histYCb, 2)
    if min_valCb > CbMin:
      CbMin = min_valCb
  Y0 = 50
  Y1 = 110
  Y2 = 140
  Y3 = 200
  #  Store of Y0, Y1
  if max_valCr != -1:
    Y0 = minMaxCr[0]
    Y1 = minMaxCr[1]
  #  Store of Y2, Y3
  if min_valCb != -1:
    Y2 = minMaxCb[0]
    Y3 = minMaxCb[1]
  
  bw_final = np.zeros((height, width, 1), np.uint8)
  ACr = 0
  ACb = 0
  B = 256
  bCr = Y1 - Y0
  bCb = Y3 - Y2
  if bCr > bCb:
    maxb = bCr
    minb = bCb
  else:
    maxb = bCb
    minb = bCr
  hCr = float(CrMax - CrMin)
  hCb = float(CbMax - CbMin)
  ACr = ((B + bCr) * hCr) / 2
  ACb = ((B + bCb) * hCb) / 2
  Y = y_plane
  Cr = cr_plane
  Cb = cb_plane
  #  Calculate HCr
  #  With loops it had 3 if conditions: translate them into masks and matrix multiplications.
  #  Each mask represent a condition and its truth values are multiplied by the
  #  values that would have been inside the condition
  HCr = np.zeros_like(Y)
  # numpy.putmask(matrix, mask, new_matrix_values)
  np.putmask(HCr, (Y >= 0) & (Y < Y0), (CrMin + hCr * (np.float64(Y) / Y0)).astype(np.uint8))
  np.putmask(HCr, (Y >= Y0) & (Y < Y1), CrMax)
  np.putmask(HCr, (Y >= Y1) & (Y<= 255), (CrMin + hCr * ((np.float64(Y) - 255) / (Y1 - 255))).astype(np.uint8))
  #  TODO: use cleaner approach to perform color subtraction / saturated subtraction
  #  Calculate HCb
  #  arr[arr - subtract_me < threshold] = threshold
  HCb = np.zeros_like(Y)
  np.putmask(HCb, (Y >= 0) & (Y < Y2), (CbMin + hCb * ((np.int8(Y) - Y2) / (0 - Y2))).astype(np.uint8))
  np.putmask(HCb, (Y >= Y2) & (Y < Y3), CbMin)
  np.putmask(HCb, (Y >= Y3) & (Y <= 255), (CbMin + hCb * ((np.float64(Y) - Y3) / (255 - Y3))).astype(np.uint8))
  dCr = Cr - CrMin
  DCr = HCr - CrMin
  DCb = CbMax - HCb
  if ACr > ACb:
    D1Cr = DCr * ACb / ACr
    D1Cb = DCb
  else:
    D1Cr = DCr
    D1Cb = DCb * ACr / ACb
  alpha = np.true_divide(D1Cb, D1Cr)
  dCbS = np.zeros_like(alpha)
  np.putmask(dCbS, D1Cr > 0, np.multiply(dCr, alpha))
  np.putmask(dCbS, D1Cr <= 0, 255)
  CbS = CbMax - dCbS
  sf = float(minb) / float(maxb)
  #  Condition C.0
  Ivals = (D1Cr + D1Cb) - (dCr + dCbS)
  I = np.absolute(Ivals) * sf
  #  Condition C.1
  Jvals = np.multiply(dCbS, np.true_divide((dCbS + dCr), (D1Cb + D1Cr)))
  J = np.zeros_like(alpha)
  np.putmask(J, (D1Cb + D1Cr) > 0, Jvals)
  np.putmask(J, (D1Cb + D1Cr) <= 0, 255)
  #  Skin pixels
  mask1 = cv2.subtract(Cr, Cb) >= I
  mask2 = np.absolute(np.float64(Cb) - CbS).astype(np.uint8) <= J
  np.putmask(bw_final, mask1 & mask2, 255)
  
  #cv2.imwrite(image_out, bw_final)
  return bw_final, source



def readb64(uri):
  '''
  Credit to https://stackoverflow.com/a/54205640
  Read the base64 string img from js (no need to
  strip the prefix data:image/jpeg;base64)
  '''
  encoded_data = uri.split(',')[1]
  nparr = np.frombuffer(base64.b64decode(encoded_data), np.uint8)
  img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
  return img

# Run skin detector
try:
  outcome, origin = skin_detect(ori_data, 'img.png')
  info('Skin detector ran without issues')
except:
  info('Error while detecting skin, please try again with a different image')
info('Encoding image')

# Return image as base64 encoded string
img_data = base64.b64encode(cv2.imencode('.png', outcome)[1]).decode()

# Return original image
ori_data = base64.b64encode(cv2.imencode('.png', origin)[1]).decode()

image_height, image_width, image_channels = outcome.shape
`;

/** Ask the main thread to update the STATUS message */
function info(string) {
  self.postMessage({ info: string });
  // TODO: Force element redraw
}

/**
 * Load Pyodide and packages.  
 * Place the loaded pyodide into self.pyodide
 */
async function loadPyodideAndPackages() {
  info('Loading python...');
  self.pyodide = await loadPyodide();
  await self.pyodide.loadPackage("opencv-python");
  info('Ready, Waiting input');
}
let pyodideReadyPromise = loadPyodideAndPackages();


// Work
self.onmessage = async (event) => {
  // make sure loading is done
  await pyodideReadyPromise;
  
  const { id, ...context } = event.data;
  if (id == 0) return; // request to just init python and pyodide

  // The worker copies the context in its own "memory" (an object mapping name to values)
  for (const key of Object.keys(context)) {
    self[key] = context[key];
  }


  // Now is the easy part, the one that is similar to working in the main thread:
  try {
    await self.pyodide.loadPackagesFromImports(python);

    const ori_data = self.ori_data; // original image as base64 will be imported directly from js
    info('Running script...');

    await self.pyodide.runPythonAsync(python);

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
    self.postMessage({ error: error.message, id });
  }
};