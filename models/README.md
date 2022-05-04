## Models

Both models are trained on the *ECU* dataset.

###### U-NET
The command I used to convert the TensorFlow python model into a js compatible model:

```
tensorflowjs_converter \
    --input_format=tf_saved_model \
    --saved_model_tags=serve \
    ./python_model_folder/saved_model.ckpt \
    ./js_model_folder/web_model
```

###### STATISTICAL
The statistical model is stored in the **pickle** format using gzip compression to save space as it is composed of lots of empty values.  
It went from 267MB to 7MB, **saving 97% of space**!

Other formats were considered: feather, parquet, and jay, but were discarded because, at the time of writing, the needed packages (pyarrow and datatable) are not yet built for Pyodide.
