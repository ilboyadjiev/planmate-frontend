/**
 * Prepares a chosen photo for upload in the browser: the part the user framed (a square) is cut out and saved as
 * a small JPEG, so a 5 MB phone photo becomes a ~20 KB upload. The server makes the final, smaller picture
 * (128px); this sends twice that so its own downscaling stays sharp.
 */
export const UPLOAD_SIZE = 256;
const QUALITY = 0.9;

/**
 * Loads a chosen file as an image. Resolves to { image, url } (url: an object URL to show it; revoke it when
 * done). Rejects when the file is not a picture the browser can read.
 */
export const loadPhoto = (file) => new Promise((resolve, reject) => {
    if (!file || !String(file.type).startsWith('image/')) {
        reject(new Error('not-an-image'));
        return;
    }
    const url = URL.createObjectURL(file);
    const image = new Image();
    // Browsers apply the photo's EXIF rotation when showing and drawing it, so portrait photos stay upright
    image.onload = () => (image.naturalWidth && image.naturalHeight
        ? resolve({ image, url })
        : (URL.revokeObjectURL(url), reject(new Error('unreadable'))));
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('unreadable')); };
    image.src = url;
});

/** The largest centred square: what is used when nothing was framed. */
export const centreSquare = (width, height) => {
    const side = Math.min(width, height);
    return { x: (width - side) / 2, y: (height - side) / 2, width: side, height: side };
};

/**
 * Cuts area ({ x, y, width, height } in the image's own pixels, e.g. react-easy-crop's croppedAreaPixels) out of
 * a loaded image and resolves to a JPEG Blob of at most UPLOAD_SIZE x UPLOAD_SIZE.
 */
export const cropToJpeg = (image, area = centreSquare(image.naturalWidth, image.naturalHeight)) => {
    const side = Math.max(1, Math.round(Math.min(area.width, area.height)));
    const size = Math.min(UPLOAD_SIZE, side);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    context.fillStyle = '#fff'; // JPEG has no transparency; also fills any area zoomed out past the photo's edge
    context.fillRect(0, 0, size, size);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, area.x, area.y, side, side, 0, 0, size, size);

    return new Promise((resolve, reject) => {
        canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('unreadable'))), 'image/jpeg', QUALITY);
    });
};
