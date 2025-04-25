export const LAYERS = {
    dense: {
        "name": "Dense",
        "params": [
            {
                "name": "nodes_count",
                "name_readable": "Number of nodes",
                "default": 8,
                "type": "number",
                "required": true,
                "validator": (val) => {
                    if (val <= 0 || val > 1000) {
                        return "Number of nodes must be between 0 and 1000."
                    }
                    return ""
                }
            }
        ],
        "image": "dense.svg",
        "activation_function": true,
        "input_x": true,
        "color": "purple",
        "freezable": true
    },
    flatten: {
        "name": "Flatten",
        "params": [],
        "image": "area.svg",
        "input_x": true,
        "input_y": true,
        "color": "pink"
    },
    dropout: {
        "name": "Dropout",
        "params": [
            {
                "name": "rate",
                "name_readable": "Rate",
                "default": 0.2,
                "type": "number",
                "step": 0.05,
                "required": true,
                "validator": (rate) => {
                    if (rate <= 0 || rate >= 1) {
                        return "Rate must be between 0 and 1."
                    }
                    return ""
                }
            }
        ],
        "image": "dropout.svg",
        "color": "blue"
    },
    rescaling: {
        "name": "Rescaling",
        "params": [
            {
                "name": "scale",
                "name_readable": "Scale",
                "default": "1/255.0",
                "type": "text",
                "required": true,
                "validator": (scale) => {
                    try {
                        const result = eval(scale); 
                        return ""
                    } catch {
                        return "Scale must be a valid number."
                    }
                }
            },
            {
                "name": "offset",
                "name_readable": "Offset",
                "default": 0,
                "required": true,
                "validator": (offset) => {
                    if (Math.abs(offset) > 1000) {
                        return "The absolute of offset cannot be greater than 1000."
                    }
                    return ""
                }
            }
        ],
        "image": "area.svg",
        "input_x": true,
        "input_y": true,
        "input_z": true,
        "color": "cyan"
    },
    randomflip: {
        "name": "RandomFlip",
        "params": [
            {
                "name": "mode",
                "name_readable": "Mode",
                "default": "horizontal_and_vertical",
                "choices": [
                    {
                        "value": "horizontal_and_vertical",
                    },
                    {
                        "value": "horizontal",
                    },
                    {
                        "value": "vertical",
                    }
                ],
                "required": true
            }
        ],
        "image": "image.png",
        "input_x": true,
        "input_y": true,
        "input_z": true,
        "color": "green"
    },
    randomrotation: {
        "name": "RandomRotation",
        "params": [
            {
                "name": "factor",
                "name_readable": "Factor (of 2π)",
                "default": 0.2,
                "type": "number",
                "step": 0.1,
                "validator": (rate) => {
                    if (rate <= 0 || rate > 1) {
                        return "Rate must be greater than 0 and less than or equal to 1."
                    }
                    return ""
                },
                "required": true
            }
        ],
        "image": "image.png",
        "input_x": true,
        "input_y": true,
        "input_z": true,
        "color": "green"
    },
    resizing: {
        "name": "Resizing",
        "params": [],
        "dimensions": [
            {
                "name": "Output dimensions",
                "params": [
                    {
                        "name": "output_x",
                        "name_readable": "Width",
                        "default": 256,
                        "type": "number",
                        "required": true,
                        "validator": (output_x) => {
                            if (output_x <= 0 || output_x > 1024) {
                                return "Output dimensions must be between 0 and 1024."
                            }
                            return ""
                        },
                        "dimension": true,
                        "dimension_name": "Output dimensions"
                    },
                    {
                        "name": "output_y",
                        "name_readable": "Height",
                        "default": 256,
                        "type": "number",
                        "required": true,
                        "validator": (output_y) => {
                            if (output_y <= 0 || output_y > 1024) {
                                return "Output dimensions must be between 0 and 1024."
                            }
                            return ""
                        },
                        "dimension": true,
                        "dimension_name": "Output dimensions"
                    }
                ]
            }
        ],
        "image": "image.png",
        "input_x": true,
        "input_y": true,
        "input_z": true,
        "color": "cyan"
    },
    conv2d: {
        "name": "Conv2D",
        "params": [
            {
                "name": "filters",
                "name_readable": "Number of filters",
                "default": 1,
                "type": "number",
                "required": true,
                "validator": (filters) => {
                    if (filters <= 0 || filters > 256) {
                        return "Number of filters must be between 0 and 256."
                    }
                    return ""
                }
            },
            {
                "name": "kernel_size",
                "name_readable": "Kernel size",
                "default": 3,
                "type": "number",
                "required": true,
                "validator": (kernel_size) => {
                    if (kernel_size <= 0 || kernel_size > 100) {
                        return "Kernel size must be between 0 and 100."
                    }
                    return ""
                }
            },
            {
                "name": "padding",
                "name_readable": "Padding",
                "default": "valid",
                "choices": [
                    {
                        "value": "valid",
                    },
                    {
                        "value": "same",
                    },
                ],
                "required": true
            }
        ],
        "image": "image.png",
        "activation_function": true,
        "input_x": true,
        "input_y": true,
        "input_z": true,
        "color": "lightblue",
        "freezable": true
    },
    maxpool2d: {
        "name": "MaxPool2D",
        "params": [
            {
                "name": "pool_size",
                "name_readable": "Pool size",
                "default": 2,
                "type": "number",
                "required": true,
                "validator": (pool_size) => {
                    if (pool_size <= 0 || pool_size > 64) {
                        return "Number of filters must be between 0 and 64."
                    }
                    return ""
                }
            }
        ],
        "image": "image.png",
        "color": "pink2"
    },
    embedding: {
        "name": "Embedding",
        "params": [
            {
                "name": "max_tokens",
                "name_readable": "Max tokens",
                "default": 10000,
                "type": "number",
                "required": true,
                "validator": (max_tokens) => {
                    if (max_tokens <= 0 || max_tokens > 50000) {
                        return "Max tokens must be between 0 and 50000."
                    }
                    return ""
                }
            },
            {
                "name": "output_dim",
                "name_readable": "Output size",
                "default": 32,
                "type": "number",
                "required": true,
                "validator": (output_dim) => {
                    if (output_dim <= 0 || output_dim > 256) {
                        return "Output size must be between 0 and 256."
                    }
                    return ""
                }
            }
        ],
        "image": "text.png",
        "color": "green",
        "no_dimensions": true,
        "freezable": true
    },
    globalaveragepooling1d: {
        "name": "GlobalAveragePooling1D",
        "params": [],
        "image": "global.svg",
        "color": "darkblue",
        "not_editable": true    // Formatted like this as only a few are not editable
    },
    mobilenetv2: {
        "name": "MobileNetV2",
        "params": [],
        "image": "model.svg",
        "color": "darkblue",
        "default_dimensions": [
            ["Trainable", "False", "darkblue"],    // Name, value, color
            ["Input Width", 224, "gray2"],
            ["Input Height", 224, "gray2"],
            ["Input Depth", 3, "gray2"],
            
        ],
        "not_editable": true,
        "no_dimensions": true,  // Avoids warnings if first layer,
        "info": "The MobileNetV2 model trained on ImageNet. Output shape: (None, 1280)"
    },
    mobilenetv2_96x96: {
        "name": "MobileNetV2",
        "params": [],
        "image": "model.svg",
        "color": "darkblue",
        "default_dimensions": [
            ["Trainable", "False", "darkblue"],    // Name, value, color
            ["Input Width", 96, "gray2"],
            ["Input Height", 96, "gray2"],
            ["Input Depth", 3, "gray2"],
            
        ],
        "not_editable": true,
        "no_dimensions": true,  // Avoids warnings if first layer,
        "info": "The MobileNetV2 model trained on ImageNet. Output shape: (None, 1280)"
    }
}


