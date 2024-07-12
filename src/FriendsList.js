import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import config from './config';
import { AuthContext } from './AuthContext';

const FriendsList = () => {
    const [friends, setFriends] = useState([]);
    const [pendingRequests, setPendingRequests] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [error, setError] = useState(null);
    const { user } = useContext(AuthContext);

    useEffect(() => {
        const fetchFriends = async () => {
            try {
                const response = await axios.get(`${config.baseUrl}/api/v1/users/${user.id}/friends`);
                setFriends(response.data.filter(friendship => friendship.status === 'accepted'));
                setPendingRequests(response.data.filter(friendship => friendship.status === 'pending'));
            } catch (err) {
                setError(err);
            }
        };

        fetchFriends();
    }, [user.id]);

    const handleSearch = async () => {
        if (searchTerm) {
            try {
                const response = await axios.get(`${config.baseUrl}/api/v1/users/search?term=${searchTerm}`);
                setSearchResults(response.data);
            } catch (err) {
                setError(err);
            }
        } else {
            setSearchResults([]);
        }
    };

    const sendFriendRequest = async (userId) => {
        try {
            await axios.post(`${config.baseUrl}/api/v1/friends/request/${userId}`, {});
            // Optionally refresh pending requests after sending a request
            const response = await axios.get(`${config.baseUrl}/api/v1/users/${user.id}/friends`);
            setPendingRequests(response.data.filter(friendship => friendship.status === 'pending'));
        } catch (err) {
            setError(err);
        }
    };

    const acceptFriendRequest = async (friendshipId) => {
        try {
            await axios.put(`${config.baseUrl}/api/v1/friends/accept/${friendshipId}`, { });
            // Fetch updated friends and pending requests after accepting
            const response = await axios.get(`${config.baseUrl}/api/v1/users/${user.id}/friends`);
            setFriends(response.data.filter(friendship => friendship.status === 'accepted'));
            setPendingRequests(response.data.filter(friendship => friendship.status === 'pending'));
        } catch (err) {
            console.error('Error accepting friend request:', err);
        }
    };

    return (
        <div className="form-container">
            <br />
            <h1>Friends List</h1>
            {error && <p className="error-message">{error.message}</p>}

            <div className="search-bar-container">
                <input
                    type="text"
                    placeholder="Search for users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onBlur={handleSearch}
                    className="search-bar"
                />
                <button onClick={handleSearch}>Search</button>
            </div>

            <div className="friends-section">
                <h2>Friends</h2>
                {friends.length > 0 ? (
                friends.map((friendship, index) => (
                    <div key={index} className="friend-card">
                        <div className="form-group row">
                            <div className="column">
                                <label htmlFor={`friendName${index}`}>Friend Name:</label>
                                <input
                                    type="text"
                                    id={`friendName${index}`}
                                    value={friendship.userA.email === user.email ? friendship.userB.username || friendship.userB.email : friendship.userA.username || friendship.userA.email}
                                    disabled
                                    style={{ color: 'gray' }}
                                />
                            </div>
                        </div>
                    </div>
                ))) : (
                    <p>No friends yet.</p>
                )}
            </div>

            <br />

            <div className="pending-requests-section">
                <h2>Pending Requests</h2>
                {pendingRequests.length > 0 ? (
                    pendingRequests.map((friendship, index) => {
                        const isUserA = friendship.userA.id === user.id;
                        const requestUsername = isUserA ? friendship.userB.username || friendship.userB.email : friendship.userA.username || friendship.userA.email;
                        const requestDirection = isUserA ? "Request To:" : "Request From:";

                        return (
                            <div key={index} className="friend-card">
                                <div className="form-group row">
                                    <div className="column">
                                        <label htmlFor={`requestName${index}`}>{requestDirection}</label>
                                        <input
                                            type="text"
                                            id={`requestName${index}`}
                                            value={requestUsername}
                                            disabled
                                            style={{ color: 'gray' }}
                                        />
                                    </div>
                                    {!isUserA && (
                                        <div className="column">
                                            <button 
                                                onClick={() => acceptFriendRequest(friendship.id)}
                                                className="btn btn-primary"
                                            >
                                                Accept Request
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <p>No pending requests.</p>
                )}
            </div>

            <div className="search-results-section">
                <h2>Search Results</h2>
                {searchResults.length > 0 ? (
                    searchResults.map((result, index) => (
                        <div key={index} className="search-result">
                            <span>{result.username || result.email}</span>
                            <button onClick={() => sendFriendRequest(result.id)}>Send Friend Request</button>
                        </div>
                    ))
                ) : (
                    <p>No users found.</p>
                )}
            </div>
        </div>
    );
};

export default FriendsList;
