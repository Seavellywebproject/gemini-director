/**
 * compressImage.js
 * Client-side image compression using Canvas API.
 * Resizes to max 1024x1024px at 85% JPEG quality.
 * Prevents large reference photos from overloading the API.
 */

const MAX_SIZE = 1024;
const QUALITY = 0.85;

/**
 * Compress a File or base64 data URL to a smaller JPEG base64 string.
 * @param {File|string} input - File object or base64 data URL
 * @returns {Promise<string>} - compressed base64 data URL
 */
export function compressImage(input) {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      let { width, height } = img;

      // Maintain aspect ratio within MAX_SIZE
      if (width > height && width > MAX_SIZE) {
        height = Math.round((height * MAX_SIZE) / width);
        width = MAX_SIZE;
      } else if (height > MAX_SIZE) {
        width = Math.round((width * MAX_SIZE) / height);
        height = MAX_SIZE;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      const compressed = canvas.toDataURL('image/jpeg', QUALITY);
      resolve(compressed);
    };

    img.onerror = reject;

    if (typeof input === 'string') {
      img.src = input;
    } else {
      // File object
      const reader = new FileReader();
      reader.onload = (e) => { img.src = e.target.result; };
      reader.onerror = reject;
      reader.readAsDataURL(input);
    }
  });
}

/**
 * Compress multiple files at once.
 * @param {File[]} files
 * @returns {Promise<string[]>} - array of compressed base64 data URLs
 */
export function compressImages(files) {
  return Promise.all(Array.from(files).map(compressImage));
}
