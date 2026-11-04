import React, { useCallback, useEffect, useState } from 'react';
import { Modal } from 'react-bootstrap';
import ProfileContent from './ProfileContent';
import PlanWithFriend from './PlanWithFriend';

/**
 * Someone's profile as a pop-up over the current page, so closing it returns you exactly where you were
 * (e.g. your search results). Opening a mutual friend switches the pop-up to them; Back returns.
 */
const ProfileModal = ({ personId, onHide, onPlanned }) => {
    const [stack, setStack] = useState(personId ? [personId] : []);
    const [names, setNames] = useState({}); // id -> name, for the Back button
    const [planningWith, setPlanningWith] = useState(null);

    useEffect(() => { setStack(personId ? [personId] : []); }, [personId]);

    const current = stack[stack.length - 1];
    const previous = stack.length > 1 ? stack[stack.length - 2] : null;

    const remember = useCallback((profile) => {
        setNames(prev => ({ ...prev, [profile.id]: profile.firstName || profile.username }));
    }, []);

    return (
        <>
        <Modal show={!!current && !planningWith} onHide={onHide} contentClassName="modern-modal pm-glass-modal" centered size="lg"
            aria-labelledby={current ? `profile-name-${current}` : undefined}>
            <Modal.Header closeButton closeLabel="Close profile">
                {previous ? (
                    <button type="button" className="group-link profile-back" onClick={() => setStack(s => s.slice(0, -1))}>
                        ← Back to {names[previous] || 'previous profile'}
                    </button>
                ) : <span className="visually-hidden">Profile</span>}
            </Modal.Header>
            <Modal.Body>
                {current && (
                    <ProfileContent key={current} personId={current} onLoaded={remember}
                        onOpenPerson={(id) => setStack(s => [...s, id])} onPlan={setPlanningWith} />
                )}
            </Modal.Body>
        </Modal>
        {planningWith && (
            <PlanWithFriend person={planningWith} show
                onClose={() => setPlanningWith(null)} // back to the profile
                onPlanned={(event) => {
                    setPlanningWith(null);
                    onHide();
                    if (onPlanned) onPlanned(event, planningWith);
                }} />
        )}
        </>
    );
};

export default ProfileModal;
