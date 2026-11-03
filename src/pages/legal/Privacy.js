import React from 'react';
import { Link } from 'react-router-dom';
import './Legal.css';

const CONTACT_EMAIL = 'ilianboyadjiev1@gmail.com';

/*
 * Keep this page in step with the code. When a feature starts sending data somewhere new, storing something new
 * or showing something to other users, update the matching section and "Last updated".
 */
const Privacy = () => (
    <article className="legal-page">
        <h1>Privacy Policy</h1>
        <p className="legal-updated">Last updated: November 2026</p>

        <p>
            PlanMate is a social calendar run as a private, non-commercial project. This policy explains what data
            PlanMate processes, why, who else receives it and which rights you have under the EU General Data
            Protection Regulation (GDPR). In short: we only use your data to run PlanMate. We do not sell it, show
            ads or use analytics or tracking.
        </p>

        <h2>1. Who is responsible</h2>
        <p>
            The controller responsible for your data is Ilian Boyadjiev, Munich, Germany. Full contact details are in
            the <Link to="/impressum">Impressum</Link>. For any privacy question or request, write
            to <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>

        <h2>2. What we process and why</h2>

        <h3>Your account</h3>
        <ul>
            <li><strong>Required:</strong> email address, username and password. Your password is stored only as a
                one-way hash and cannot be read by anyone, including us.</li>
            <li><strong>Optional:</strong> first and last name, street, zipcode, country and mobile number.</li>
            <li><strong>Signing in with Google:</strong> we receive your verified email address and name from Google
                to create or match your account.</li>
        </ul>
        <p>
            We use this to create your account, sign you in and show your name to friends.
            Legal basis: performance of our contract with you (Art. 6(1)(b) GDPR).
        </p>

        <h3>Your calendar and social features</h3>
        <ul>
            <li>Events you create: title, description, time, location, tags and whether the event is public.</li>
            <li>Friends: friend requests and friendships.</li>
            <li>Friend groups: the group names and who is in each group.</li>
            <li>Invitations: who you invite and how invitees answer (going, maybe, can't go).</li>
            <li>Public events you join from the Discover feed.</li>
        </ul>
        <p>Legal basis: performance of our contract with you (Art. 6(1)(b) GDPR).</p>

        <h3>Using PlanMate without an account</h3>
        <p>
            Guests can try the calendar without registering. Guest events are stored on our server under a random
            guest ID that is kept in your browser. Anyone with access to that browser can see them. If you later
            create an account in the same browser, your guest events are moved into it. Guest events that are never
            moved stay linked only to that random ID.
        </p>

        <h3>Server logs</h3>
        <p>
            Like any website, our servers record technical data when you use PlanMate: your IP address, the time,
            the page or function requested and error messages. Some log entries also contain your email address,
            for example when a game plan is generated. We use logs only to run, secure and debug the service and keep
            them no longer than needed for that. Legal basis: our legitimate interest in a secure, working service
            (Art. 6(1)(f) GDPR).
        </p>

        <h2>3. What other people can see</h2>
        <ul>
            <li><strong>Anyone who is logged in</strong> can find you by username or name and sees your username,
                first and last name. They never see your email address or contact details.</li>
            <li><strong>Your accepted friends</strong> also see your email address (PlanMate uses it to show who
                organizes an event). Your street, zipcode, country and mobile number are never shown to other users.</li>
            <li><strong>Friend groups</strong> have no owner. Everyone in a group sees its name and the name and
                username of every other member, even members who are not their friends, and can rename the group or
                add and remove people. Members can only add their own friends.</li>
            <li><strong>People you invite</strong> see the event, the other invitees and everyone's answers.</li>
            <li><strong>Public events</strong> are visible to every visitor of the Discover feed, including people
                who are not logged in: title, description, time, location, tags, your name and username as host,
                and how many people are going. Logged-in visitors also see which of <em>their own</em> friends are
                going. Your email address is never shown.</li>
            <li><strong>If you join a public event</strong>, you are counted in its number of people going, and your
                friends can see that you are going. The host does not see your name.</li>
        </ul>

        <h2>4. Services we use</h2>

        <h3>Hosting: Google Cloud</h3>
        <p>
            PlanMate runs on servers rented from Google Cloud (Google Ireland Limited, Gordon House, Barrow Street,
            Dublin 4, Ireland). All data described in this policy is stored there. Google acts as our processor under
            a data processing agreement.
        </p>

        <h3>AI Game plan: Google Gemini</h3>
        <p>
            Only when you press the button for an AI Game plan, PlanMate sends your events for the next 48 hours to
            Google's Gemini API (Google LLC, USA) to write the plan. This includes your own events, invitations you
            have not declined and public events you joined: title, time, location, description, the organizer's
            name and how you answered. It never includes email addresses. Nothing is sent unless you ask for a game
            plan. The generated plan is kept in your browser for the rest of the day and in our server's memory for
            up to 24 hours, so we can enforce the daily limit. Legal basis: performance of our contract, as you request the
            feature (Art. 6(1)(b) GDPR).
        </p>

        <h3>Location suggestions: LocationIQ</h3>
        <p>
            When you are logged in and type at least three characters into an event's location field, the text you
            typed is sent through our server to LocationIQ (Unwired Labs) to suggest matching addresses. Your
            identity is not sent with it. Guests do not get suggestions and their input is never sent.
            Legal basis: performance of our contract (Art. 6(1)(b) GDPR).
        </p>

        <h3>Google Sign-In and Google Fonts</h3>
        <p>
            To offer "Sign in with Google", your browser loads Google's sign-in script from Google's servers on every
            page. Our font (Inter) is also loaded from Google Fonts. In both cases your browser connects to Google,
            which receives your IP address and technical browser data and may set its own cookies for the sign-in
            service. If you use Google Sign-In, Google's own privacy policy applies to that process.
            Legal basis: our legitimate interest in an easy sign-in and a consistent design (Art. 6(1)(f) GDPR).
        </p>

        <h3>Transfers outside the EU</h3>
        <p>
            Google LLC is based in the USA and is certified under the EU-US Data Privacy Framework, which the European
            Commission recognises as providing an adequate level of protection. LocationIQ is operated by Unwired
            Labs and may process location searches outside the EU.
        </p>

        <h2>5. Data stored in your browser</h2>
        <p>
            PlanMate uses your browser's local storage (not tracking cookies) for things that are strictly necessary
            for the service: your sign-in tokens, your guest ID, your cookie-notice choice and today's AI Game plan.
            Logging out removes your sign-in tokens. You can delete everything at any time by clearing your browser's
            site data for PlanMate.
        </p>

        <h2>6. How long we keep data</h2>
        <ul>
            <li>Account and calendar data: until you delete it or your account.</li>
            <li>Deleting your account removes your profile, friendships and events, and takes you out of your
                friend groups and off other people's invitations and events.</li>
            <li>Server logs: only as long as needed to run and secure the service.</li>
        </ul>

        <h2>7. Your rights</h2>
        <p>Under the GDPR you have the right to:</p>
        <ul>
            <li>access the data we hold about you and receive a copy (Art. 15, 20),</li>
            <li>have incorrect data corrected (Art. 16). You can edit your profile and events yourself.</li>
            <li>have your data deleted (Art. 17). You can delete your account yourself
                under <Link to="/profile/edit">Edit profile</Link>.</li>
            <li>restrict processing (Art. 18),</li>
            <li>object to processing based on our legitimate interests (Art. 21),</li>
            <li>lodge a complaint with a data protection authority. For us this is the Bavarian Data Protection
                Authority (Bayerisches Landesamt für Datenschutzaufsicht, Promenade 18, 91522 Ansbach,
                Germany, <a href="https://www.lda.bayern.de" target="_blank" rel="noreferrer">www.lda.bayern.de</a>).</li>
        </ul>
        <p>To use any of these rights, email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>

        <h2>8. Security</h2>
        <p>
            Connections to PlanMate are encrypted (HTTPS), passwords are hashed and access to your data is checked on
            every request. No system is perfectly secure, but we take reasonable measures to protect your data.
        </p>

        <h2>9. Changes</h2>
        <p>
            We update this policy when PlanMate changes how it handles data. The date at the top shows the latest
            version.
        </p>
    </article>
);

export default Privacy;
