import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import boat from '../../assets/shipimg.png';
import Location from "../../assets/position.png";
import tender3IconImg from '../../assets/evrimatender.png';
import 'leaflet-rotatedmarker';
import 'leaflet/dist/leaflet.css';
import { ref, onValue, off } from 'firebase/database';
import { rtdb } from '../../firebaseconfig'; import './ShipMap.css';
import PredictedMovingMarker from './PredictedMovingMarker.js';

const shipIcon = L.icon({
    iconUrl: boat,
    iconSize: [80, 17],
    iconAnchor: [60, 8.5],
    popupAnchor: [0, -9],
});

const locationIcon = L.icon({
    iconUrl: Location,
    iconSize: [24, 32],
    iconAnchor: [12, 32], // <-- bottom center
    popupAnchor: [0, -32],
});

const tenderIcon = L.icon({
    iconUrl: tender3IconImg,
    iconSize: [30, 15],
    iconAnchor: [15, 7],
    popupAnchor: [0, -7],
});

const shipDotIcon = L.divIcon({
    className: 'ship-dot-icon',
    html: '<div style="width:4px;height:4px;background:#ff3333;border:2px solid #fff;border-radius:50%;box-shadow:0 0 6px #000a;"></div>',
    iconSize: [12, 12],
    iconAnchor: [6, 6],
});

