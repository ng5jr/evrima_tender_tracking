import React, { useState, useEffect, useRef } from "react";
import { db } from "../../firebaseconfig";
import { collection, query, onSnapshot, doc, where } from "firebase/firestore";
import notificationSound from "../../assets/notification.mp3";

import "./GuestNotificationsTV.css";
import Logo from "../../components/logo.js";
import FullScren from "../../assets/fullscreen.png"; // Adjust path if needed
import Minimize from "../../assets/minimize.png"; // Adjust path if needed

const NotificationIcon = ({ type }) => {
    const iconProps = {
        className: "notification-icon",
        xmlns: "http://www.w3.org/2000/svg",
        width: "20",
        height: "20",
        viewBox: "0 0 20 20",
        fill: "none",
        "aria-hidden": "true",
        focusable: "false",
    };

    if (type === "arrivedShip") {
        return (
            <svg {...iconProps}>
                <path d="M10 3.75V1.875M10 13.125V6.875M10 6.875L2.92734 9.23281C2.80289 9.2743 2.69465 9.35389 2.61796 9.46032C2.54126 9.56674 2.49999 9.6946 2.5 9.82578V11.875C2.5 16.25 10 18.125 10 18.125C10 18.125 17.5 16.25 17.5 11.875V9.82578C17.5 9.6946 17.4587 9.56674 17.382 9.46032C17.3053 9.35389 17.1971 9.2743 17.0727 9.23281L10 6.875ZM4.375 8.75V4.375C4.375 4.20924 4.44085 4.05027 4.55806 3.93306C4.67527 3.81585 4.83424 3.75 5 3.75H15C15.1658 3.75 15.3247 3.81585 15.4419 3.93306C15.5592 4.05027 15.625 4.20924 15.625 4.375V8.75" stroke="#1C1C1C" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        );
    }

    if (type === "arrivedPier") {
        return (
            <svg {...iconProps}>
                <path d="M3.12496 14.9174C8.74996 10.2541 11.25 19.3291 16.875 14.6658M3.12496 11.3757C8.74996 6.71243 11.25 15.7874 16.875 11.1242M4.79163 3.95825V8.12492M14.7916 4.16659V9.16659M11.4583 9.16659L11.4583 5.83325M8.12496 8.12492V5.62492M1.66663 5.62492H17.9166" stroke="#1C1C1C" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        );
    }

    if (type === "departedShip") {
        return (
            <svg {...iconProps}>
                <path d="M3.125 15.6258C8.75 10.9625 11.25 20.0375 16.875 15.3743M10.8839 4.18726L13.5355 6.83891L10.8839 9.49056M13.5355 6.83891H6.46447" stroke="#1C1C1C" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        );
    }

    if (type === "departedPier") {
        return (
            <svg {...iconProps}>
                <path d="M3.125 15.6258C8.75 10.9625 11.25 20.0375 16.875 15.3743M9.11612 4.18726L6.46447 6.83891L9.11612 9.49056M6.46447 6.83891H13.5355" stroke="#1C1C1C" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        );
    }

    return null;
};

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
                    setAvgTime(Number.parseFloat(activePortDayDoc.data().avgTime) || 0);
                    setLastTender(activePortDayDoc.data().lastTenderTime || "TBA");
                    // Unsubscribe from previous notifications listener if any
                    if (unsubscribeNotifications) unsubscribeNotifications();

                    const notificationsQuery = query(
                        collection(db, "guestNotifications"),
                        where("portDayId", "==", activePortDayDoc.id)
                    );

                    unsubscribeNotifications = onSnapshot(
                        notificationsQuery,
                        (querySnapshot) => {
                            const notificationsData = querySnapshot.docs
                                .map((doc) => ({ id: doc.id, ...doc.data() }))
                                .sort((a, b) => {
                                    const getSortTime = (item) => {
                                        const value = item.timestampSort || item.timestamp;
                                        if (typeof value?.toMillis === "function") return value.toMillis();
                                        return formatNotificationDate(value)?.getTime() || 0;
                                    };
                                    return getSortTime(b) - getSortTime(a);
                                })
                                .slice(0, 10);
                            setNotifications(notificationsData);
                            console.log("Notifications data:", notificationsData);

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

    const getNotificationLocationClass = (notification) => {
        const direction = String(notification.direction || "").toUpperCase();
        const normalizedMessage = String(notification.message || "").toLowerCase();

        if (normalizedMessage.includes("evrima")) return "shipside-notification";
        if (normalizedMessage.includes("pier")) return "shoreside-notification";

        return direction === "SHIPSIDE"
            ? "shipside-notification"
            : direction === "SHORESIDE"
                ? "shoreside-notification"
                : "custom-notification";
    };

    const formatNotificationDate = (timestamp) => {
        if (!timestamp) return null;

        if (typeof timestamp.toDate === "function") return timestamp.toDate();
        if (typeof timestamp === "string") {
            const match = timestamp.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:,)?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
            if (match) {
                const [, day, month, year, hour, minute, second = "0"] = match;
                const parsed = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
                return isNaN(parsed.getTime()) ? null : parsed;
            }
        }
        const dateObj = new Date(timestamp);

        return !isNaN(dateObj.getTime()) ? dateObj : null;
    };

    const formatDisplayTime = (dateObj) =>
        dateObj.toLocaleString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        });

    const getTenderNumber = (tender) => {
        const tenderLabel = String(tender || "").trim();
        const tenderMatch = tenderLabel.match(/\d+/);
        if (!tenderMatch) return tenderLabel;
        return /^local tender\b/i.test(tenderLabel)
            ? `L${tenderMatch[0]}`
            : tenderMatch[0];
    };

    const getNotificationDetails = (notification, arrivalTime) => {
        const vesselName = "Evrima";
        const direction = String(notification.direction || "").toUpperCase();
        const storedMessage = String(notification.message || "");
        const normalizedMessage = storedMessage.toLowerCase();
        const actionFromMessage = normalizedMessage.includes("departed")
            ? "DEPARTED"
            : normalizedMessage.includes("arrived")
                ? "ARRIVED"
                : "";
        const action = String(actionFromMessage || notification.action || "").toUpperCase();
        const locationFromMessage = normalizedMessage.includes(vesselName.toLowerCase())
            ? vesselName
            : normalizedMessage.includes("pier")
                ? "pier"
                : "";
        const arrivedLocation = locationFromMessage || (direction === "SHIPSIDE" ? vesselName : "pier");
        const departedLocation = locationFromMessage || (direction === "SHIPSIDE" ? "pier" : vesselName);
        const arrivedIcon = direction === "SHIPSIDE" ? "arrivedShip" : "arrivedPier";
        const departedIcon = direction === "SHIPSIDE" ? "departedPier" : "departedShip";

        if (action === "ARRIVED") {
            return {
                message: `Arrived to ${arrivedLocation}`,
                icon: arrivedIcon,
                eta: "",
            };
        }

        if (action === "DEPARTED") {
            return {
                message: `Departed From ${departedLocation}`,
                icon: departedIcon,
                eta: arrivalTime ? `Estimated Time of Arrival ${arrivalTime}` : "",
            };
        }

        return {
            message: storedMessage,
            icon: null,
            eta: arrivalTime ? `Estimated Time of Arrival ${arrivalTime}` : "",
        };
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
                <Logo />
                <div className="header-container">
                    <h2>{portName ? `At ${portName}` : "Waiting for Port Information"}</h2>
                    <h1>TENDER STATUS NOTIFICATIONS</h1>
                    <h3>{portName && `Last Tender from shoreside: ${lastTender}`}</h3>
                </div>
                {portName ? (
                    <div className="reference-info">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <circle cx="6" cy="6" r="6" fill="#E8F1FA" />
                            <circle cx="6" cy="6" r="5.5" stroke="#1C1C1C" strokeOpacity="0.5" />
                        </svg>
                        <span className="reference-label">YACHT</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <circle cx="6" cy="6" r="6" fill="#ffffff" />
                            <circle cx="6" cy="6" r="5.5" stroke="#1C1C1C" strokeOpacity="0.5" />
                        </svg>
                        <span className="reference-label">SHORE</span>
                    </div>
                ) : null}
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
                        let arrivalTime = "";
                        const notificationDate = formatNotificationDate(notification.timestamp);

                        if (notificationDate && avgTime) {
                            const arrivalWithAvg = new Date(
                                notificationDate.getTime() + avgTime * 60000
                            );
                            arrivalTime = formatDisplayTime(arrivalWithAvg);
                        }

                        const displayTime = notificationDate
                            ? formatDisplayTime(notificationDate)
                            : "";
                        const notificationDetails = getNotificationDetails(
                            notification,
                            arrivalTime
                        );
                        const tenderNumber = getTenderNumber(notification.tender);

                        return (
                            <li
                                key={notification.id}
                                className={`notification-item ${getNotificationLocationClass(notification)} ${notification.id === latestNotificationId
                                        ? "blinking-notification"
                                        : ""
                                    }`}
                            >
                                <div className="notification-content">
                                    <p className="notification-time">{displayTime}</p>
                                    <p className="notification-message">
                                        <span>{notificationDetails.message}</span>
                                        {notificationDetails.icon ? (
                                            <NotificationIcon type={notificationDetails.icon} />
                                        ) : null}
                                    </p>
                                    <p className="notification-eta">{notificationDetails.eta}</p>
                                </div>
                                <div className="tender">
                                    Tender
                                    <span className="tender-number">{tenderNumber}</span>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </div>
    );
}

export default GuestNotificationsTV;
