import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import config from './config';
import { AuthContext } from './AuthContext';

const FriendsList = () => {
    const { user } = useContext(AuthContext);
    const [friends, setFriends] = useState([]);
    const [pendingRequests, setPendingRequests] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState('');
    const [loading, setLoading] = useState(true);

    const fetchFriends = async () => {
        if (!user || !user.id) return;
        try {
            const response = await axios.get(`${config.baseUrl}/api/v1/users/${user.id}/friends`);
            setFriends(response.data.filter(friendship => friendship.status === 'accepted'));
            setPendingRequests(response.data.filter(friendship => friendship.status === 'pending'));
            setLoading(false);
        } catch (err) {
            setError('Failed to load friends list.');
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFriends();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    const handleSearch = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccessMsg('');
        
        if (!searchTerm.trim()) {
            setSearchResults([]);
            return;
        }

        try {
            const response = await axios.get(`${config.baseUrl}/api/v1/users/search?term=${searchTerm}`);
            const filteredResults = response.data.filter(u => u.id !== user.id);
            setSearchResults(filteredResults);
            
            if (filteredResults.length === 0) {
                setError("No users found matching that search.");
            }
        } catch (err) {
            setError('Error searching for users.');
        }
    };

    const sendFriendRequest = async (userId) => {
        try {
            setError(null);
            await axios.post(`${config.baseUrl}/api/v1/friends/request/${userId}`, {});
            setSuccessMsg('Friend request sent successfully!');
            setSearchResults([]); 
            setSearchTerm('');
            fetchFriends();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to send friend request.');
        }
    };

    const acceptFriendRequest = async (friendshipId) => {
        try {
            setError(null);
            await axios.put(`${config.baseUrl}/api/v1/friends/accept/${friendshipId}`, {});
            setSuccessMsg('Friend request accepted!');
            fetchFriends();
        } catch (err) {
            setError('Error accepting friend request.');
        }
    };

    const getFriendData = (friendship) => {
        return friendship.userA.id === user.id ? friendship.userB : friendship.userA;
    };

    if (loading) return <div style={{ textAlign: 'center', marginTop: '50px', color: 'var(--text-muted)' }}>Loading network...</div>;

    return (
        <div style={{ padding: '40px 20px', display: 'flex', justifyContent: 'center' }}>
            <div className="form-container" style={{ maxWidth: '800px', width: '100%', margin: 0 }}>
                
                <h2 style={{ marginBottom: '8px', fontWeight: '700' }}>Network</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '32px', fontSize: '0.95rem' }}>
                    Find friends and manage your connections.
                </p>

                <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
                    <input
                        type="text"
                        placeholder="Search by username or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ flexGrow: 1 }}
                    />
                    <button type="submit" className="btn-modern-secondary" style={{ padding: '10px 24px' }}>
                        Search
                    </button>
                </form>

                {error && <div className="availability-message msg-error" style={{ marginBottom: '24px' }}>{error}</div>}
                {successMsg && <div className="availability-message msg-success" style={{ marginBottom: '24px' }}>{successMsg}</div>}

                {searchResults.length > 0 && (
                    <div style={{ marginBottom: '40px' }}>
                        <h4 style={{ fontSize: '1.1rem', marginBottom: '16px', color: 'var(--primary)' }}>Search Results</h4>
                        <div style={{ border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                            {searchResults.map((result) => {
                                const isFriend = friends.some(f => getFriendData(f).id === result.id);
                                const isPending = pendingRequests.some(f => getFriendData(f).id === result.id);

                                let actionContent;
                                if (isFriend) {
                                    actionContent = <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '500', paddingRight: '8px' }}>Friend</span>;
                                } else if (isPending) {
                                    actionContent = <span style={{ fontSize: '0.85rem', color: '#F59E0B', fontWeight: '500', paddingRight: '8px' }}>Pending</span>;
                                } else {
                                    actionContent = (
                                        <button onClick={() => sendFriendRequest(result.id)} className="btn-modern-primary" style={{ padding: '6px 16px', fontSize: '0.85rem' }}>
                                            Add Friend
                                        </button>
                                    );
                                }

                                return (
                                    <UserListItem 
                                        key={result.id} 
                                        userData={result} 
                                        actionButton={actionContent} 
                                    />
                                );
                            })}
                        </div>
                    </div>
                )}

                {pendingRequests.length > 0 && (
                    <div style={{ marginBottom: '40px' }}>
                        <h4 style={{ fontSize: '1.1rem', marginBottom: '16px', color: '#F59E0B' }}>Pending Requests</h4>
                        <div style={{ border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                            {pendingRequests.map((friendship) => {
                                const friend = getFriendData(friendship);
                                const isIncoming = friendship.userA.id !== user.id; 

                                return (
                                    <UserListItem 
                                        key={friendship.id} 
                                        userData={friend} 
                                        subText={isIncoming ? "Wants to be your friend" : "Request sent"}
                                        actionButton={isIncoming ? (
                                            <button onClick={() => acceptFriendRequest(friendship.id)} className="btn-modern-primary" style={{ padding: '6px 16px', fontSize: '0.85rem' }}>
                                                Accept
                                            </button>
                                        ) : (
                                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '500', paddingRight: '8px' }}>Pending...</span>
                                        )} 
                                    />
                                );
                            })}
                        </div>
                    </div>
                )}

                <div>
                    <h4 style={{ fontSize: '1.1rem', marginBottom: '16px', color: 'var(--text-main)' }}>My Friends ({friends.length})</h4>
                    {friends.length > 0 ? (
                        <div style={{ border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                            {friends.map((friendship) => {
                                const friend = getFriendData(friendship);
                                return <UserListItem key={friendship.id} userData={friend} />;
                            })}
                        </div>
                    ) : (
                        <div style={{ padding: '32px', textAlign: 'center', backgroundColor: 'var(--bg-color)', borderRadius: '12px', color: 'var(--text-muted)' }}>
                            You don't have any friends added yet. Use the search bar above to find people!
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

const UserListItem = ({ userData, subText, actionButton }) => {
    const initial = (userData.firstName || userData.username || '?').charAt(0).toUpperCase();
    
    return (
        <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            padding: '16px', 
            borderBottom: '1px solid var(--border)',
            backgroundColor: 'var(--surface)'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ 
                    width: '40px', height: '40px', borderRadius: '50%', 
                    backgroundColor: 'var(--primary)', color: 'white', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', 
                    fontWeight: 'bold', fontSize: '1.1rem' 
                }}>
                    {initial}
                </div>
                <div>
                    <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>
                        {userData.firstName} {userData.lastName} <span style={{ fontWeight: '400', color: 'var(--text-muted)' }}>@{userData.username}</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {subText || userData.email}
                    </div>
                </div>
            </div>
            {actionButton && <div>{actionButton}</div>}
        </div>
    );
};

export default FriendsList;