import React from 'react';
import { useParams } from 'react-router-dom';
import ProfileContent from '../components/profile/ProfileContent';
import './FriendGroups.css';

/** A profile as its own page (/people/:id), e.g. "View my profile". Elsewhere profiles open as a pop-up. */
const PersonProfile = () => {
    const { id } = useParams();
    return (
        <div className="groups-page profile-page">
            <ProfileContent personId={id} />
        </div>
    );
};

export default PersonProfile;
