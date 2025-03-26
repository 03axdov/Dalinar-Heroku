export const LAYERS = {
    dense: {
        "name": "Dense",
        "params": [
            {
                "name": "nodes_count",
                "name_readable": "Number of nodes",
                "default": 8,
                "type": "number",
                "required": true
            }
        ],
        "image": "dense.svg",
        "has_activation": true,
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
                "required": true
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
                "required": true
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
                            if (output_x <= 0) {
                                return "Output dimensions must be positive."
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
                            if (output_y <= 0) {
                                return "Output dimensions must be positive."
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
                "required": true
            },
            {
                "name": "kernel_size",
                "name_readable": "Kernel size",
                "default": 3,
                "type": "number",
                "required": true
            }
        ],
        "image": "image.png",
        "has_activation": true,
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
                "required": true
            }
        ],
        "image": "image.png",
        "color": "pink2"
    },
    textvectorization: {
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
            }
        ],
        "image": "text.png",
        "color": "cyan",
        "no_dimensions": true
    },
    embedding: {
        "name": "Embedding",
        "params": [
            {
                "name": "max_tokens",
                "name_readable": "Max tokens",
                "default": 10000,
                "type": "number",
                "required": true
            },
            {
                "name": "output_dim",
                "name_readable": "Output size",
                "default": 16,
                "type": "number",
                "required": true
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