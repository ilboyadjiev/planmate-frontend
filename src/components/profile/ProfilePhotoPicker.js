import React, { useContext, useEffect, useRef, useState } from 'react';
import api from '../../api/client';
import { AuthContext } from '../../context/AuthContext';
import { cropToJpeg, loadPhoto } from '../../services/shrinkPhoto';
import Avatar from '../Avatar';
import PhotoCropModal from './PhotoCropModal';

const CameraIcon = () => (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" /><circle cx="12" cy="13.5" r="3.5" />
    </svg>
);

/** Server messages are short and meant for people (AvatarService); anything else gets a general one. */
const uploadError = (err) => {
    if (err?.message === 'not-an-image' || err?.message === 'unreadable') {
        return 'This photo could not be read. Please choose a JPEG or PNG picture.';
    }
    return err?.response?.data?.error || 'Your photo could not be saved. Please try again.';
};

/**
 * Your profile photo on the Edit profile page: change or remove it. Photos are saved straight away (not with the
 * page's Save button): a chosen photo is first framed in a round crop (PhotoCropModal), then cut out and shrunk in
 * the browser (services/shrinkPhoto) and uploaded.
 */
const ProfilePhotoPicker = () => {
    const { user, updateCurrentUser } = useContext(AuthContext);
    const input = useRef(null);
    const [busy, setBusy] = useState(null); // 'upload' | 'remove'
    const [status, setStatus] = useState(null); // { type: 'success' | 'error', msg }
    const [photo, setPhoto] = useState(null); // the photo being framed: { image, url }

    // The object URL is only needed while framing
    useEffect(() => () => { if (photo) URL.revokeObjectURL(photo.url); }, [photo]);

    const setAvatarKey = (avatarKey) => updateCurrentUser({ ...user, avatarKey });

    const choose = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = ''; // so choosing the same file again still fires onChange
        if (!file) return;
        setStatus(null);
        try {
            setPhoto(await loadPhoto(file));
        } catch (err) {
            setStatus({ type: 'error', msg: uploadError(err) });
        }
    };

    /** area: the framed square in the photo's pixels (null: the centre square). */
    const upload = async (area) => {
        setBusy('upload');
        try {
            const jpeg = await cropToJpeg(photo.image, area || undefined);
            const form = new FormData();
            form.append('file', jpeg, 'photo.jpg');
            const { data } = await api.put('/v1/avatars/me', form);
            setAvatarKey(data.avatarKey);
            setStatus({ type: 'success', msg: 'Photo updated.' });
        } catch (err) {
            setStatus({ type: 'error', msg: uploadError(err) });
        } finally {
            setBusy(null);
            setPhoto(null);
        }
    };

    const remove = async () => {
        setBusy('remove');
        setStatus(null);
        try {
            await api.delete('/v1/avatars/me');
            setAvatarKey(null);
            setStatus({ type: 'success', msg: 'Photo removed.' });
        } catch (err) {
            setStatus({ type: 'error', msg: 'Your photo could not be removed. Please try again.' });
        } finally {
            setBusy(null);
        }
    };

    return (
        <section className="photo-picker" aria-labelledby="photo-picker-title">
            <Avatar person={user} className="profile-avatar" />
            <div className="photo-picker-body">
                <h4 id="photo-picker-title" className="photo-picker-title">Profile photo</h4>
                <div className="photo-picker-actions">
                    <button type="button" className="group-button" onClick={() => input.current?.click()} disabled={!!busy}>
                        <CameraIcon />
                        {busy === 'upload' ? 'Uploading…' : user?.avatarKey ? 'Change photo' : 'Add photo'}
                    </button>
                    {user?.avatarKey && (
                        <button type="button" className="group-button" onClick={remove} disabled={!!busy}>
                            {busy === 'remove' ? 'Removing…' : 'Remove'}
                        </button>
                    )}
                </div>
                <PhotoCropModal key={photo?.url || 'none'} show={!!photo} src={photo?.url} busy={busy === 'upload'}
                    onConfirm={upload} onCancel={() => setPhoto(null)} />
                <input ref={input} type="file" accept="image/*" onChange={choose} hidden
                    aria-label="Choose a profile photo" data-testid="photo-input" />
                {status ? (
                    <p className={`availability-message ${status.type === 'error' ? 'msg-error' : 'msg-success'}`}
                        role={status.type === 'error' ? 'alert' : 'status'}>
                        {status.msg}
                    </p>
                ) : (
                    <p className="photo-picker-hint">Saved right away.</p>
                )}
            </div>
        </section>
    );
};

export default ProfilePhotoPicker;
