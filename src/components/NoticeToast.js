import React from 'react';
import { Toast, ToastContainer } from 'react-bootstrap';

/** The message after joining or leaving a public event from a card. */
export const attendanceNotice = (event, response) => ({
    type: 'success',
    text: response === 'maybe' ? `You answered maybe to "${event.title}". It's in your calendar now.`
        : event.going ? `You're going to "${event.title}". It's in your calendar now.` : `You left "${event.title}".`,
});

/** The message after answering an invitation from a card. */
export const responseNotice = (event, response) => ({
    type: 'success',
    text: {
        accepted: `You're going to "${event.title}".`,
        maybe: `You answered maybe to "${event.title}".`,
        declined: `You can't make "${event.title}". The organizer will see your answer.`,
    }[response],
});

/** A short confirmation or error in the corner. notice: { type: 'success' | 'error', text } or null. */
const NoticeToast = ({ notice, onClose }) => (
    <ToastContainer position="bottom-end" className="p-3 dashboard-toasts" style={{ position: 'fixed', zIndex: 2000 }}>
        <Toast show={!!notice} onClose={onClose} delay={4000} autohide bg={notice?.type === 'error' ? 'danger' : 'success'}>
            <Toast.Body style={{ color: 'white' }} role={notice?.type === 'error' ? 'alert' : 'status'}>
                {notice?.text}
            </Toast.Body>
        </Toast>
    </ToastContainer>
);

export default NoticeToast;
