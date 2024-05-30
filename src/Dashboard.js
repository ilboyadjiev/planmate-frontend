import React from 'react';
import Calendar from './Calendar';

const Dashboard = () => {
    const userEmail = 'ilian@planmate.com'; // Replace with the actual user email, possibly passed down as a prop or fetched from context/state

    return (
        <div>
            <h2>Dashboard</h2>
            <Calendar userEmail={userEmail} />
        </div>
    );
};

export default Dashboard;
