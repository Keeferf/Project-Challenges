import numpy as np
import jpeglib
import cv2
import os

# =============================================
#           HARDCODED CONFIGURATION
# =============================================
HOST_IMAGE = "hemsworth.jpg"            # Input JPEG (where watermark will hide)
WATERMARK_IMAGE = "whitewatermark.png"  # Watermark image (e.g., PNG logo)
OUTPUT_IMAGE = "watermarked.jpg"   # Output JPEG (with hidden watermark)
EXTRACTED_WATERMARK = "extracted_watermark.png"  # Recovered watermark
# =============================================

def preprocess_watermark(host_path, watermark_path):
    """Resize watermark to fit host capacity."""
    # Get host dimensions
    with jpeglib.read_dct(host_path) as dct:
        blocks_y = dct.Y.shape[0]
        blocks_x = dct.Y.shape[1]
        max_bits = blocks_x * blocks_y
    
    # Resize watermark to sqrt(max_bits) x sqrt(max_bits)
    watermark = cv2.imread(watermark_path, cv2.IMREAD_GRAYSCALE)
    new_size = int(np.sqrt(max_bits))
    watermark = cv2.resize(watermark, (new_size, new_size))
    cv2.imwrite("watermark_resized.png", watermark)
    return new_size

def image_to_bits(img_path):
    """Convert a binary image (black/white) to bitstream."""
    img = cv2.imread(img_path, cv2.IMREAD_GRAYSCALE)
    _, binary_img = cv2.threshold(img, 128, 1, cv2.THRESH_BINARY)  # Convert to 0s/1s
    return binary_img.flatten().astype(str).tolist()  # e.g., ['0','1','1',...]

def bits_to_image(bits, output_path, shape):
    """Convert bitstream back to an image."""
    binary_array = np.array([int(bit) for bit in bits], dtype=np.uint8)
    binary_array = binary_array * 255  # Scale to 0/255 (black/white)
    binary_image = binary_array.reshape(shape)
    cv2.imwrite(output_path, binary_image)

def embed_watermark():
    """Embeds a resized watermark into host JPEG using multiple DCT coefficients per block."""
    # Check if files exist
    if not all(os.path.exists(f) for f in [HOST_IMAGE, WATERMARK_IMAGE]):
        raise FileNotFoundError("Host/watermark image not found!")

    # --- Step 1: Resize watermark to fit host capacity ---
    with jpeglib.read_dct(HOST_IMAGE) as dct:
        host_blocks_y, host_blocks_x = dct.Y.shape[0], dct.Y.shape[1]
        max_bits = host_blocks_y * host_blocks_x * 3  # 3 bits/block (adjustable)

    # Load and preprocess watermark (convert to binary and resize)
    watermark = cv2.imread(WATERMARK_IMAGE, cv2.IMREAD_GRAYSCALE)
    _, binary_watermark = cv2.threshold(watermark, 128, 1, cv2.THRESH_BINARY)
    watermark_pixels = binary_watermark.size

    # Resize if watermark is too large
    if watermark_pixels > max_bits:
        new_size = int(np.sqrt(max_bits))  # Square watermark for simplicity
        binary_watermark = cv2.resize(binary_watermark, (new_size, new_size), 
                                    interpolation=cv2.INTER_NEAREST)
        print(f"⚠️ Watermark resized to {new_size}x{new_size} to fit host capacity")

    # Flatten watermark into bits
    watermark_bits = binary_watermark.flatten().astype(str).tolist()
    watermark_len = len(watermark_bits)
    print(f"📊 Watermark size: {watermark_len} bits (max host capacity: {max_bits})")

    # --- Step 2: Embed in DCT coefficients ---
    with jpeglib.read_dct(HOST_IMAGE) as dct:
        dct_Y = dct.Y
        bit_idx = 0

        # Embed in 3 mid-frequency coefficients per block (positions 3,3 to 5,5)
        coeff_positions = [(3, 3), (4, 4), (5, 5)]  # Mid-frequency zigzag order

        for i in range(host_blocks_y):
            for j in range(host_blocks_x):
                for pos in coeff_positions:
                    if bit_idx >= watermark_len:
                        break
                    coeff = dct_Y[i][j][pos[0]][pos[1]]
                    if coeff != 0:  # Skip zero coefficients
                        dct_Y[i][j][pos[0]][pos[1]] = (coeff & ~1) | int(watermark_bits[bit_idx])
                        bit_idx += 1

        dct.write_dct(OUTPUT_IMAGE)

    print(f"✅ Embedded {bit_idx}/{watermark_len} bits into {host_blocks_y}x{host_blocks_x} blocks")
    print(f"   Watermarked image saved as '{OUTPUT_IMAGE}'")

def extract_watermark():
    """Blindly extract watermark from DCT coefficients."""
    if not os.path.exists(OUTPUT_IMAGE):
        raise FileNotFoundError(f"Watermarked image '{OUTPUT_IMAGE}' not found!")
    
    # Get watermark shape (assuming you know the original dimensions)
    original_watermark = cv2.imread(WATERMARK_IMAGE, cv2.IMREAD_GRAYSCALE)
    watermark_shape = original_watermark.shape
    watermark_len = original_watermark.size  # Total bits = width * height
    
    # Extract bits from DCT coefficients
    extracted_bits = []
    with jpeglib.read_dct(OUTPUT_IMAGE) as dct:
        dct_Y = dct.Y
        bit_idx = 0
        
        for i in range(dct_Y.shape[0]):
            for j in range(dct_Y.shape[1]):
                if bit_idx >= watermark_len:
                    break
                
                coeff = dct_Y[i][j][4][4]
                if coeff != 0:
                    extracted_bits.append(str(coeff & 1))
                    bit_idx += 1
    
    # Reconstruct watermark image
    bits_to_image(extracted_bits, EXTRACTED_WATERMARK, watermark_shape)
    print(f"🔍 Extracted watermark saved as '{EXTRACTED_WATERMARK}'.")

if __name__ == "__main__":
    print("=== Embedding Watermark ===")
    embed_watermark()
    
    print("\n=== Extracting Watermark ===")
    extract_watermark()