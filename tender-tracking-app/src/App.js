import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import GuestNotifications from "./pages/guest notifications/GuestNotifications";
import MapPage from "./pages/map/MapPage";
import Rating from "./pages/rating page/rating";
import GuestNotificationsTV from "./pages/tv/GuestNotificationsTV";
import "leaflet/dist/leaflet.css";
import { Analytics } from "@vercel/analytics/react";
// import FeedbackPrompt from "./components/FeedbackPrompt";

function App() {
  return (
    <BrowserRouter>
      <Analytics />
      {/* <FeedbackPrompt /> */}
      <Routes>
        <Route path="/" element={<GuestNotifications />} />
        <Route path="/tv" element={<GuestNotificationsTV />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/feedback" element={<Rating />} />
        <Route
          path="*"
          element={<div className="not-found">Page Not Found</div>}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
