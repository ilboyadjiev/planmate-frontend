import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import ProfileContent from '../components/profile/ProfileContent';
import PlanWithFriend from '../components/profile/PlanWithFriend';
import GlassPanel from '../components/GlassPanel';
import './FriendGroups.css';

/** A profile as its own page (/people/:id), e.g. "View my profile". Elsewhere profiles open as a pop-up. */
const PersonProfile = () => {
    const { id } = useParams();
    const [planningWith, setPlanningWith] = useState(null);
    const [notice, setNotice] = useState('');
    return (
        <div className="groups-page profile-page">
            <GlassPanel tall className="social-panel">
                {notice && <p className="group-plan-notice" role="status">{notice}</p>}
                <ProfileContent personId={id} onPlan={(person) => { setNotice(''); setPlanningWith(person); }} />
            </GlassPanel>
            {planningWith && (
                <PlanWithFriend person={planningWith} show onClose={() => setPlanningWith(null)}
                    onPlanned={(event) => {
                        setNotice(`"${event.title}" is planned and ${planningWith.firstName || planningWith.username} is invited. It's in your calendar.`);
                        setPlanningWith(null);
                    }} />
            )}
        </div>
    );
};

export default PersonProfile;