const ShipMapRTDB = ({ pierLocation }) => {
    const [mapCenter, setMapCenter] = useState(null);
    const [shipPosition, setShipPosition] = useState(null);
    const [shipHeading, setShipHeading] = useState(0);
    const [shipLastReceived, setShipLastReceived] = useState(null);
    const [tender1Position, setTender1Position] = useState(null);
    const [tender1Heading, setTender1Heading] = useState(0);
    const [tender1Speed, setTender1Speed] = useState(0);
    const [tender1LastReceived, setTender1LastReceived] = useState(null);
    const [tender2Position, setTender2Position] = useState(null);
    const [tender2Heading, setTender2Heading] = useState(0);
    const [tender2Speed, setTender2Speed] = useState(0);
    const [tender2LastReceived, setTender2LastReceived] = useState(null);
    const [tender3Position, setTender3Position] = useState(null);
    const [tender3Heading, setTender3Heading] = useState(0);
    const [tender3Speed, setTender3Speed] = useState(0);
    const [tender3LastReceived, setTender3LastReceived] = useState(null);
    const [tender4Position, setTender4Position] = useState(null);
    const [tender4Heading, setTender4Heading] = useState(0);
    const [tender4Speed, setTender4Speed] = useState(0);
    const [tender4LastReceived, setTender4LastReceived] = useState(null);
    const [showToast, setShowToast] = useState(false);

    const shipMarkerRef = useRef(null);
    const tender1MarkerRef = useRef(null);
    const tender2MarkerRef = useRef(null);
    const tender3MarkerRef = useRef(null);
    const tender4MarkerRef = useRef(null);
    // const animationRef = useRef();
    const lastAnimatedPositionRef = useRef(null);

    // const ANIMATION_DURATION = 5000;

    useEffect(() => {
        const db = rtdb;
        const shipRef = ref(db, 'positions/ship/latest');
        const tender1Ref = ref(db, 'positions/tender1/latest');
        const tender2Ref = ref(db, 'positions/tender2/latest');
        const tender3Ref = ref(db, 'positions/tender3/latest');
        const tender4Ref = ref(db, 'positions/tender4/latest');

        const handleShipUpdate = (snapshot) => {
            const data = snapshot.val();
            if (data && data.lat && data.lon) {
                setShipPosition([data.lat, data.lon]);
                setShipHeading(data.heading || 0);
                setShipLastReceived(new Date(data.timestamp));
                console.log('RTDB Ship position:', [data.lat, data.lon], 'Ship Heading:', data.heading, 'Ship Speed:', data.speed, "Received at:", new Date().toLocaleTimeString());
            }
        };
        const handleTender1Update = (snapshot) => {
            const data = snapshot.val();
            if (data && data.lat && data.lon) {
                setTender1Position([data.lat, data.lon]);
                setTender1Heading(data.heading || 0);
                setTender1Speed(data.speed || 0);
                setTender1LastReceived(new Date(data.timestamp));
                console.log('Tender 1 position:', [data.lat, data.lon], 'Tender 1 Heading:', data.heading, 'Tender 1 Speed:', data.speed);
            }
        };
        const handleTender2Update = (snapshot) => {
            const data = snapshot.val();
            if (data && data.lat && data.lon) {
                setTender2Position([data.lat, data.lon]);
                setTender2Heading(data.heading || 0);
                setTender2Speed(data.speed || 0);
                setTender2LastReceived(new Date(data.timestamp));
                console.log('Tender 2 position:', [data.lat, data.lon], 'Tender 2 Heading:', data.heading, 'Tender 2 Speed:', data.speed);
            }
        };
        const handleTender3Update = (snapshot) => {
            const data = snapshot.val();
            if (data && data.lat && data.lon) {
                setTender3Position([data.lat, data.lon]);
                setTender3Heading(data.heading || 0);
                setTender3Speed(data.speed || 0);
                setTender3LastReceived(new Date(data.timestamp));
                console.log('Tender 3 position:', [data.lat, data.lon], 'Tender 3 Heading:', data.heading, 'Tender 3 Speed:', data.speed);
            }
        };
        const handleTender4Update = (snapshot) => {
            const data = snapshot.val();
            if (data && data.lat && data.lon) {
                setTender4Position([data.lat, data.lon]);
                setTender4Heading(data.heading || 0);
                setTender4Speed(data.speed || 0);
                setTender4LastReceived(new Date(data.timestamp));
                console.log('Tender 4 position:', [data.lat, data.lon], 'Tender 4 Heading:', data.heading, 'Tender 4 Speed:', data.speed);
            }
        };

        onValue(shipRef, handleShipUpdate);
        onValue(tender3Ref, handleTender3Update);
        onValue(tender4Ref, handleTender4Update);

        return () => {
            off(shipRef, 'value', handleShipUpdate);
            off(tender3Ref, 'value', handleTender3Update);
            off(tender4Ref, 'value', handleTender4Update);
        };
    }, []);

    useEffect(() => {
        if (!mapCenter && shipPosition && Array.isArray(shipPosition)) {
            setMapCenter(shipPosition);
            lastAnimatedPositionRef.current = shipPosition;
        }
    }, [shipPosition, mapCenter]);

    if (!mapCenter || !shipPosition) {
        return (
            <div className="loading-container">
                <span className="loader"></span>
            </div>
        );
    }

    function CenterMapButton({ position }) {
        const map = useMap();
        return (
            <button className="center-map-btn" onClick={() => map.flyTo(position, map.getZoom(), { animate: true, duration: 1.5 })}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="#fff" strokeWidth="2" />
                    <circle cx="12" cy="12" r="3" fill="#fff" />
                    <line x1="12" y1="2" x2="12" y2="6" stroke="#fff" strokeWidth="2" />
                    <line x1="12" y1="18" x2="12" y2="22" stroke="#fff" strokeWidth="2" />
                    <line x1="2" y1="12" x2="6" y2="12" stroke="#fff" strokeWidth="2" />
                    <line x1="18" y1="12" x2="22" y2="12" strokeWidth="2" />
                </svg>
                <span>Evrima</span>
            </button>
        );
    }

    function CenterPierButton({ position }) {
        const map = useMap();
        return (
            <button
                className="center-map-btn pier-btn"
                style={{ top: 60 }}
                onClick={() => map.flyTo(position, 16, { animate: true, duration: 1.5 })}
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="#fff" strokeWidth="2" />
                    <circle cx="12" cy="12" r="3" fill="#fff" />
                    <line x1="12" y1="2" x2="12" y2="6" stroke="#fff" strokeWidth="2" />
                    <line x1="12" y1="18" x2="12" y2="22" stroke="#fff" strokeWidth="2" />
                    <line x1="2" y1="12" x2="6" y2="12" stroke="#fff" strokeWidth="2" />
                    <line x1="18" y1="12" x2="22" y2="12" strokeWidth="2" />
                </svg>
                <span>Pier</span>
            </button>
        );
    }

    // Toast component
    function Toast({ message }) {
        return (
            <div className='toast'>
                {message}
            </div>
        );
    }

    return (
        <>
            {showToast && <Toast message="Coordinates copied." />}
            <MapContainer
                center={mapCenter}
                zoom={16}
                minZoom={14}
                maxZoom={16.5}
                scrollWheelZoom={true}
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    url="https://tiles.stadiamaps.com/tiles/alidade_satellite/{z}/{x}/{y}{r}.jpg??api_key=b86c5acf-0c86-4560-b72f-5657b6b741e5"
                    attribution='&copy; CNES, Airbus DS, PlanetObserver, Copernicus | &copy; <a href="https://www.stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />
                <Marker
                    key={shipHeading} // <-- Add this line
                    position={shipPosition}
                    icon={shipIcon}
                    rotationAngle={shipHeading - 90}
                    rotationOrigin="60px 8.5px" // <-- Adjusted to match the icon anchor
                    ref={shipMarkerRef}
                    zIndexOffset={100}
                >
                    <Popup className="custom-popup">
                        Evrima<br />
                        {shipLastReceived && (
                            <span style={{ fontSize: '0.7em', color: '#aaa' }}>
                                LAST RECEIVED: {shipLastReceived.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                            </span>
                        )}
                    </Popup>
                </Marker>

                {/* {tender3Position && (
                    <Marker
                        key={tender3Heading}
                        position={tender3Position}
                        icon={tenderIcon}
                        rotationAngle={tender3Heading - 90}
                        rotationOrigin="center"
                        ref={tender3MarkerRef}
                        zIndexOffset={1001}
                    >
                        <Popup className="custom-popup">
                            Tender 3<br />
                            {tender3LastReceived && (
                                <span style={{ fontSize: '0.7em', color: '#aaa' }}>
                                    LAST RECEIVED: {tender3LastReceived.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                                </span>
                            )}
                        </Popup>
                    </Marker>
                )}
                {tender4Position && (
                    <Marker
                        key={tender4Heading}
                        position={tender4Position}
                        icon={tenderIcon}
                        rotationAngle={tender4Heading - 90}
                        rotationOrigin="center"
                        ref={tender4MarkerRef}
                        zIndexOffset={1002}
                    >
                        <Popup className="custom-popup">
                            Tender 4<br />
                            {tender4LastReceived && (
                                <span style={{ fontSize: '0.7em', color: '#aaa' }}>
                                    LAST RECEIVED: {tender4LastReceived.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                                </span>
                            )}
                        </Popup>
                    </Marker>
                )} */}

                {pierLocation && (
                    <Marker position={pierLocation} icon={locationIcon} rotationAngle={0} rotationOrigin="center">
                        <Popup className="custom-popup">
                            <div className='pier-popup'>
                                <strong>Pier Location</strong>
                                <span className='pier-popup-span'>
                                    Lat: {pierLocation[0].toFixed(2)} <br /> Long: {pierLocation[1].toFixed(2)}
                                    <button className='copy-coordinates-btn'
                                        onClick={() => {
                                            navigator.clipboard.writeText(
                                                `${pierLocation[0].toFixed(6)}, ${pierLocation[1].toFixed(6)}`
                                            );
                                            setShowToast(true);
                                            setTimeout(() => setShowToast(false), 1800);
                                        }}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="800px" height="800px" viewBox="0 0 24 24" fill="none">
                                            <path d="M7.5 3H14.6C16.8402 3 17.9603 3 18.816 3.43597C19.5686 3.81947 20.1805 4.43139 20.564 5.18404C21 6.03969 21 7.15979 21 9.4V16.5M6.2 21H14.3C15.4201 21 15.9802 21 16.408 20.782C16.7843 20.5903 17.0903 20.2843 17.282 19.908C17.5 19.4802 17.5 18.9201 17.5 17.8V9.7C17.5 8.57989 17.5 8.01984 17.282 7.59202C17.0903 7.21569 16.7843 6.90973 16.408 6.71799C15.9802 6.5 15.4201 6.5 14.3 6.5H6.2C5.0799 6.5 4.51984 6.5 4.09202 6.71799C3.71569 6.90973 3.40973 7.21569 3.21799 7.59202C3 8.01984 3 8.57989 3 9.7V17.8C3 18.9201 3 19.4802 3.21799 19.908C3.40973 20.2843 3.71569 20.5903 4.09202 20.782C4.51984 21 5.0799 21 6.2 21Z" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </button>
                                </span>
                            </div>
                        </Popup>
                    </Marker>
                )}

                {shipPosition && <CenterMapButton position={shipPosition} />}
                {pierLocation && <CenterPierButton position={pierLocation} />}
                {pierLocation && tender1Position && (
                    <PredictedMovingMarker
                        position={tender1Position}
                        sog={tender1Speed}
                        cog={tender1Heading}
                        lastReceived={tender1LastReceived}
                        icon={tenderIcon}
                        zIndexOffset={1001}
                        name="Tender 1"
                        markerRef={tender1MarkerRef}
                        shipPosition={shipPosition}
                        pierLocation={pierLocation}
                    />
                )}
                {pierLocation && tender2Position && (
                    <PredictedMovingMarker
                        position={tender2Position}
                        sog={tender2Speed}
                        cog={tender2Heading}
                        lastReceived={tender2LastReceived}
                        icon={tenderIcon}
                        zIndexOffset={1001}
                        name="Tender 2"
                        markerRef={tender2MarkerRef}
                        shipPosition={shipPosition}
                        pierLocation={pierLocation}
                    />
                )}
                {pierLocation && tender3Position && (
                    <PredictedMovingMarker
                        position={tender3Position}
                        sog={tender3Speed}
                        cog={tender3Heading}
                        lastReceived={tender3LastReceived}
                        icon={tenderIcon}
                        zIndexOffset={1001}
                        name="Tender 3"
                        markerRef={tender3MarkerRef}
                        shipPosition={shipPosition}
                        pierLocation={pierLocation}
                    />
                )}
                {pierLocation && tender4Position && (
                    <PredictedMovingMarker
                        position={tender4Position}
                        sog={tender4Speed}
                        cog={tender4Heading}
                        lastReceived={tender4LastReceived}
                        icon={tenderIcon}
                        zIndexOffset={2002}
                        name="Tender 4"
                        markerRef={tender4MarkerRef}
                        shipPosition={shipPosition}
                        pierLocation={pierLocation}
                    />
                )}

                {/* {shipPosition && (
                    <Marker
                        position={shipPosition}
                        icon={shipDotIcon}
                        zIndexOffset={9999}
                        interactive={false}
                    />
                )} */}

                <LogZoom />
            </MapContainer>
        </>
    );
};

const LogZoom = () => {
    const map = useMap();
    useEffect(() => {
        const onZoom = () => {
            console.log('Current zoom:', map.getZoom());
        };
        map.on('zoomend', onZoom);
        // Log initial zoom
        console.log('Initial zoom:', map.getZoom());
        return () => {
            map.off('zoomend', onZoom);
        };
    }, [map]);
    return null;
};

export default ShipMapRTDB;