export const VALID_PREV_LAYERS = { // null means that it can be the first layer
    "dense": [null, "dense", "flatten", "dropout", "textvectorization", "mobilenetv2", "mobilenetv2_96x96"],
    "conv2d": [null, "conv2d", "maxpool2d", "rescaling", "randomflip", "randomrotation", "resizing"],
    "maxpool2d": ["conv2d", "maxpool2d", "rescaling", "resizing"],
    "dropout": ["dense", "dropout", "flatten", "embedding", "globalaveragepooling1d", "mobilenetv2", "mobilenetv2_96x96"],
    "flatten": [null, "dense", "dropout", "flatten", "conv2d", "maxpool2d", "rescaling", "resizing", "mobilenetv2", "mobilenetv2_96x96"],
    "rescaling": [null, "randomflip", "resizing", "randomrotation"],
    "randomflip": [null, "rescaling", "resizing", "randomrotation"],
    "randomrotation": [null, "rescaling", "resizing", "randomflip"],
    "resizing": [null],
    "textvectorization": [null],
    "embedding": [null, "textvectorization"],
    "globalaveragepooling1d": ["embedding", "dense", "dropout", "mobilenetv2", "mobilenetv2_96x96"],
    "mobilenetv2": [null, "conv2d", "maxpool2d", "rescaling", "randomflip", "randomrotation", "resizing"],
    "mobilenetv2_96x96": [null, "conv2d", "maxpool2d", "rescaling", "randomflip", "randomrotation", "resizing"],
}

