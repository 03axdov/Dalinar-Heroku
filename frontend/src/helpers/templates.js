export const TEMPLATE_DATA = {
    "cv-small": [
        {
            "type": "conv2d",
            "activation_function": "relu",
            "input_x": 256,
            "input_y": 256,
            "input_z": 3,
            "filters": 16,
            "kernel_size": 3
        },
        {
            "type": "maxpool2d",
            "pool_size": 2
        },
        {
            "type": "conv2d",
            "activation_function": "relu",
            "filters": 16,
            "kernel_size": 3
        },
        {
            "type": "maxpool2d",
            "pool_size": 2
        },
        {
            "type": "flatten"
        },
        {
            "type": "dense",
            "activation_function": "relu",
            "nodes_count": 8
        },
        {
            "type": "dropout",
            "rate": 0.2
        },
        {
            "type": "dense",
            "activation_function": "sigmoid",
            "nodes_count": 1
        },
    ],
    "cv-medium": [
        {
            "type": "conv2d",
            "activation_function": "relu",
            "input_x": 256,
            "input_y": 256,
            "input_z": 3,
            "filters": 32,
            "kernel_size": 3
        },
        {
            "type": "maxpool2d",
            "pool_size": 2
        },
        {
            "type": "conv2d",
            "activation_function": "relu",
            "filters": 32,
            "kernel_size": 3
        },
        {
            "type": "maxpool2d",
            "pool_size": 2
        },
        {
            "type": "flatten"
        },
        {
            "type": "dense",
            "activation_function": "relu",
            "nodes_count": 16
        },
        {
            "type": "dropout",
            "rate": 0.2
        },
        {
            "type": "dense",
            "activation_function": "sigmoid",
            "nodes_count": 1
        },
    ],
    "cv-large": [
        {
            "type": "conv2d",
            "activation_function": "relu",
            "input_x": 256,
            "input_y": 256,
            "input_z": 3,
            "filters": 32,
            "kernel_size": 3
        },
        {
            "type": "maxpool2d",
            "pool_size": 2
        },
        {
            "type": "conv2d",
            "activation_function": "relu",
            "filters": 32,
            "kernel_size": 3
        },
        {
            "type": "maxpool2d",
            "pool_size": 2
        },
        {
            "type": "conv2d",
            "activation_function": "relu",
            "filters": 32,
            "kernel_size": 3
        },
        {
            "type": "maxpool2d",
            "pool_size": 2
        },
        {
            "type": "flatten"
        },
        {
            "type": "dense",
            "activation_function": "relu",
            "nodes_count": 32
        },
        {
            "type": "dropout",
            "rate": 0.2
        },
        {
            "type": "dense",
            "activation_function": "sigmoid",
            "nodes_count": 1
        },
    ]
}