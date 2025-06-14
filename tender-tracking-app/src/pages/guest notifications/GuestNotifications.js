import React, { useState, useEffect, useRef } from "react";
import { db } from "../../firebaseconfig";
import { collection, query, orderBy, where, onSnapshot, getDocs, limit } from "firebase/firestore";
import notificationSound from "../../assets/notification.mp3";
import "./guestnotifications.css";
import Logo from "../../components/logo.js";


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
                if (audioRef.current && soundEnabledRef.current) {
                  audioRef.current.currentTime = 0;
                  audioRef.current.play().catch(() => { });
                }
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

  const enableSound = () => {
    setIsSoundEnabled((prev) => !prev);
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
      <h1>TENDER STATUS NOTIFICATIONS</h1>
      <h2>{portName ? portName : "Waiting for Port Information"}</h2>
      <h3>{portName && `Last Tender from shoreside: ${lastTender}`}</h3>
      <audio
        ref={audioRef}
        src={notificationSound}
        style={{ display: "none" }}
        muted={!soundEnabled}
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
  );
}

export default GuestNotifications;
