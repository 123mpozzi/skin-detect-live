[py]: https://github.com/123mpozzi/nbrancati-py "see on GitHub"
[stat]: https://github.com/123mpozzi/skin-statistical "see on GitHub"
[unet]: https://github.com/123mpozzi/skinny "see on GitHub"
[pyodide]: https://github.com/pyodide/pyodide "see on GitHub"
[tfjs]: https://github.com/tensorflow/tfjs "see on GitHub"
[offscreencanvas]: https://caniuse.com/offscreencanvas "see feature support across browsers"
[pyopackages]: https://github.com/pyodide/pyodide/tree/main/packages "see on GitHub"

# Live Demo of Skin Detectors

<br />
<h3 align="center">
Skin detectors running directly in the browser<br> with no backend required
</h3>
<br />

<br />
<div align="center">
  <img width="300" src="docs/screen.png" alt="Screenshot">
</div>
<br />

This project was made to allow people to try skin detectors in a practical way, and for learning purpose (trying to run detectors in browser without a backend), so performance may not be the best.  
Still, the considerations made in [final thoughts](#final-thoughts) and [limitations](#limitations) sections may be useful to similar projects.

###### ADAPTIVE THRESHOLDING
Demo of my [python implementation][py] of the original paper (Brancati et al. 2017)  
Running on: [Pyodide][pyodide]

###### STATISTICAL
Demo of the [statistical skin detector][stat] featured in my thesis (Acharjee 2018)  
Running on: [Pyodide][pyodide]

###### U-NET
Demo of the [u-net skin detector][unet] featured in my thesis (Tarasiewicz et al. 2020)  
Running on: [TensorFlow.js][tfjs]


## Architecture

<br />
<div>
  <img width="450" src="docs/architecture.svg" alt="Architecture">
</div>
<br />

###### NOTE
[OffscreenCanvas support][offscreencanvas] is needed to run WebGL acceleration in background (used by U-Net).  
I preferred to make the U-Net run on the main thread in case the browser does not support OffscreenCanvas because it should still get the WebGL acceleration, rather than running the U-Net in background using CPU, which is a lot slower. Therefore, the webpage may freeze in this case.


## Limitations

#### Cross-Origin Resource Sharing
If the image at given URL is not hosted on the same website, it will not work and a random pre-defined image will be loaded instead.  
Also, local URLs (file://) do not work.

#### Slower
The python detectors runs in the browser thanks to Pyodide which work wonderfully, but has not yet reached the performance of native python.  
Therefore it is slower than the python implementation, and it must also load the Python distribution and packages before running.  

Regarding U-Net, TensorFlow.js speed depends on the backend, which is automatically picked by the library itself, but it is generally slower than the python implementation.

To mitigate high inference times, image size is limited to have the maximum dimension equal to 352px (while keeping aspect ratio) for python detectors, and 352x352 for U-Net, which should also permit running it on devices with little GPU memory.

#### High RAM usage
Currently, the skin detectors using Pyodide take up a lot of RAM memory, with the thresholding one taking about 680MB, and the statistical one 1400MB. This may lead to the page crashing, especially on mobile devices.  
In comparison, U-Net takes in average 230MB.

The thresholding approach keeps in memory Pyodide and its base packages, plus opencv-python.

The statistical approach keeps in memory Pyodide and its base packages, plus pandas and Pillow, which total about 620MB, and the probability model taking the rest.  
In this case, memory usage could be optimized by storing the model in a sparse format as it contains a lot of empty space.

The U-Net approach keeps in memory its deep learning model.


## Final Thoughts

#### TensorFlow.js

TensorFlow.js feels really mature when running deep learning models like U-Nets on the browser: it supports multiple backends to allow acceleration of operations; can be run in web Workers; and in my case I found all the tensor operations I needed.  
The model conversion was straightforward: a single tensorflowjs_converter command, which can be seen in the README in models folder, was enough.  

By following the best practices on the management of the GPU memory, such as performing tensor operations inside `tf.tidy` blocks, and disposing tensors, there will be no memory leaks.

The performance obtained are astonishing: with the WebGL backend, the U-Net is really fast at inferencing on the devices I tried, working fine even on mobile browsers.  
Loading and inference times could be further improved by deploying a smaller, optimized model, maybe using pruning and quantization.

The limitations I found are the dtypes, which at the moment only comprend int32 and float32 for integers and floating point numbers; and the WASM backend, which only supports a fixed list of models.

#### Pyodide

It is really nice to run Python packages in the browser and it is surprising to see opencv, Pillow, and pandas supported, but there are still major limitations.  
Loading Pyodide and Python packages takes a quite long time, and their RAM usage is very high, as I reported in the [limitations](#limitations) section above, making it annoying to run on mobile devices.  
Moreover, packages using C/C++ code must be built to run in Pyodide, hence some packages you need may be missing. However, the community is building more and more packages, as can be seen [on Github][pyopackages].

Despite the mentioned limitations, some things works really well: Python code runs smoothly; the js <-> Python interoperability is seamless; web Workers are easy to work with (even if only one Python script will execute at a time); and complex packages like opencv are made easily accessible on your browser.


#### Browser as a Platform

At the moment, applications which perform few tasks and do not need persistence can be run entirely in the browser, or at least lighten the computational load on the backend.  
WASM and web Workers make it possible to run almost any sort of application in the browser and are well supported on modern browsers, even on mobile devices.
