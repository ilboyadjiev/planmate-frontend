import React, { useEffect, useId, useRef, useState } from 'react';
import api from '../../api/client';
import { googleCalendarUrl, icsPath, icsUrl, outlookCalendarUrl } from '../../services/calendarLinks';
import './AddToCalendar.css';

const CalendarPlusIcon = () => (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3.5" y="5" width="17" height="15" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4M12 13v5M9.5 15.5h5" />
    </svg>
);

/** Saves a downloaded file on this device. */
const saveFile = (blob, fileName) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/**
 * "Add to calendar": a small glass menu with Google Calendar, Outlook, and an .ics file for Apple Calendar,
 * Samsung Calendar and every other app. Public events link to the file directly, which phones open straight in
 * their calendar app; private ones are fetched with the login first.
 *
 * event: { id, title, description, start, end, location, isPublic }.
 */
const AddToCalendar = ({ event, className = '' }) => {
    const [open, setOpen] = useState(false);
    const [error, setError] = useState(null);
    const root = useRef(null);
    const menuId = useId();

    useEffect(() => {
        if (!open) return undefined;
        const close = (e) => {
            if (e.type === 'keydown' ? e.key === 'Escape' : root.current && !root.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', close);
        document.addEventListener('keydown', close);
        return () => {
            document.removeEventListener('mousedown', close);
            document.removeEventListener('keydown', close);
        };
    }, [open]);

    const downloadPrivate = async () => {
        setError(null);
        try {
            const { data } = await api.get(icsPath(event.id), { responseType: 'blob' });
            saveFile(data instanceof Blob ? data : new Blob([data], { type: 'text/calendar' }), 'planmate-event.ics');
            setOpen(false);
        } catch (err) {
            setError('The calendar file could not be downloaded. Please try again.');
        }
    };

    return (
        <span className={`add-to-calendar ${className}`.trim()} ref={root}>
            <button type="button" className="pm-glass-button add-to-calendar-button" aria-expanded={open}
                aria-controls={menuId} onClick={() => setOpen(o => !o)}>
                <CalendarPlusIcon /> Add to calendar
            </button>
            {open && (
                <div id={menuId} className="add-to-calendar-menu" role="group" aria-label="Add to calendar">
                    <a href={googleCalendarUrl(event)} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>
                        Google Calendar<span className="visually-hidden"> (opens a new tab)</span>
                    </a>
                    <a href={outlookCalendarUrl(event)} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>
                        Outlook<span className="visually-hidden"> (opens a new tab)</span>
                    </a>
                    {event.isPublic !== false ? (
                        <a href={icsUrl(event.id)} onClick={() => setOpen(false)}>
                            Apple, Samsung &amp; other apps <span className="add-to-calendar-hint">.ics file</span>
                        </a>
                    ) : (
                        <button type="button" onClick={downloadPrivate}>
                            Apple, Samsung &amp; other apps <span className="add-to-calendar-hint">.ics file</span>
                        </button>
                    )}
                </div>
            )}
            {error && <span className="availability-message msg-error" role="alert">{error}</span>}
        </span>
    );
};

export default AddToCalendar;
