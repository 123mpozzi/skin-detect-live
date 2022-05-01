[py]: https://github.com/123mpozzi/nbrancati-py "see on GitHub"
[stat]: https://github.com/123mpozzi/skin-statistical "see on GitHub"
[unet]: https://github.com/123mpozzi/skinny "see on GitHub"
[pyodide]: https://github.com/pyodide/pyodide "see on GitHub"
[tfjs]: https://github.com/tensorflow/tfjs "see on GitHub"


# Skin detectors - Live demo

<br>
<div align="center">
  <img width="300" src="docs/screen.png" alt="Tetris Puzzle">
</div>
<br>

### Adaptive rule based skin detector
Live demo of my [python implementation][py] of the original paper (Brancati et al. 2017), running in the browser via [Pyodide][pyodide].

###### ORIGINAL PAPER
N. Brancati, G. De Pietro,M. Frucci, and L. Gallo. “Human skin detection through correlation rules between the YCb and YCr subspaces based on dynamic color clustering”. Computer Vision and Image Understanding 155, 2017, pp. 33–42.
https://doi.org/10.1016/j.cviu.2016.12.001


### Statistical
Live demo of the [statistical skin detector][stat] featured in my thesis, running in the browser via [Pyodide][pyodide].

### U-Net
Live demo of the [u-net skin detector][unet] featured in my thesis, running in the browser via [TensorFlow.js][tfjs].

## Limitations

#### Slower
The python code runs in the browser thanks to [Pyodide][pyodide] which work wonderfully, but has not yet reached the performance of native python.  
Therefore it is slower than the python implementation, and it must also load the Python distribution and packages before running.  

Regarding U-Net, TensorFlow.js speed depends on the backend, which is automatically picked by the library itself, but it is generally slower than the python implementation.

#### Cross-Origin Resource Sharing
If the image at given URL is not hosted on the same website, it will not work and a random pre-defined image will be loaded instead.  
Also, local URLs (file://) do not work.

#### Page freezing
The detector code runs in the main thread, hence the page may freeze, especially on large images.  
Implementing WebWorkers would prevent this issue.
