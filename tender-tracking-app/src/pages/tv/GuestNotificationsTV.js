import React, { useState, useEffect, useRef } from "react";
import { db } from "../../firebaseconfig";
import { collection, query, orderBy, onSnapshot, doc, limit, where } from "firebase/firestore";
import notificationSound from "../../assets/notification.mp3";

import "./GuestNotificationsTV.css";
import Logo from "../../components/logo.js";
import FullScren from "../../assets/fullscreen.png"; // Adjust path if needed
import Minimize from "../../assets/minimize.png"; // Adjust path if needed
function GuestNotificationsTV() {
    const [notifications, setNotifications] = useState([]);
    const [latestNotificationId, setLatestNotificationId] = useState(null);
    const latestIdRef = useRef(null);
    const [uploadedImage, setUploadedImage] = useState(null);
    const [isImageUploaded, setIsImageUploaded] = useState(false);
    const [imageDisplayMode, setImageDisplayMode] = useState('contain');
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isLoadingImage, setIsLoadingImage] = useState(true);
    const tvLayoutRef = useRef(null);
    const audioRef = useRef(null);
    const [portName, setPortName] = useState("");
    const [lastTender, setLastTender] = useState("");
    const [avgTime, setAvgTime] = useState(0);
    const listRef = useRef(null); // Add this ref
    // const [soundEnabled, setIsSoundEnabled] = useState(false);

    // useEffect(() => {
    //     audioRef.current = new Audio(notificationSound);
    //     if (audioRef.current) {
    //         audioRef.current.muted = true;
    //     }
    // }, []);

    // const playNotificationSound = useCallback(() => {
    //     if (audioRef.current && soundEnabled) {
    //         audioRef.current
    //             .play()
    //             .catch((error) => console.warn("Audio playback failed:", error));
    //     }
    // }, [soundEnabled]);

    // Listen for image changes in Firebase
    useEffect(() => {
        const displayImageRef = doc(db, "displayImages", "tvDisplay");

        const unsubscribe = onSnapshot(
            displayImageRef,
            (docSnapshot) => {
                if (docSnapshot.exists()) {
                    const data = docSnapshot.data();
                    if (data && data.imageData) {
                        setUploadedImage(data.imageData);
                        setIsImageUploaded(true);
                    } else {
                        setIsImageUploaded(false);
                        setUploadedImage(null);
                    }
                } else {
                    console.log("No display image document found");
                    setIsImageUploaded(false);
                    setUploadedImage(null);
                }
                setIsLoadingImage(false);
            },
            (error) => {
                console.error("Error fetching display image:", error);
                setIsLoadingImage(false);
            }
        );

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        latestIdRef.current = latestNotificationId;
    }, [latestNotificationId]);

    useEffect(() => {
        let unsubscribePortDays = null;
        let unsubscribeNotifications = null;

        unsubscribePortDays = onSnapshot(
            collection(db, "portDays"),
            (portDaysSnapshot) => {
                const activePortDayDoc = portDaysSnapshot.docs.find(doc => doc.data().isActive);

                if (activePortDayDoc) {
                    setPortName(activePortDayDoc.data().name || "");
                    setAvgTime(activePortDayDoc.data().avgTime || 0);
                    setLastTender(activePortDayDoc.data().lastTenderTime || "TBA");
                    // Unsubscribe from previous notifications listener if any
                    if (unsubscribeNotifications) unsubscribeNotifications();

                    const notificationsQuery = query(
                        collection(db, "guestNotifications"),
                        where("portDayId", "==", activePortDayDoc.id),
                        orderBy("timestamp", "desc"),
                        limit(10)
                    );

                    unsubscribeNotifications = onSnapshot(
                        notificationsQuery,
                        (querySnapshot) => {
                            const notificationsData = querySnapshot.docs.map((doc) => ({
                                id: doc.id,
                                ...doc.data(),
                            }));
                            setNotifications(notificationsData);

                            if (
                                notificationsData.length > 0 &&
                                notificationsData[0].id !== latestIdRef.current
                            ) {
                                setLatestNotificationId(notificationsData[0].id);
                            }
                        },
                        (error) => {
                            console.error("Error listening for guest notifications: ", error);
                        }
                    );
                } else {
                    setNotifications([]);
                    setPortName("");
                    if (unsubscribeNotifications) unsubscribeNotifications();
                }
            },
            (error) => {
                console.error("Error listening for port days: ", error);
            }
        );

        return () => {
            if (unsubscribePortDays) unsubscribePortDays();
            if (unsubscribeNotifications) unsubscribeNotifications();
        };
    }, []);

    // const enableSound = () => {
    //     setIsSoundEnabled(!soundEnabled);
    //     if (audioRef.current) {
    //         audioRef.current.muted = false;
    //     }
    // };

    const toggleImageDisplayMode = () => {
        setImageDisplayMode(prevMode => prevMode === 'contain' ? 'cover' : 'contain');
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            // Enter fullscreen
            if (tvLayoutRef.current.requestFullscreen) {
                tvLayoutRef.current.requestFullscreen()
                    .then(() => setIsFullscreen(true))
                    .catch(err => console.error(`Error attempting to enable fullscreen: ${err.message}`));
            } else if (tvLayoutRef.current.mozRequestFullScreen) { /* Firefox */
                tvLayoutRef.current.mozRequestFullScreen();
                setIsFullscreen(true);
            } else if (tvLayoutRef.current.webkitRequestFullscreen) { /* Chrome, Safari & Opera */
                tvLayoutRef.current.webkitRequestFullscreen();
                setIsFullscreen(true);
            } else if (tvLayoutRef.current.msRequestFullscreen) { /* IE/Edge */
                tvLayoutRef.current.msRequestFullscreen();
                setIsFullscreen(true);
            }
        } else {
            // Exit fullscreen
            if (document.exitFullscreen) {
                document.exitFullscreen()
                    .then(() => setIsFullscreen(false))
                    .catch(err => console.error(`Error attempting to exit fullscreen: ${err.message}`));
            } else if (document.mozCancelFullScreen) { /* Firefox */
                document.mozCancelFullScreen();
                setIsFullscreen(false);
            } else if (document.webkitExitFullscreen) { /* Chrome, Safari & Opera */
                document.webkitExitFullscreen();
                setIsFullscreen(false);
            } else if (document.msExitFullscreen) { /* IE/Edge */
                document.msExitFullscreen();
                setIsFullscreen(false);
            }
        }
    };

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('mozfullscreenchange', handleFullscreenChange);
        document.addEventListener('MSFullscreenChange', handleFullscreenChange);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
            document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
            document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
        };
    }, []);


    return (
        <div className="tv-layout" ref={tvLayoutRef}>
            {/* Left side: Image display from Firebase */}
            <div className={`image-section ${isImageUploaded ? "full-screen" : ""}`}>
                {isLoadingImage ? (
                    <div className="loading-image">Loading image...</div>
                ) : (
                    <>
                        {!isImageUploaded && (
                            <div className="no-image-message">
                                <h2>Waiting for image from system</h2>
                                <p>Image will display automatically when available</p>
                            </div>
                        )}
                        {uploadedImage && (
                            <div className="image-container">
                                <img
                                    src={uploadedImage}
                                    alt="Display"
                                    className={`image-${imageDisplayMode}`}
                                    onClick={toggleImageDisplayMode}
                                />
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Right side: Notifications */}
            <div className="guest-notificationstv">
                <Logo tv={'tv'} />
                <h1>TENDER STATUS NOTIFICATIONS</h1>
                <h2>{portName ? portName : "Waiting for Port Information"}</h2>
                <h3>{portName && `Last Tender from shoreside: ${lastTender}`}</h3>
                <div onClick={toggleFullscreen} className="screen-toggle">
                    {!isFullscreen ? (
                        <img src={FullScren} alt="fullscreen" className="screen-icon" />
                    ) : (
                        <img src={Minimize} alt="minimize" className="screen-icon" />
                    )}
                </div>

                <audio
                    ref={audioRef}
                    src={notificationSound}
                    style={{ display: "none" }}
                />
                <ul className="notification-list" ref={listRef}>
                    {notifications.map((notification) => {
                        // Calculate arrival time
                        let arrivalTime = "";
                        if (notification.timestamp && avgTime) {
                            const arrivalDate = new Date(notification.timestamp.toDate().getTime() + avgTime * 60000);
                            arrivalTime = arrivalDate.toLocaleString(undefined, {
                                hour: "numeric",
                                minute: "numeric",
                                hour12: true,
                            });
                        }

                        let displayMessage = "";

                        if (notification.direction === "SHORESIDE" || notification.direction === "SHIPSIDE") {
                            if (notification.action === "ARRIVED") {
                                displayMessage = notification.message;
                            } else if (notification.action === "DEPARTED") {
                                displayMessage = `${notification.message} Estimated time of arrival: ${arrivalTime}.`;
                            } else {
                                displayMessage = `${notification.message} Estimated time of arrival: ${arrivalTime}.`;
                            }
                        } else {
                            displayMessage = notification.message;
                        }

                        return (
                            <li
                                key={notification.id}
                                className={`notification-item ${notification.direction === "SHORESIDE"
                                    ? "shoreside-notification"
                                    : notification.direction === "SHIPSIDE"
                                        ? "shipside-notification"
                                        : "custom-notification"
                                    } ${notification.id === latestNotificationId
                                        ? "blinking-notification"
                                        : ""
                                    }`}
                            >
                                <p className="notification-message">
                                    {displayMessage}
                                </p>
                                <p className="notification-time">
                                    {notification.timestamp?.toDate()?.toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: true
                                    })}
                                </p>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </div>
    );
}

export default GuestNotificationsTV;