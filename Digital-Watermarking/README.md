# Digital Image Watermarking Tool

A Python CLI tool for embedding and extracting digital watermarks using format-specific steganography techniques.

## Total Time Spent (Including sourcing and creation of assets)

- 1:47:50.05

## Format-Specific Implementations

### PNG Watermarking (LSB Steganography)

**Technique**: Least Significant Bit (LSB) matching with error correction  
**Best for**: Lossless formats like PNG where pixel-perfect recovery is possible

**Features**:

- Embeds data in the least significant bits of RGB channels
- Uses (7,4) Hamming codes for error correction
- Configurable redundancy (multiple copies of each bit)
- Automatic watermark scaling and thresholding
- Median blur filtering during extraction

**Configuration** (`png_steganography.py`):

```python
CONFIG = {
    'COVER_PATH': "cover.png",
    'SECRET_PATH': "watermark.png",
    'REDUNDANCY_FACTOR': 3,       # Error correction copies
    'SCALE_FACTOR': 0.33,         # Watermark size relative to cover
    'THRESHOLD': 128              # Binarization level
}
```
