export const TEMPLATE_DATA = {
    "cv-small": [
        {
            "type": "conv2d",
            "activation_function": "relu",
            "input_x": 32,
            "input_y": 32,
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
            "type": "dropout",
            "rate": 0.2
        },
        {
            "type": "dense",
            "activation_function": "relu",
            "nodes_count": 16
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
            "input_x": 32,
            "input_y": 32,
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
            "type": "dropout",
            "rate": 0.2
        },
        {
            "type": "dense",
            "activation_function": "relu",
            "nodes_count": 32
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
            "input_x": 32,
            "input_y": 32,
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
            "type": "flatten"
        },
        {
            "type": "dropout",
            "rate": 0.2
        },
        {
            "type": "dense",
            "activation_function": "relu",
            "nodes_count": 32
        },
        {
            "type": "dense",
            "activation_function": "sigmoid",
            "nodes_count": 1
        },
    ],
    "text-small": [
        {
            "type": "embedding",
            "max_tokens": 5000,
            "output_dim": 16
        },
        {
            "type": "globalaveragepooling1d"
        },
        {
            "type": "dropout",
            "rate": 0.2
        },
        {
            "type": "dense",
            "nodes_count": 16,
            "activation_function": "relu"
        },
        {
            "type": "dense",
            "nodes_count": 1,
            "activation_function": "sigmoid"
        }
    ],
    "text-medium": [
        {
            "type": "embedding",
            "max_tokens": 10000,
            "output_dim": 32
        },
        {
            "type": "dropout",
            "rate": 0.2
        },
        {
            "type": "globalaveragepooling1d"
        },
        {
            "type": "dropout",
            "rate": 0.2
        },
        {
            "type": "dense",
            "nodes_count": 32,
            "activation_function": "relu"
        },
        {
            "type": "dense",
            "nodes_count": 1,
            "activation_function": "sigmoid"
        }
    ],
    "text-large": [
        {
            "type": "embedding",
            "max_tokens": 10000,
            "output_dim": 64
        },
        {
            "type": "dropout",
            "rate": 0.2
        },
        {
            "type": "globalaveragepooling1d"
        },
        {
            "type": "dropout",
            "rate": 0.2
        },
        {
            "type": "dense",
            "nodes_count": 64,
            "activation_function": "relu"
        },
        {
            "type": "dense",
            "nodes_count": 1,
            "activation_function": "sigmoid"
        }
    ]
}