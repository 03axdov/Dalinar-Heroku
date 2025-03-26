const LAYERS = {
    dense: {
        "params": [
            {
                "name": "nodes_count",
                "name_readable": "Number of nodes",
                "default": 8,
                "type": "number",
                "required": true
            }
        ],
        "has_activation": true,
        "input_x": true
    },
    flatten: {
        "params": [],
        "input_x": true,
        "input_y": true
    },
    dropout: {
        "params": [
            {
                "name": "rate",
                "name_readable": "Rate",
                "default": 0.2,
                "type": "number",
                "required": true
            }
        ]
    },
    rescaling: {
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
        "input_x": true,
        "input_y": true,
        "input_z": true
    },
    randomflip: {
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
        "input_x": true,
        "input_y": true,
        "input_z": true
    },
    resizing: {
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
        "input_x": true,
        "input_y": true,
        "input_z": true
    },
    conv2d: {
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
        "has_activation": true,
        "input_x": true,
        "input_y": true,
        "input_z": true
    },
    maxpool2d: {
        "params": [
            {
                "name": "pool_size",
                "name_readable": "Pool size",
                "default": 2,
                "type": "number",
                "required": true
            }
        ]
    },
    textvectorization: {
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
        ]
    },
    embedding: {
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
        ]
    }
}

export default LAYERS