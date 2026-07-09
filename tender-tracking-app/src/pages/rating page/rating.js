import React, { useState, useEffect } from "react";
import { db } from "../../firebaseconfig";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate, useLocation } from "react-router-dom"; // changed: add useLocation
import "./rating.css";
import Logo from "../../components/logo";

const StarIcon = () => (
  <svg
    className="star-icon"
    xmlns="http://www.w3.org/2000/svg"
    width="21"
    height="20"
    viewBox="0 0 21 20"
    fill="none"
    aria-hidden="true"
    focusable="false"
  >
    <path
      d="M10.2491 15.9772L15.3791 19.1319C15.5122 19.2127 15.6662 19.2523 15.8218 19.2455C15.9774 19.2388 16.1274 19.1861 16.253 19.0941C16.3787 19.0021 16.4742 18.8749 16.5275 18.7286C16.5809 18.5823 16.5897 18.4235 16.5528 18.2722L15.1578 12.3857L19.7234 8.44818C19.8398 8.34597 19.9238 8.2119 19.9649 8.06253C20.0059 7.91317 20.0024 7.75504 19.9546 7.60767C19.9069 7.46031 19.817 7.33015 19.6961 7.23328C19.5752 7.13641 19.4286 7.07705 19.2744 7.06255L13.2828 6.57505L10.9747 0.987553C10.9158 0.843402 10.8154 0.720043 10.6862 0.633209C10.5569 0.546374 10.4048 0.5 10.2491 0.5C10.0934 0.5 9.9412 0.546374 9.81196 0.633209C9.68273 0.720043 9.58228 0.843402 9.52344 0.987553L7.21532 6.57505L1.22375 7.06255C1.06847 7.07619 0.920648 7.13528 0.798755 7.23244C0.676862 7.3296 0.586303 7.46053 0.538392 7.60886C0.490481 7.7572 0.487343 7.91636 0.529369 8.06647C0.571395 8.21658 0.656722 8.35097 0.77469 8.45287L5.34032 12.3904L3.94532 18.2722C3.90844 18.4235 3.91723 18.5823 3.97059 18.7286C4.02394 18.8749 4.11947 19.0021 4.24508 19.0941C4.3707 19.1861 4.52077 19.2388 4.67634 19.2455C4.8319 19.2523 4.98596 19.2127 5.11907 19.1319L10.2491 15.9772Z"
      stroke="#404040"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

function Rating() {
  const [websiteRating, setWebsiteRating] = useState(0);
  const [tenderRating, setTenderRating] = useState(0);
  const [comments, setComments] = useState("");
  const [submissionStatus, setSubmissionStatus] = useState("");
  const [redirectTimer, setRedirectTimer] = useState(0);

  const navigate = useNavigate();
  const location = useLocation(); // NEW
  const [intent, setIntent] = useState("default"); // NEW
  const isEmbed = new URLSearchParams(location.search).get("embed") === "true";

  // NEW: read query param to customize copy when coming from thumbs-down
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const v = params.get("intent");
    if (v) setIntent(v);
  }, [location.search]);

  const commentPlaceholder =
    "If you wish, please share any additional comments about your experience.";

  const handleWebsiteRatingClick = (selectedRating) => {
    setWebsiteRating(selectedRating);
  };

  const handleTenderRatingClick = (selectedRating) => {
    setTenderRating(selectedRating);
  };

  const handleCommentsChange = (event) => {
    setComments(event.target.value);
  };

  const handleSubmitFeedback = async () => {
    if (websiteRating === 0 || tenderRating === 0) {
      setSubmissionStatus(
        "Please rate both the website and the tender service.",
      );
      return;
    }

    try {
      const feedbackCollectionRef = collection(db, "guestFeedback");
      await addDoc(feedbackCollectionRef, {
        websiteRating: websiteRating,
        tenderRating: tenderRating,
        comments: comments,
        timestamp: serverTimestamp(),
        source: intent === "improve" ? "prompt-thumbs-down" : "direct", // optional trace
      });

      setWebsiteRating(0);
      setTenderRating(0);
      setComments("");
      setSubmissionStatus(
        "Thank you for your feedback! You will be redirected in 5 seconds...",
      );
      setRedirectTimer(5);
    } catch (error) {
      console.error("Error submitting feedback: ", error);
      setSubmissionStatus("Failed to submit feedback. Please try again.");
    }
  };

  useEffect(() => {
    if (redirectTimer > 0) {
      const timer = setInterval(() => {
        setRedirectTimer((prevTimer) => prevTimer - 1);
      }, 1000);
      return () => clearInterval(timer);
    }

    if (redirectTimer === 0 && submissionStatus.startsWith("Thank you")) {
      navigate(isEmbed ? "/?embed=true" : "/");
    }
  }, [isEmbed, redirectTimer, navigate, submissionStatus]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div className="feedback-website">
      <Logo page="no-sound" />
      {submissionStatus ? (
        <div className="submission-container">
          <div className="confirmation-icon">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="40"
              height="40"
              viewBox="0 0 40 40"
              fill="none"
            >
              <path
                d="M6.25 22.5L15 31.25L35 11.25"
                stroke="#146C43"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </div>

          <h3>Thank you for your feedback!</h3>

          <p>
            Your feedback has been successfully received. <br />
            <br />
            We truly appreciate your thoughtful input and the time you’ve
            dedicated to sharing it.
          </p>
          {redirectTimer > 0 && (
            <p>Redirecting in {redirectTimer} seconds...</p>
          )}
        </div>
      ) : (
        <div className="feedback-container">
          <div className="header-feedback-container">
            <h1>Guest Feedback</h1>
            <h3>
              Thank you for taking a moment to share your feedback with us, it
              truly helps us refine your journey.
            </h3>
          </div>
          <div className="sections">
            <div className="rating-section">
              <h3>Rate our notification service</h3>
              <div className="star-rating">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    className={`star ${star <= websiteRating ? "filled" : ""}`}
                    onClick={() => handleWebsiteRatingClick(star)}
                  >
                    <StarIcon />
                  </span>
                ))}
              </div>
              <h3>Rate your tender ride</h3>
              <div className="star-rating">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    className={`star ${star <= tenderRating ? "filled" : ""}`}
                    onClick={() => handleTenderRatingClick(star)}
                  >
                    <StarIcon />
                  </span>
                ))}
              </div>
            </div>

            <div className="comment-section">
              <h3>Optional Comments</h3>
              <textarea
                value={comments}
                onChange={handleCommentsChange}
                placeholder={commentPlaceholder}
                rows="4"
              />
            </div>
          </div>
          <button
            onClick={handleSubmitFeedback}
            disabled={websiteRating === 0 || tenderRating === 0}
          >
            SUBMIT FEEDBACK
          </button>
        </div>
      )}
    </div>
  );
}

export default Rating;
