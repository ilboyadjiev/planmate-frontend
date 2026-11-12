import { useEffect } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProfilePhotoPicker from './ProfilePhotoPicker';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api/client';
import { cropToJpeg, loadPhoto } from '../../services/shrinkPhoto';

vi.mock('../../api/client', () => ({ __esModule: true, default: { put: vi.fn(), delete: vi.fn() } }));
vi.mock('../../services/shrinkPhoto', () => ({ loadPhoto: vi.fn(), cropToJpeg: vi.fn() }));
// jsdom has no layout, so the real cropper cannot measure anything: this one reports a fixed framed square
const mockFramed = { x: 120, y: 40, width: 600, height: 600 };
vi.mock('react-easy-crop', () => ({
    __esModule: true,
    default: function FakeCropper({ image, onCropComplete }) {
        useEffect(() => { onCropComplete({}, mockFramed); }, [onCropComplete]);
        return <img src={image} alt="Being framed" />;
    },
}));

const alice = { id: 1, firstName: 'Alice', lastName: 'Meier', username: 'alice' };
const loaded = { image: { naturalWidth: 1200, naturalHeight: 800 }, url: 'blob:photo' };

const renderPicker = (user, updateCurrentUser = vi.fn()) => render(
    <AuthContext.Provider value={{ user, updateCurrentUser }}>
        <ProfilePhotoPicker />
    </AuthContext.Provider>
);

const pick = (file = new File(['big'], 'me.jpg', { type: 'image/jpeg' })) =>
    fireEvent.change(screen.getByTestId('photo-input'), { target: { files: [file] } });

beforeEach(() => {
    vi.resetAllMocks();
    URL.revokeObjectURL = vi.fn();
});

test('a chosen photo is framed first, then the framed square is uploaded and becomes the user\'s picture', async () => {
    const updateCurrentUser = vi.fn();
    loadPhoto.mockResolvedValue(loaded);
    cropToJpeg.mockResolvedValue(new Blob(['jpeg'], { type: 'image/jpeg' }));
    api.put.mockResolvedValue({ data: { avatarKey: 'newkey' } });
    renderPicker(alice, updateCurrentUser);

    expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument();
    pick();

    expect(await screen.findByRole('dialog', { name: 'Frame your photo' })).toBeInTheDocument();
    expect(screen.getByAltText('Being framed')).toHaveAttribute('src', 'blob:photo');
    expect(api.put).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Use photo' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Photo updated.');
    expect(cropToJpeg).toHaveBeenCalledWith(loaded.image, mockFramed);
    const [url, form] = api.put.mock.calls[0];
    expect(url).toBe('/v1/avatars/me');
    expect(form.get('file')).toBeInstanceOf(Blob);
    expect(updateCurrentUser).toHaveBeenCalledWith({ ...alice, avatarKey: 'newkey' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:photo');
});

test('Cancel closes the framing without uploading anything', async () => {
    loadPhoto.mockResolvedValue(loaded);
    renderPicker(alice);
    pick();
    await screen.findByRole('dialog');

    fireEvent.click(screen.getAllByRole('button', { name: 'Cancel' })[0]);

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(cropToJpeg).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
});

test('the zoom buttons and slider change the zoom, within its limits', async () => {
    loadPhoto.mockResolvedValue(loaded);
    renderPicker(alice);
    pick();
    await screen.findByRole('dialog');

    const slider = screen.getByRole('slider', { name: 'Zoom' });
    expect(slider).toHaveValue('1');
    expect(screen.getByRole('button', { name: 'Zoom out' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(slider).toHaveValue('1.25');
    fireEvent.change(slider, { target: { value: '4' } });
    expect(screen.getByRole('button', { name: 'Zoom in' })).toBeDisabled();
});

test('a file that is not a readable picture explains what to choose instead, and opens nothing', async () => {
    loadPhoto.mockRejectedValue(new Error('not-an-image'));
    renderPicker(alice);
    pick(new File(['%PDF'], 'cv.pdf', { type: 'application/pdf' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('choose a JPEG or PNG');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('the server\'s reason is shown when it refuses a photo', async () => {
    loadPhoto.mockResolvedValue(loaded);
    cropToJpeg.mockResolvedValue(new Blob(['x']));
    api.put.mockRejectedValue({ response: { data: { error: 'The picture is too large.' } } });
    renderPicker(alice);
    pick();
    fireEvent.click(await screen.findByRole('button', { name: 'Use photo' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('The picture is too large.');
});

test('with a photo it offers Change and Remove; Remove deletes it', async () => {
    const updateCurrentUser = vi.fn();
    api.delete.mockResolvedValue({});
    renderPicker({ ...alice, avatarKey: 'oldkey' }, updateCurrentUser);

    expect(screen.getByRole('button', { name: /change photo/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Photo removed.');
    expect(api.delete).toHaveBeenCalledWith('/v1/avatars/me');
    expect(updateCurrentUser).toHaveBeenCalledWith({ ...alice, avatarKey: null });
});