export const WARNING_MESSAGES = {
    "dense": "A Dense layer must be the first one, else follow one of the following layers: [" + VALID_PREV_LAYERS["dense"].slice(1).join(", ") + "].",
    "conv2d": "A Conv2D layer must be the first one, else follow one of the following layers: [" + VALID_PREV_LAYERS["conv2d"].slice(1).join(", ") + "].",
    "maxpool2d": "A MaxPool2D layer must follow one of the following layers: [" + VALID_PREV_LAYERS["maxpool2d"].slice(1).join(", ") + "].",
    "dropout": "A Dropout layer must follow one of the following layers: [" + VALID_PREV_LAYERS["dropout"].slice(1).join(", ") + "].",
    "flatten": "Invalid previous layer.",
    "rescaling": "Must be the first layer or follow another preprocessing layer.",
    "randomflip": "Must be the first layer or follow another preprocessing layer.",
    "randomrotation": "Must be the first layer or follow another preprocessing layer.",
    "resizing": "Must be the first layer.",
    "textvectorization": "Must be the first layer.",
    "embedding": "Must be the first layer, else follow one of the following layers: [" + VALID_PREV_LAYERS["embedding"].slice(1).join(", ") + "].",
    "globalaveragepooling1d": "A GlobalAveragePooling1D layer must follow one of the following layers: [" + VALID_PREV_LAYERS["globalaveragepooling1d"].slice(1).join(", ") + "].",
    "mobilenetv2": "A MobileNetV2 layer must be the first one, else follow one of the following layers: [" + VALID_PREV_LAYERS["mobilenetv2"].slice(1).join(", ") + "].",
    "mobilenetv2_96x96": "A MobileNetV2 layer must be the first one, else follow one of the following layers: [" + VALID_PREV_LAYERS["mobilenetv2_96x96"].slice(1).join(", ") + "].",
}

export function getLayerName(layer) {
    let type = layer.layer_type
    if (type == "dense") {
        return "Dense (" + layer.nodes_count + ")"
    } else if (type == "conv2d") {
        return "Conv2D (" + layer.filters + ", " + layer.kernel_size + ")"
    } else if (type == "maxpool2d") {
        return "MaxPool2D (" + layer.pool_size + ")"
    } else if (type == "flatten") {
        return "Flatten" + (layer.input_x ? " (" + layer.input_x + ", " + layer.input_y + ")" : "")
    } else if (type == "dropout") {
        return "Dropout (" + layer.rate + ")"
    } else if (type == "rescaling") {
        return "Rescale (" + layer.scale + ", " + layer.offset + ")"
    } else if (type == "randomflip") {
        return "RandomFlip (" + layer.mode + ")"
    } else if (type == "randomrotation") {
        return "RandomRotation (" + layer.factor + ")"
    } else if (type == "resizing") {
        return "Resizing (" + layer.input_x + ", " + layer.input_y + ")"
    } else if (type == "textvectorization") {
        return "TextVectorization (" + layer.max_tokens + ")"
    } else if (type == "embedding") {
        return "Embedding (" + layer.max_tokens + ", " + layer.output_dim + ")"
    } else if (type == "globalaveragepooling1d") {
        return "GlobalAveragePooling1D"
    } else if (type == "mobilenetv2") {
        return "MobileNetV2"
    } else if (type == "mobilenetv2_96x96") {
        return "MobileNetV2"
    }
}

