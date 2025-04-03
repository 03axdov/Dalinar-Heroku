import React, { useEffect, useRef } from "react";

const LandingImageRow = ({ imageUrls, animationDuration = 20, offset = 0 }) => {
    const trackRef = useRef(null);

    useEffect(() => {
        const track = trackRef.current;
        if (track) {
          track.style.animationDuration = `${animationDuration}s`;
          track.style.animationDelay = `-${offset}s`;
        }
    }, [animationDuration, offset]);

    return (
        <div className="landing-right-row">
        <div className="landing-right-row-track" ref={trackRef}>
            {[...imageUrls, ...imageUrls].map((url, idx) => (
            <img key={idx} src={url} className="landing-rotating-img" />
            ))}
        </div>
        </div>
    );
};

export default LandingImageRow;
