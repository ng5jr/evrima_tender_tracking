import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./FeedbackPrompt.css";

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
    // Between 30s and 120s
    const min = 30_000;
    const max = 90_000;
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

export default function FeedbackPrompt() {
    const location = useLocation();
    const navigate = useNavigate();

    const [visible, setVisible] = useState(false);
    const [hasTriggered, setHasTriggered] = useState(false);
    const timeoutRef = useRef(null);

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
        // Optionally, mark a short snooze so it won’t immediately re-show if they bounce back
        setSnooze(7); // snooze for 7 days once they click through
        setVisible(false);
        navigate("/feedback");
    };

    const dismiss = () => {
        setSnooze(1); // Not now: snooze for 1 day
        setVisible(false);
    };

    const closeOnly = () => {
        setVisible(false); // Close without snooze
    };

    return (
        <div className="feedback-toast" role="dialog" aria-live="polite" aria-label="Feedback prompt">
            <div className="feedback-toast__content">
                <div className="feedback-toast__title">Got a minute?</div>
                <div className="feedback-toast__text">Would you like to leave quick feedback to help us improve?</div>
            </div>
            <div className="feedback-toast__actions">
                <button className="feedback-btn feedback-btn--primary" onClick={goToFeedback}>
                    Leave feedback
                </button>
                <button className="feedback-btn" onClick={dismiss} aria-label="Not now">
                    Not now
                </button>
            </div>
            <button className="feedback-toast__close" onClick={closeOnly} aria-label="Close">
                ×
            </button>
        </div>
    );
}