export function computeParams(layers, sequence_length = 256) {
    let totalParams = 0;
  
    // For Conv2D/MaxPool2D shape tracking
    let current_x = null;
    let current_y = null;
    let current_z = null;
  
    // For sequence-based layers like Embedding, Conv1D, GlobalPooling
    let current_steps = null;
    let current_feats = null;
  
    let inUnits = null; // For Dense layer
  
    layers.forEach((layer) => {
      const type = layer.layer_type;
  
      if (type === 'conv2d') {
        const filters = layer.filters;
        const kernel_size = layer.kernel_size;
        const stride = 1;
        const paddingType = layer.padding || 'valid';
  
        // Initialize spatial dims if not set
        if (!current_x || !current_y || !current_z) {
          current_x = layer.input_x;
          current_y = layer.input_y;
          current_z = layer.input_z;
        }
  
        let out_x, out_y;
        if (paddingType === 'same') {
            out_x = Math.ceil(current_x / stride);
            out_y = Math.ceil(current_y / stride);
        } else { // 'valid'
            out_x = Math.floor((current_x - kernel_size + 1) / stride);
            out_y = Math.floor((current_y - kernel_size + 1) / stride);
        }
        const out_z = filters;
  
        const params = (kernel_size * kernel_size * current_z + 1) * filters;
        totalParams += params;
  
        current_x = out_x;
        current_y = out_y;
        current_z = out_z;
  
        // Clear sequence tracking if switching from sequence to image
        current_steps = null;
        current_feats = null;
      }
  
      else if (type === 'maxpool2d') {
        const stride = layer.pool_size;
  
        current_x = Math.floor(current_x / stride);
        current_y = Math.floor(current_y / stride);
        // current_z unchanged
      }
  
      else if (type === 'flatten') {
        if (current_x !== null && current_y !== null && current_z !== null) {
          inUnits = current_x * current_y * current_z;
        } else if (current_steps !== null && current_feats !== null) {
          inUnits = current_steps * current_feats;
        }
  
        // Clear all shape tracking
        current_x = current_y = current_z = null;
        current_steps = current_feats = null;
      }
  
      else if (type === 'dense') {
        const units = layer.nodes_count;
  
        if (inUnits === null) {
          inUnits = layer.input_x || 1;
        }
  
        const params = (inUnits + 1) * units;
        totalParams += params;
  
        inUnits = units;
      }
  
      else if (type === 'globalaveragepooling1d') {
        if (current_feats !== null) {
          inUnits = current_feats;
        }
  
        current_steps = null;
        current_feats = null;
      }
  
      else if (type === 'embedding') {
        const maxTokens = layer.max_tokens;
        const outputDim = layer.output_dim;
        const inputLength = sequence_length;
  
        const params = maxTokens * outputDim;
        totalParams += params;
  
        current_steps = inputLength;
        current_feats = outputDim;
  
        // Clear image shape
        current_x = current_y = current_z = null;
        inUnits = null;
      }

      else if (
        type === 'rescaling' ||
        type === 'resizing' ||
        type === 'randomflip'
      ) {
        // These layers have no parameters, but may define input shape
        if (
          (current_x === null || current_x === 0) &&
          (layer.input_x !== undefined && layer.input_x !== 0)
        ) {
          current_x = layer.input_x;
        }
      
        if (
          (current_y === null || current_y === 0) &&
          (layer.input_y !== undefined && layer.input_y !== 0)
        ) {
          current_y = layer.input_y;
        }
      
        if (
          (current_z === null || current_z === 0) &&
          (layer.input_z !== undefined && layer.input_z !== 0)
        ) {
          current_z = layer.input_z;
        }
      
        // Skip parameter count, these layers don't have any
        return;
      }

    else if (type === 'mobilenetv2') {
        const knownParams = 2257984; // Includes trainable + non-trainable params

        totalParams += knownParams;

        // Output shape after GlobalAveragePooling2D
        current_x = null;
        current_y = null;
        current_z = null;

        current_steps = null;
        current_feats = 1280;  // Flattened 1D vector with 1280 features
        inUnits = 1280;
    }

    else if (type === 'mobilenetv2_96x96') {
        const knownParams = 2257984; // UPDATE THIS

        totalParams += knownParams;

        // Output shape after GlobalAveragePooling2D
        current_x = null;
        current_y = null;
        current_z = null;

        current_steps = null;
        current_feats = 1280;  // Flattened 1D vector with 1280 features
        inUnits = 1280;
    }
    });
  
    return totalParams;
  }
  