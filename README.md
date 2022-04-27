[py]: https://github.com "see on GitHub"
[pyodide]: https://github.com/pyodide/pyodide "see on GitHub"

# Adaptive rule based skin detector - Live demo

Live demo of my [python implementation][py] of the original paper (Brancati et al. 2017) running in the browser.

#### Original Paper
N. Brancati, G. De Pietro,M. Frucci, and L. Gallo. “Human skin detection through correlation rules between the YCb and YCr subspaces based on dynamic color clustering”. Computer Vision and Image Understanding 155, 2017, pp. 33–42.
https://doi.org/10.1016/j.cviu.2016.12.001


## Limitations

#### Slower
The python code runs in the browser thanks to [Pyodide][pyodide] which work wonderfully, but has not yet reached the performance of native python.  
Therefore it is slower than the python implementation, and it must also load the Python distribution and packages before running.  

#### Cross-Origin Resource Sharing
If the image at given URL is not hosted on the same website, it will not work and a random pre-defined image will be loaded instead.  
Also, local URLs (file://) do not work.

#### Page freezing
The python code is run in the main thread, hence the page may freeze, especially on large images.  
Implementing WebWorkers would prevent this issue.
