import React, { useState, useEffect, useRef } from "react";
import { db } from "../../firebaseconfig";
import {
  collection,
  query,
  orderBy,
  where,
  onSnapshot,
  limit,
} from "firebase/firestore";
import notificationSound from "../../assets/notification.mp3";
import "./guestnotifications.css";
import Logo from "../../components/logo.js";

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
        <path
          d="M10 3.75V1.875M10 13.125V6.875M10 6.875L2.92734 9.23281C2.80289 9.2743 2.69465 9.35389 2.61796 9.46032C2.54126 9.56674 2.49999 9.6946 2.5 9.82578V11.875C2.5 16.25 10 18.125 10 18.125C10 18.125 17.5 16.25 17.5 11.875V9.82578C17.5 9.6946 17.4587 9.56674 17.382 9.46032C17.3053 9.35389 17.1971 9.2743 17.0727 9.23281L10 6.875ZM4.375 8.75V4.375C4.375 4.20924 4.44085 4.05027 4.55806 3.93306C4.67527 3.81585 4.83424 3.75 5 3.75H15C15.1658 3.75 15.3247 3.81585 15.4419 3.93306C15.5592 4.05027 15.625 4.20924 15.625 4.375V8.75"
          stroke="#1C1C1C"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (type === "arrivedPier") {
    return (
      <svg {...iconProps}>
        <path
          d="M3.12496 14.9174C8.74996 10.2541 11.25 19.3291 16.875 14.6658M3.12496 11.3757C8.74996 6.71243 11.25 15.7874 16.875 11.1242M4.79163 3.95825V8.12492M14.7916 4.16659V9.16659M11.4583 9.16659L11.4583 5.83325M8.12496 8.12492V5.62492M1.66663 5.62492H17.9166"
          stroke="#1C1C1C"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (type === "departedShip") {
    return (
      <svg {...iconProps}>
        <path
          d="M3.125 15.6258C8.75 10.9625 11.25 20.0375 16.875 15.3743M10.8839 4.18726L13.5355 6.83891L10.8839 9.49056M13.5355 6.83891H6.46447"
          stroke="#1C1C1C"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (type === "departedPier") {
    return (
      <svg {...iconProps}>
        <path
          d="M3.125 15.6258C8.75 10.9625 11.25 20.0375 16.875 15.3743M9.11612 4.18726L6.46447 6.83891L9.11612 9.49056M6.46447 6.83891H13.5355"
          stroke="#1C1C1C"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return null;
};

function GuestNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [latestNotificationId, setLatestNotificationId] = useState(null);
  const [portName, setPortName] = useState("");
  const [lastTender, setLastTender] = useState("");
  const latestIdRef = useRef(null);
  const audioRef = useRef(null);
  const [soundEnabled, setIsSoundEnabled] = useState(false);
  const soundEnabledRef = useRef(soundEnabled);
  const [avgTime, setAvgTime] = useState(0);
  const listRef = useRef(null); // Add this ref

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
    if (audioRef.current) {
      audioRef.current.muted = !soundEnabled;
    }
  }, [soundEnabled]);

  useEffect(() => {
    latestIdRef.current = latestNotificationId;
  }, [latestNotificationId]);

  useEffect(() => {
    let unsubscribePortDays = null;
    let unsubscribeNotifications = null;

    unsubscribePortDays = onSnapshot(
      collection(db, "portDays"),
      (portDaysSnapshot) => {
        const activePortDayDoc = portDaysSnapshot.docs.find(
          (doc) => doc.data().isActive,
        );

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
            limit(10),
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
                if (audioRef.current && soundEnabledRef.current) {
                  audioRef.current.currentTime = 0;
                  audioRef.current.play().catch(() => {});
                }
              }
            },
            (error) => {
              console.error("Error listening for guest notifications: ", error);
            },
          );
        } else {
          setNotifications([]);
          setPortName("");
          if (unsubscribeNotifications) unsubscribeNotifications();
        }
      },
      (error) => {
        console.error("Error listening for port days: ", error);
      },
    );

    return () => {
      if (unsubscribePortDays) unsubscribePortDays();
      if (unsubscribeNotifications) unsubscribeNotifications();
    };
  }, []);

  const enableSound = () => {
    setIsSoundEnabled((prev) => !prev);
  };

  const formatNotificationDate = (timestamp) => {
    if (!timestamp) return null;

    const dateObj =
      typeof timestamp.toDate === "function"
        ? timestamp.toDate()
        : new Date(timestamp);

    return !isNaN(dateObj) ? dateObj : null;
  };

  const formatDisplayTime = (dateObj) =>
    dateObj.toLocaleString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

  const getTenderNumber = (tender) => {
    const tenderMatch = String(tender || "").match(/\d+/);
    return tenderMatch ? tenderMatch[0] : tender || "";
  };

  const getNotificationDetails = (notification, arrivalTime) => {
    const vesselName = "Evrima";
    const direction = notification.direction;
    const action = notification.action;
    const arrivedLocation = direction === "SHIPSIDE" ? vesselName : "pier";
    const departedLocation = direction === "SHIPSIDE" ? "pier" : vesselName;
    const arrivedIcon =
      direction === "SHIPSIDE" ? "arrivedShip" : "arrivedPier";
    const departedIcon =
      direction === "SHIPSIDE" ? "departedPier" : "departedShip";

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
      message: notification.message || "",
      icon: null,
      eta: "",
    };
  };

  const getNotificationLocationClass = (notification) => {
    const { action, direction } = notification;

    if (action === "ARRIVED") {
      return direction === "SHIPSIDE"
        ? "shipside-notification"
        : "shoreside-notification";
    }

    if (action === "DEPARTED") {
      return direction === "SHIPSIDE"
        ? "shoreside-notification"
        : "shipside-notification";
    }

    return direction === "SHIPSIDE"
      ? "shipside-notification"
      : direction === "SHORESIDE"
        ? "shoreside-notification"
        : "custom-notification";
  };

  // Scroll to top when notifications change
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }
  }, [notifications]);

  return (
    <div className="guest-notifications">
      <Logo enableSound={enableSound} soundEnabled={soundEnabled} />
      <div className="header-container">
        <h2>{portName ? `At ${portName}` : "Waiting for Port Information"}</h2>
        <h1>TENDER STATUS NOTIFICATIONS</h1>
        <h3>{portName && `Last Tender from shoreside: ${lastTender}`}</h3>
        <audio
          ref={audioRef}
          src={notificationSound}
          style={{ display: "none" }}
          muted={!soundEnabled}
        />
      </div>
      {portName ? (
        <div className="reference-info">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
          >
            <circle cx="6" cy="6" r="6" fill="#E8F1FA" />
            <circle
              cx="6"
              cy="6"
              r="5.5"
              stroke="#1C1C1C"
              stroke-opacity="0.5"
            />
          </svg>
          <span className="reference-label">YACHT</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
          >
            <circle cx="6" cy="6" r="6" fill="#ffffff" />
            <circle
              cx="6"
              cy="6"
              r="5.5"
              stroke="#1C1C1C"
              stroke-opacity="0.5"
            />
          </svg>
          <span className="reference-label">SHORE</span>
        </div>
      ) : (
        <div className="waiting-info">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 32 32"
            fill="none"
          >
            <path
              d="M16 9V16H23M28 16C28 22.6274 22.6274 28 16 28C9.37258 28 4 22.6274 4 16C4 9.37258 9.37258 4 16 4C22.6274 4 28 9.37258 28 16Z"
              stroke="#404040"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <h4 className="waiting-title">Thanks for your patience</h4>
          <p>Waiting for port information...</p>
        </div>
      )}

      {portName ? (
        <ul className="notification-list" ref={listRef}>
          {notifications.map((notification) => {
            // Calculate arrival time
            let arrivalTime = "";
            const notificationDate = formatNotificationDate(
              notification.timestamp,
            );

            if (notificationDate && avgTime) {
              const arrivalWithAvg = new Date(
                notificationDate.getTime() + avgTime * 60000,
              );
              arrivalTime = formatDisplayTime(arrivalWithAvg);
            }

            const displayTime = notificationDate
              ? formatDisplayTime(notificationDate)
              : "";
            const notificationDetails = getNotificationDetails(
              notification,
              arrivalTime,
            );
            const notificationTypeClass =
              getNotificationLocationClass(notification);
            const tenderNumber = getTenderNumber(notification.tender);

            return (
              <li
                key={notification.id}
                className={`notification-item ${notificationTypeClass} ${
                  notification.id === latestNotificationId
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
                  {notificationDetails.eta ? (
                    <p className="notification-eta">
                      {notificationDetails.eta}
                    </p>
                  ) : null}
                </div>
                {notificationTypeClass !== "custom-notification" ? (
                  <div className="tender">
                    Tender
                    <span className="tender-number">{tenderNumber}</span>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

export default GuestNotifications;
