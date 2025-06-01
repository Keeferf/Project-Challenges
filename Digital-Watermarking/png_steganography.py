import cv2
import numpy as np
import os
from PIL import Image

# --- Hamming(7,4) Matrices (Renamed) ---
HAMMING_ENC = np.array([
    [1, 1, 0, 1],
    [1, 0, 1, 1],
    [1, 0, 0, 0],
    [0, 1, 1, 1],
    [0, 1, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1]
])

HAMMING_DEC = np.array([
    [1, 0, 1, 0, 1, 0, 1],
    [0, 1, 1, 0, 0, 1, 1],
    [0, 0, 0, 1, 1, 1, 1]
])

def hamming_encode(data):
    """Encodes 4-bit data into a 7-bit Hamming codeword."""
    if isinstance(data, int):
        data = [int(b) for b in format(data, '04b')]
    return np.dot(HAMMING_ENC, data) % 2

def hamming_decode(codeword):
    """Decodes a 7-bit Hamming codeword, correcting single-bit errors."""
    syndrome = np.dot(HAMMING_DEC, codeword) % 2
    error_pos = syndrome[0] + syndrome[1]*2 + syndrome[2]*4

    if error_pos != 0:
        codeword[error_pos-1] ^= 1  # Correct the bit
    return np.array([codeword[2], codeword[4], codeword[5], codeword[6]])

# --- Core Steganography Functions ---
def create_output_folder():
    """Creates an 'output' directory if it doesn't exist."""
    os.makedirs('output', exist_ok=True)

def preprocess_secret_image(secret_img, threshold=128):
    """Converts any secret image to pure black and white (1-bit)."""
    if secret_img.mode != 'L':
        secret_img = secret_img.convert('L')  # Convert to grayscale
    return secret_img.point(lambda p: 255 if p > threshold else 0)

def resize(secret_img, cover_img):
    """Resizes secret image to 50% of cover image dimensions (Renamed from resize_secret_to_cover)."""
    target_width = int(cover_img.width * 0.5)
    target_height = int(cover_img.height * 0.5)
    return secret_img.resize((target_width, target_height), Image.LANCZOS)

def encode_data_with_ecc(secret_data):
    """Encodes binary data with Hamming(7,4) and 3x redundancy."""
    binary_data = (secret_data.flatten() > 127).astype(np.uint8)
    pad_len = (4 - len(binary_data) % 4) % 4
    binary_data = np.concatenate([binary_data, np.zeros(pad_len, dtype=np.uint8)])
    
    encoded_data = []
    for i in range(0, len(binary_data), 4):
        chunk = binary_data[i:i+4]
        codeword = hamming_encode(chunk)
        encoded_data.extend(codeword)  # 3x redundancy
        encoded_data.extend(codeword)
        encoded_data.extend(codeword)
    
    return np.array(encoded_data, dtype=np.uint8)

def decode_data_with_ecc(encoded_data):
    """Decodes data with Hamming(7,4) and handles 3x redundancy."""
    decoded_bits = []
    for i in range(0, len(encoded_data), 21):  # 7 bits * 3 copies
        if i + 21 > len(encoded_data):
            break
            
        codewords = [
            hamming_decode(encoded_data[i:i+7]),
            hamming_decode(encoded_data[i+7:i+14]),
            hamming_decode(encoded_data[i+14:i+21])
        ]    
        
        # Majority voting across 3 copies
        final_bits = [1 if sum(bits) >= 2 else 0 for bits in zip(*codewords)]
        decoded_bits.extend(final_bits)
    
    return np.array(decoded_bits, dtype=np.uint8)

def embed(cover_img, secret_img):
    """Embeds resized secret image with 3x redundancy."""
    cover = np.array(cover_img).astype(np.int16)
    secret = np.array(secret_img)
    encoded_secret = encode_data_with_ecc(secret)
    
    stego_img = cover.copy()
    bit_index = 0
    height, width = cover.shape[:2]
    
    for i in range(height):
        for j in range(width):
            for k in range(3):  # RGB channels
                if bit_index >= len(encoded_secret):
                    break
                
                pixel = cover[i, j, k]
                secret_bit = encoded_secret[bit_index]
                lsb = pixel & 1
                
                if lsb != secret_bit:
                    stego_img[i, j, k] = pixel + 1 if pixel < 255 else pixel - 1
                bit_index += 1
    
    stego_img = np.clip(stego_img, 0, 255).astype(np.uint8)
    print(f"Embedded {bit_index} bits (3x redundancy)")
    return Image.fromarray(stego_img)

def extract(stego_img):
    """Extracts secret image (assumes 50% scaling)."""
    stego = np.array(stego_img)
    extracted_bits = []
    
    for i in range(stego.shape[0]):
        for j in range(stego.shape[1]):
            for k in range(3):
                extracted_bits.append(stego[i, j, k] & 1)
    
    decoded_bits = decode_data_with_ecc(np.array(extracted_bits))
    
    # Rebuild at 50% of stego dimensions
    secret_height = int(stego.shape[0] * 0.5)
    secret_width = int(stego.shape[1] * 0.5)
    extracted_img = np.zeros((secret_height, secret_width), dtype=np.uint8)
    
    bit_pos = 0
    for i in range(secret_height):
        for j in range(secret_width):
            if bit_pos < len(decoded_bits):
                extracted_img[i, j] = 255 if decoded_bits[bit_pos] else 0
                bit_pos += 1
    
    extracted_img = cv2.medianBlur(extracted_img, 3)
    return Image.fromarray(extracted_img)

def process_images(cover_path, secret_path):
    try:
        create_output_folder()
        cover_img = Image.open(cover_path).convert('RGB')
        secret_img = Image.open(secret_path)
        
        # Preprocess and resize
        secret_img_bw = preprocess_secret_image(secret_img)
        secret_img_resized = resize(secret_img_bw, cover_img)
        
        print("\n=== Embedding ===")
        stego_img = embed(cover_img, secret_img_resized)
        stego_path = os.path.join('output', 'stego.png')
        stego_img.save(stego_path)
        print(f"Stego image saved to: {stego_path}")
        
        print("\n=== Extraction ===")
        extracted_img = extract(stego_img)
        extracted_path = os.path.join('output', 'extracted.png')
        extracted_img.save(extracted_path)
        print(f"Extracted secret saved to: {extracted_path}\n")
        
    except Exception as e:
        print(f"Error: {e}")

def main():
    cover_path = "hoodmouseblack.png" 
    secret_path = "whitewatermark.png"
    process_images(cover_path, secret_path)

if __name__ == "__main__":
    main()