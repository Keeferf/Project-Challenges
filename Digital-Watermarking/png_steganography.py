import cv2
import numpy as np
import os
import time
import random
from PIL import Image

def create_output_folder():
    """Creates an 'output' directory if it doesn't exist."""
    os.makedirs('output', exist_ok=True)

def preprocess_secret_image(secret_img, threshold=128):
    """Converts any secret image to pure black and white (1-bit)."""
    if secret_img.mode != 'L':
        secret_img = secret_img.convert('L')  # Convert to grayscale
    return secret_img.point(lambda p: 255 if p > threshold else 0)

def calculate_embedding_area(cover_shape):
    """Calculates target dimensions and starting positions for embedding."""
    target_width = int(cover_shape[1] * 0.5)
    target_height = int(cover_shape[0] * 0.5)
    start_i = (cover_shape[0] - target_height) // 2
    start_j = (cover_shape[1] - target_width) // 2
    return target_width, target_height, start_i, start_j

def embed(cover_img, secret_img):
    """Embeds a black & white secret image using improved LSB matching."""
    start_time = time.time()
    
    cover = np.array(cover_img).astype(np.int16)
    target_width, target_height, start_i, start_j = calculate_embedding_area(cover.shape)
    
    secret = np.array(secret_img)
    secret = cv2.resize(secret, (target_width, target_height))
    
    stego_img = cover.copy()
    
    for i in range(target_height):
        for j in range(target_width):
            secret_bit = 1 if secret[i, j] > 127 else 0
            for k in range(3):  # Process each RGB channel
                pixel = cover[start_i + i, start_j + j, k]
                lsb = pixel & 1
                
                if lsb != secret_bit:
                    # Prefer adding 1 when possible to reduce noise
                    if pixel < 255:
                        stego_img[start_i + i, start_j + j, k] = pixel + 1
                    else:
                        stego_img[start_i + i, start_j + j, k] = pixel - 1
    
    stego_img = np.clip(stego_img, 0, 255).astype(np.uint8)
    print(f"Embedding completed in {time.time() - start_time:.2f} seconds")
    return Image.fromarray(stego_img)

def extract(stego_img):
    """Improved extraction with noise reduction."""
    start_time = time.time()
    stego = np.array(stego_img)
    target_width, target_height, start_i, start_j = calculate_embedding_area(stego.shape)
    
    extracted_img = np.zeros((target_height, target_width), dtype=np.uint8)
    
    for i in range(target_height):
        for j in range(target_width):
            # Use all 3 channels but prioritize consistent bits
            bits = [stego[start_i + i, start_j + j, k] & 1 for k in range(3)]
            
            # Only set to white if all 3 channels agree (reduces pepper noise)
            if sum(bits) == 3:
                extracted_img[i, j] = 255
            # Only set to black if all 3 channels agree (reduces salt noise)
            elif sum(bits) == 0:
                extracted_img[i, j] = 0
            # For mixed cases, use the original secret's threshold
            else:
                extracted_img[i, j] = 255 if stego[start_i + i, start_j + j, 0] & 1 else 0
    
    # Apply median filter to reduce remaining noise
    extracted_img = cv2.medianBlur(extracted_img, 3)
    
    print(f"Extraction completed in {time.time() - start_time:.2f} seconds")
    return Image.fromarray(extracted_img)

def process_images(cover_path, secret_path):
    """Handles the main image processing workflow."""
    try:
        # Load images
        cover_img = Image.open(cover_path).convert('RGB')
        secret_img = Image.open(secret_path)
        
        secret_img_bw = preprocess_secret_image(secret_img)
        
        # Embed and save stego image
        print("\n=== Embedding ===")
        stego_img = embed(cover_img, secret_img_bw)
        stego_path = os.path.join('output', 'stego.png')
        stego_img.save(stego_path)
        print(f"Stego image saved to: {stego_path}")
        
        # Extract and save secret
        print("\n=== Extraction ===")
        extracted_img = extract(stego_img)
        extracted_path = os.path.join('output', 'extracted.png')
        extracted_img.save(extracted_path)
        print(f"Extracted secret saved to: {extracted_path}\n")
        
    except Exception as e:
        print(f"Error: {e}")

def main():
    create_output_folder()
    
    # Hardcoded paths (change these to your images)
    cover_path = "hoodmouseblack.png"
    secret_path = "whitewatermark.png"
    
    process_images(cover_path, secret_path)

if __name__ == "__main__":
    main()