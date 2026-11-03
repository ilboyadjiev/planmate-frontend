import React, { useState } from 'react';

/**
 * A small friend action next to someone's name (group members, event invitees, suggestions):
 * "Add friend", "Requested", "Accept", or nothing for friends and yourself.
 * friendships comes from useFriendships(), shared by everything on the page.
 */
const AddFriendButton = ({ person, friendships, onDone }) => {
    const [busy, setBusy] = useState(false);
    const [failed, setFailed] = useState(false);
    if (!person || !friendships?.loaded) return null;

    const relation = friendships.relationOf(person.id);
    const name = [person.firstName, person.lastName].filter(Boolean).join(' ') || person.username || 'this person';

    const run = async (action) => {
        setBusy(true);
        setFailed(false);
        try {
            await action();
            if (onDone) onDone();
        } catch (err) {
            setFailed(true);
        } finally {
            setBusy(false);
        }
    };

    if (relation.state === 'none') {
        return (
            <button type="button" className="add-friend-button" disabled={busy} aria-label={`Add ${name} as a friend`}
                title={failed ? 'That did not work. Please try again.' : undefined}
                onClick={() => run(() => friendships.sendRequest(person.id))}>
                {failed ? 'Try again' : '+ Add friend'}
            </button>
        );
    }
    if (relation.state === 'sent') {
        return <span className="add-friend-status">Requested</span>;
    }
    if (relation.state === 'received') {
        return (
            <button type="button" className="add-friend-button is-accept" disabled={busy} aria-label={`Accept ${name}'s friend request`}
                onClick={() => run(() => friendships.accept(relation.friendshipId))}>
                Accept
            </button>
        );
    }
    return null; // already friends, or yourself
};

export default AddFriendButton;
