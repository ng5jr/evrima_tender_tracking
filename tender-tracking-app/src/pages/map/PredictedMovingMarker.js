import React, { useEffect, useRef, useState } from 'react';
import { Marker, Popup } from 'react-leaflet';

// --- Utility functions ---
function haversine([lat1, lon1], [lat2, lon2]) {
    const R = 6371000;
    const toRad = deg => deg * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
}

function bearing([lat1, lon1], [lat2, lon2]) {
    const toRad = deg => deg * Math.PI / 180;
    const toDeg = rad => rad * 180 / Math.PI;
    const dLon = toRad(lon2 - lon1);
    const y = Math.sin(dLon) * Math.cos(toRad(lat2));
    const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
        Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
    return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function isHeadingTo(cog, from, to) {
    const brg = bearing(from, to);
    const diff = Math.abs(((cog - brg + 540) % 360) - 180);
    return diff < 30;
}

function formatClockTime(lastReceived, etaSeconds) {
    if (!lastReceived || !isFinite(etaSeconds) || etaSeconds < 0) return "--";
    const etaDate = new Date(lastReceived.getTime() + etaSeconds * 1000);
    return etaDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

// Accurate destination point calculation
function destinationPoint([lat, lon], distance, bearingDeg) {
    const R = 6371000; // meters
    const δ = distance / R; // angular distance in radians
    const θ = bearingDeg * Math.PI / 180;
    const φ1 = lat * Math.PI / 180;
    const λ1 = lon * Math.PI / 180;

    const φ2 = Math.asin(Math.sin(φ1) * Math.cos(δ) +
        Math.cos(φ1) * Math.sin(δ) * Math.cos(θ));
    const λ2 = λ1 + Math.atan2(Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
        Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2));

    return [
        φ2 * 180 / Math.PI,
        λ2 * 180 / Math.PI
    ];
}

// --- Main component ---
const PredictedMovingMarker = ({
    position,
    sog,
    cog,
    lastReceived,
    icon,
    zIndexOffset = 1000,
    name = "Tender",
    markerRef,
    shipPosition,
    pierLocation
}) => {
    // --- Predictive animation state ---
    const [animatedPosition, setAnimatedPosition] = useState(position);
    const lastUpdateRef = useRef({
        position,
        sog,
        cog,
        lastReceived,
    });
    const animationRef = useRef();

    // When a new position is received, only jump if it's different from the last animated position
    useEffect(() => {
        // Use a small threshold to avoid floating point issues (e.g., 1 meter)
        if (haversine(animatedPosition, position) > 1) {
            setAnimatedPosition(position);
        }
        // else: keep animating from where we are
        // eslint-disable-next-line
    }, [position]);

    // Always keep the latest values for animation and info
    useEffect(() => {
        lastUpdateRef.current = { position, sog, cog, lastReceived };
    }, [position, sog, cog, lastReceived]);

    // Animate movement from the last known position, COG, and SOG
    useEffect(() => {
        let running = true;
        function animate() {
            if (!running) return;

            const { position: startPos, sog: lastSog, cog: lastCog, lastReceived: lastTime } = lastUpdateRef.current;
            if (!startPos || lastSog == null || lastCog == null || !lastTime || lastSog <= 0.9) {
                // Do NOT update animatedPosition here; let the useEffect below handle it
            } else {
                const now = Date.now();
                const elapsedSeconds = (now - lastTime.getTime()) / 1000;
                const speed = lastSog * 0.514444; // knots to m/s
                const distance = speed * elapsedSeconds; // meters
                const [newLat, newLng] = destinationPoint(startPos, distance, lastCog);
                setAnimatedPosition([newLat, newLng]);
            }
            animationRef.current = requestAnimationFrame(animate);
        }
        animationRef.current = requestAnimationFrame(animate);

        return () => {
            running = false;
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, []);

    // Use animatedPosition for display
    let displayPosition = position;

    // --- Calculate ETA and distance based on last received position ---
    let destination = null, etaSeconds = null;
    let toShip = null, toPier = null;
    if (position && shipPosition && pierLocation) {
        toShip = haversine(position, shipPosition);
        toPier = haversine(position, pierLocation);

        if (sog > 0.5) {
            const speed = sog * 0.514444;
            if (isHeadingTo(cog, position, shipPosition)) {
                destination = "Evrima";
                etaSeconds = toShip / speed;
            } else if (isHeadingTo(cog, position, pierLocation)) {
                destination = "Pier";
                etaSeconds = toPier / speed;
            }
        } else {
            // Stopped: show distance to closest destination
            if (toShip < toPier) {
                destination = "Evrima";
            } else {
                destination = "Pier";
            }
        }
    }

    // Force rotation update on COG change
    useEffect(() => {
        if (markerRef && markerRef.current && typeof markerRef.current.setRotationAngle === 'function') {
            markerRef.current.setRotationAngle((cog ?? 0) - 90);
        }
    }, [cog, markerRef]);

    return (
        <Marker
            position={displayPosition}
            icon={icon}
            rotationAngle={(cog ?? 0) - 90}
            rotationOrigin="center"
            ref={markerRef}
            zIndexOffset={zIndexOffset}
        >
            <Popup className="custom-popup">
                {name}<br />
                {lastReceived && (
                    <span style={{ fontSize: '0.7em', color: '#aaa' }}>
                        Last Received: {lastReceived.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                    </span>
                )}<br />
                {toShip !== null && toShip < 100 ? (
                    <span style={{ fontSize: '0.7em', color: '#4caf50' }}>
                        Arrived to Evrima
                    </span>
                ) : toPier !== null && toPier < 100 ? (
                    <span style={{ fontSize: '0.7em', color: '#2196f3' }}>
                        Arrived to the Pier
                    </span>
                ) : destination && (
                    <span style={{ fontSize: '0.7em', color: '#aaa' }}>
                        {(etaSeconds && etaSeconds > 0) && (
                            <>
                                ETA to {destination}: <b>{formatClockTime(lastReceived, etaSeconds)}</b><br />
                            </>
                        )}
                    </span>
                )}
            </Popup>
        </Marker>
    );
};

export default PredictedMovingMarker;
