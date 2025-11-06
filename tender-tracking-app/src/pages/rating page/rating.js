import React, { useState, useEffect } from "react";
import { db } from "../../firebaseconfig";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate, useLocation } from "react-router-dom"; // changed: add useLocation
import "./rating.css";
import Logo from "../../components/logo";
import { Link } from "react-router-dom";
import back from "../../assets/back.png";

function Rating() {
  const [websiteRating, setWebsiteRating] = useState(0);
  const [tenderRating, setTenderRating] = useState(0);
  const [comments, setComments] = useState("");
  const [submissionStatus, setSubmissionStatus] = useState("");
  const [redirectTimer, setRedirectTimer] = useState(0);

  const navigate = useNavigate();
  const location = useLocation(); // NEW
  const [intent, setIntent] = useState("default"); // NEW

  // NEW: read query param to customize copy when coming from thumbs-down
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const v = params.get("intent");
    if (v) setIntent(v);
  }, [location.search]);

  const headingText =
    intent === "improve" ? "GUEST FEEDBACK" : "GUEST FEEDBACK";
  const commentPlaceholder =
    intent === "improve" ? "What could we do better next time?" : "Would you like to leave us a comment?";

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
      setSubmissionStatus("Please rate both the website and the tender service.");
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
        "Thank you for your feedback! You will be redirected in 5 seconds..."
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
      navigate("/");
    }
  }, [redirectTimer, navigate, submissionStatus]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div className="feedback-website">
      <Logo page="no-sound" />
      <h1>{headingText}</h1>
      {intent === "improve" ? (
        <p className="context-note">We’re sorry the tender experience did not meet your expectations. Your feedback helps us improve.</p>
      ) : <p className="context-note">Thank you for taking a moment to share your feedback with us, it truly helps us refine your journey.</p>}
      <div className="sections">
        <div className="rating-section">
          <h3>Rate our notification service:</h3>
          <div className="star-rating">
            {[1, 2, 3, 4, 5].map((star) => (
              <span
                key={star}
                className={`star ${star <= websiteRating ? "filled" : ""}`}
                onClick={() => handleWebsiteRatingClick(star)}
              >
                ★
              </span>
            ))}
          </div>
        </div>
        <div className="rating-section">
          <h3>Rate your tender ride:</h3>
          <div className="star-rating">
            {[1, 2, 3, 4, 5].map((star) => (
              <span
                key={star}
                className={`star ${star <= tenderRating ? "filled" : ""}`}
                onClick={() => handleTenderRatingClick(star)}
              >
                ★
              </span>
            ))}
          </div>
        </div>
        <div className="comment-section">
          <h3>Comments:</h3>
          <textarea
            value={comments}
            onChange={handleCommentsChange}
            placeholder={commentPlaceholder}
            rows="4"
          />
        </div>

        <button
          onClick={handleSubmitFeedback}
          disabled={websiteRating === 0 || tenderRating === 0}
        >
          Submit Feedback
        </button>
        {submissionStatus && (
          <p className="submission-status">{submissionStatus}</p>
        )}
      </div>
    </div>
  );
}

export default Rating;
