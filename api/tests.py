import torch
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms
from PIL import Image
import os
import re

# Define the dataset directory
dataset_dir = 'path_to_your_dataset'

# Regular expression to extract the label from filename
def extract_label_from_filename(filename):
    return filename.split('_')[0]  # Extract everything before the underscore (_)

# Get the list of all files
file_paths = [os.path.join(dataset_dir, fname) for fname in os.listdir(dataset_dir) if fname.endswith(('.jpg', '.png'))]

# Create a mapping of labels to indices
unique_labels = sorted(set([extract_label_from_filename(os.path.basename(fp)) for fp in file_paths]))
label_to_index = {label: idx for idx, label in enumerate(unique_labels)}

# Define a custom Dataset class
class CustomImageDataset(Dataset):
    def __init__(self, file_paths, label_to_index, transform=None):
        self.file_paths = file_paths
        self.label_to_index = label_to_index
        self.transform = transform

    def __len__(self):
        return len(self.file_paths)

    def __getitem__(self, idx):
        file_path = self.file_paths[idx]
        file_name = os.path.basename(file_path)

        # Extract label and map to index
        label_str = extract_label_from_filename(file_name)
        label = self.label_to_index[label_str]

        # Load and transform the image
        image = Image.open(file_path).convert('RGB')
        if self.transform:
            image = self.transform(image)

        return image, label

# Define transformations (resize, convert to tensor, normalize)
transform = transforms.Compose([
    transforms.Resize((224, 224)),  # Resize images
    transforms.ToTensor(),  # Convert to PyTorch tensor
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])  # Normalize using ImageNet mean/std
])

# Create dataset
dataset = CustomImageDataset(file_paths, label_to_index, transform=transform)