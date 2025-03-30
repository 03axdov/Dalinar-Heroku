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
        "color": "purple"
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
        "color": "darkblue"
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
        "color": "cyan"
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
        "color": "green"
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
            }
        ],
        "image": "image.png",
        "activation_function": true,
        "input_x": true,
        "input_y": true,
        "input_z": true,
        "color": "lightblue"
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
    /* textvectorization: {
        "name": "TextVectorization",
        "params": [
            {
                "name": "max_tokens",
                "name_readable": "Max tokens",
                "default": 10000,
                "type": "number",
                "required": true
            },
            {
                "name": "standardize",
                "name_readable": "Standardize",
                "choices": [
                    {
                        "value": "",
                        "name": "(none)"
                    },
                    {
                        "value": "lower_and_strip_punctuation",
                    },
                    {
                        "value": "lower",
                    },
                    {
                        "value": "strip_punctuation"
                    }
                ],
                "default": "lower_and_strip_punctuation"
            },
            {
                "name": "output_sequence_length",
                "name_readable": "Output length",
                "type": "number",
                "default": 256,
                "required": true
            }
        ],
        "image": "text.png",
        "color": "cyan",
        "no_dimensions": true
    }, */
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
        "no_dimensions": true
    },
    globalaveragepooling1d: {
        "name": "GlobalAveragePooling1D",
        "params": [],
        "image": "global.svg",
        "color": "lightblue"
    }
}


export const VALID_PREV_LAYERS = { // null means that it can be the first layer
    "dense": [null, "dense", "flatten", "dropout", "textvectorization"],
    "conv2d": [null, "conv2d", "maxpool2d", "rescaling", "randomflip", "resizing"],
    "maxpool2d": ["conv2d", "maxpool2d", "rescaling", "resizing"],
    "dropout": ["dense", "dropout", "flatten", "embedding", "globalaveragepooling1d"],
    "flatten": [null, "dense", "dropout", "flatten", "conv2d", "maxpool2d", "rescaling", "resizing"],
    "rescaling": [null, "randomflip", "resizing"],
    "randomflip": [null, "rescaling", "resizing"],
    "resizing": [null],
    "textvectorization": [null],
    "embedding": [null, "textvectorization"],
    "globalaveragepooling1d": ["embedding", "dense", "dropout"]
}

export const WARNING_MESSAGES = {
    "dense": "A Dense layer must be the first one, else follow one of the following layers: [" + VALID_PREV_LAYERS["dense"].slice(1).join(", ") + "].",
    "conv2d": "A Conv2D layer must be the first one, else follow one of the following layers: [" + VALID_PREV_LAYERS["conv2d"].slice(1).join(", ") + "].",
    "maxpool2d": "A MaxPool2D layer must follow one of the following layers: [" + VALID_PREV_LAYERS["maxpool2d"].slice(1).join(", ") + "].",
    "dropout": "A Dropout layer must follow one of the following layers: [" + VALID_PREV_LAYERS["dropout"].slice(1).join(", ") + "].",
    "flatten": "Invalid previous layer.",
    "rescaling": "Must be the first layer or follow another preprocessing layer.",
    "randomflip": "Must be the first layer or follow another preprocessing layer.",
    "resizing": "Must be the first layer.",
    "textvectorization": "Must be the first layer.",
    "embedding": "Must be the first layer, else follow one of the following layers: [" + VALID_PREV_LAYERS["embedding"].slice(1).join(", ") + "].",
    "globalaveragepooling1d": "A GlobalAveragePooling1D layer must follow one of the following layers: [" + VALID_PREV_LAYERS["globalaveragepooling1d"].slice(1).join(", ") + "].",
}

export function getLayerName(layer) {
    let type = layer.layer_type
    if (type == "dense") {
        return "Dense - " + layer.nodes_count + (layer.input_x ? " (" + layer.input_x + ")" : "")
    } else if (type == "conv2d") {
        return "Conv2D - (" + layer.filters + ", " + layer.kernel_size + ")"
    } else if (type == "maxpool2d") {
        return "MaxPool2D - " + layer.pool_size
    } else if (type == "flatten") {
        return "Flatten" + (layer.input_x ? " - (" + layer.input_x + ", " + layer.input_y + ")" : "")
    } else if (type == "dropout") {
        return "Dropout (" + layer.rate + ")"
    } else if (type == "rescaling") {
        return "Rescale (" + layer.scale + ", " + layer.offset + ")"
    } else if (type == "randomflip") {
        return "RandomFlip (" + layer.mode + ")"
    } else if (type == "resizing") {
        return "Resizing (" + layer.input_x + ", " + layer.input_y + ")"
    } else if (type == "textvectorization") {
        return "TextVectorization (" + layer.max_tokens + ")"
    } else if (type == "embedding") {
        return "Embedding (" + layer.max_tokens + ", " + layer.output_dim + ")"
    } else if (type == "globalaveragepooling1d") {
        return "GlobalAveragePooling1D"
    }
}