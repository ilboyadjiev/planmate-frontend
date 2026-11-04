import React, { useCallback, useRef, useState } from 'react';
import { Modal } from 'react-bootstrap';
import Cropper from 'react-easy-crop';

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;
const ZOOM_STEP = 0.25;

/**
 * Framing a new profile photo: the photo under a round frame (the shape it will have everywhere), dragged to move
 * and pinched, scrolled or slid to zoom. "Use photo" hands back the framed square in the photo's own pixels.
 *
 * Render it with key={src}, so every new photo starts centred and zoomed out.
 * src: the photo (an object URL). onConfirm(area): area = { x, y, width, height }. busy: the photo is uploading.
 */
const PhotoCropModal = ({ src, show, busy = false, onConfirm, onCancel }) => {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(MIN_ZOOM);
    // A ref, not state: the dialog can render from an earlier closure while it fades in, and the frame is
    // reported without any re-render being needed
    const area = useRef(null);

    const onCropComplete = useCallback((_, pixels) => { area.current = pixels; }, []);
    const nudgeZoom = (delta) => setZoom(z => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z + delta)));

    return (
        <Modal show={show} onHide={busy ? undefined : onCancel} centered contentClassName="modern-modal pm-glass-modal"
            aria-labelledby="photo-crop-title" backdrop={busy ? 'static' : true} keyboard={!busy}>
            <Modal.Header closeButton={!busy} closeLabel="Cancel">
                <Modal.Title id="photo-crop-title" as="h2" className="photo-crop-title">Frame your photo</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <div className="photo-crop-stage">
                    {src && (
                        <Cropper image={src} crop={crop} zoom={zoom} minZoom={MIN_ZOOM} maxZoom={MAX_ZOOM}
                            aspect={1} cropShape="round" showGrid={false} objectFit="cover" zoomSpeed={0.5}
                            onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropComplete}
                            classes={{ containerClassName: 'photo-crop-area', cropAreaClassName: 'photo-crop-frame' }} />
                    )}
                </div>
                <p className="photo-crop-hint">Drag to move. Pinch, scroll or use the slider to zoom.</p>
                <div className="photo-crop-zoom">
                    <button type="button" className="photo-crop-step" onClick={() => nudgeZoom(-ZOOM_STEP)}
                        disabled={busy || zoom <= MIN_ZOOM} aria-label="Zoom out">−</button>
                    <input type="range" min={MIN_ZOOM} max={MAX_ZOOM} step={0.01} value={zoom} disabled={busy}
                        onChange={(e) => setZoom(Number(e.target.value))} aria-label="Zoom" />
                    <button type="button" className="photo-crop-step" onClick={() => nudgeZoom(ZOOM_STEP)}
                        disabled={busy || zoom >= MAX_ZOOM} aria-label="Zoom in">+</button>
                </div>
            </Modal.Body>
            <Modal.Footer className="photo-crop-footer">
                <button type="button" className="group-button" onClick={onCancel} disabled={busy}>Cancel</button>
                <button type="button" className="group-button group-button-primary" onClick={() => onConfirm(area.current)}
                    disabled={busy}>
                    {busy ? 'Saving…' : 'Use photo'}
                </button>
            </Modal.Footer>
        </Modal>
    );
};

export default PhotoCropModal;
