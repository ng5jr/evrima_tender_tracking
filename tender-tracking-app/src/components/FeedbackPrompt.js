import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./FeedbackPrompt.css";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebaseconfig"; // use same db as rating.js

// LocalStorage keys
const LS_COMPLETED = "feedbackCompleted"; // 'true' once feedback submitted
const LS_SNOOZE_UNTIL = "feedbackSnoozeUntil"; // ISO string date in the future

function now() {
    return new Date();
}

function getSnoozeUntil() {
    const raw = localStorage.getItem(LS_SNOOZE_UNTIL);
    if (!raw) return null;
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
}

function setSnooze(days = 1) {
    const d = now();
    d.setDate(d.getDate() + days);
    localStorage.setItem(LS_SNOOZE_UNTIL, d.toISOString());
}

const shouldSuppress = (pathname) => {
    // Never show on feedback or TV pages
    if (pathname.startsWith("/feedback") || pathname.startsWith("/tv")) return true;
    // Suppress if completed
    if (localStorage.getItem(LS_COMPLETED) === "true") return true;
    // Suppress if snoozed in the future
    const snooze = getSnoozeUntil();
    if (snooze && snooze > now()) return true;
    return false;
};

const randomDelayMs = () => {
    // Between 10s and 15s
    const min = 15_000;
    const max = 45_000;
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

export default function FeedbackPrompt() {
    const location = useLocation();
    const navigate = useNavigate();
    const isEmbed = new URLSearchParams(location.search).get("embed") === "true";
    const feedbackSearch = isEmbed ? "?intent=improve&embed=true" : "?intent=improve";
    const feedbackFallbackSearch = isEmbed ? "?embed=true" : "";

    const [visible, setVisible] = useState(false);
    const [hasTriggered, setHasTriggered] = useState(false);
    const timeoutRef = useRef(null);

    // UI mode: "prompt" | "cta" | "thanks"
    const [mode, setMode] = useState("prompt");

    // Mobile-only visibility
    const [isMobile, setIsMobile] = useState(() => {
        if (typeof window === "undefined" || typeof window.matchMedia !== "function") return true;
        return window.matchMedia("(max-width: 600px)").matches;
    });

    useEffect(() => {
        if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
        const mq = window.matchMedia("(max-width: 600px)");
        const handler = (e) => setIsMobile(e.matches);
        // set initial in case of hydration differences
        setIsMobile(mq.matches);
        mq.addEventListener?.("change", handler);
        // Fallback for older browsers
        if (!mq.addEventListener && mq.addListener) mq.addListener(handler);
        return () => {
            mq.removeEventListener?.("change", handler);
            if (!mq.removeEventListener && mq.removeListener) mq.removeListener(handler);
        };
    }, []);

    const suppressed = useMemo(() => {
        // Also suppress when not on a phone-size screen
        return shouldSuppress(location.pathname) || !isMobile;
    }, [location.pathname, isMobile]);

    useEffect(() => {
        // If route changes, hide prompt if we're on pages where it's suppressed
        if (suppressed) {
            setVisible(false);
        }
    }, [suppressed]);

    useEffect(() => {
        if (suppressed || hasTriggered) return;

        // Random appearance timer
        timeoutRef.current = setTimeout(() => {
            setVisible(true);
            setHasTriggered(true);
        }, randomDelayMs());

        // Exit-intent listener (desktop)
        const onMouseOut = (e) => {
            if (suppressed || hasTriggered) return;
            // Only when leaving viewport at the top (likely to close tab or address bar)
            if (!e.relatedTarget && e.clientY <= 0) {
                setVisible(true);
                setHasTriggered(true);
            }
        };
        window.addEventListener("mouseout", onMouseOut);

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            window.removeEventListener("mouseout", onMouseOut);
        };
    }, [suppressed, hasTriggered]);

    if (suppressed || !visible) return null;

    const goToFeedback = () => {
        setSnooze(7); // prevent immediate re-show
        setVisible(false);
        navigate(`/feedback${feedbackSearch}`); // << pass context for rating page
    };

    const closeOnly = () => {
        setVisible(false); // Close without snooze
    };

    async function submitQuickFiveStar() {
        // Write a quick 5-star entry to the same collection used by rating.js
        // If you prefer only service rating, change websiteRating to null or remove it.
        const feedbackCollectionRef = collection(db, "guestFeedback");
        await addDoc(feedbackCollectionRef, {
            websiteRating: 5,
            tenderRating: 5,
            comments: "",
            timestamp: serverTimestamp(),
        });
    }

    const onThumbsUp = async () => {
        try {
            await submitQuickFiveStar();
            localStorage.setItem(LS_COMPLETED, "true"); // do not show again
            setMode("thanks");
            setTimeout(() => setVisible(false), 2500);
        } catch (e) {
            // Fallback: route to full feedback
            navigate(`/feedback${feedbackFallbackSearch}`);
        }
    };

    const onThumbsDown = () => {
        // Reveal CTA; don't mark as completed so they can still leave feedback
        setMode("cta");
    };

    return (
        <div className="feedback-toast" role="dialog" aria-live="polite" aria-label="Feedback prompt">
            <div className="feedback-toast__content">
                <div className="feedback-toast__title">How was your tender experience?</div>

                {mode === "prompt" && (
                    <div className="feedback-toast__actions" role="group" aria-label="Quick rating">
                        <button className="feedback-btn" onClick={onThumbsUp} aria-label="Thumbs up (5 stars)" title="Great (5 stars)">
                            👍 Good
                        </button>
                        <button className="feedback-btn" onClick={onThumbsDown} aria-label="Thumbs down" title="Not great">
                            👎 Could be improved
                        </button>
                    </div>
                )}

                {mode === "cta" && (
                    <div className="feedback-toast__actions">
                        <button className="feedback-btn feedback-btn--primary" onClick={goToFeedback}>
                            LEAVE COMMENT
                        </button>
                    </div>
                )}

                {mode === "thanks" && (
                    <div className="feedback-toast__text" aria-live="polite">
                        Thank you. We appreciate you taking a moment to share your positive experience!
                    </div>
                )}
            </div>

            <button className="feedback-toast__close" onClick={closeOnly} aria-label="Close">
                ×
            </button>
        </div>
    );
}
