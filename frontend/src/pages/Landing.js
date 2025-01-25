import React, { useState } from "react"

// The default page. Login not required.
function Landing() {
    const [transform, setTransform] = useState("");

    const handleMouseMove = (e) => {
        const { width, height, left, top } = e.target.getBoundingClientRect();
        const x = e.clientX - left; // Mouse position within the element
        const y = e.clientY - top;

        const rotateX = ((y / height) - 0.5) * -3; // Rotate up/down
        const rotateY = ((x / width) - 0.5) * 3;  // Rotate left/right

        setTransform(`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`);
    };

    const handleMouseLeave = () => {
        setTransform(""); // Reset the transform when the mouse leaves
    };

    return (
        <div className="landing-container">
            <div className="landing-header">
                <div className="landing-header-col landing-header-left">
                    <h1 className="landing-title">Data labeling made easy</h1>
                </div>

                <div className="landing-header-col landing-header-right">
                    <div className="landing-header-image-container"
                    style={{
                        display: "inline-block",
                        perspective: "1000px",
                    }}
                    >
                    <img
                        src={window.location.origin + "/static/images/examplePage.jpg"}
                        className="landing-header-image"
                        alt="Example page"
                        style={{
                        width: "100%",
                        height: "100%",
                        transform,
                        transition: "transform 0.1s ease",
                        }}
                        onMouseMove={handleMouseMove}
                        onMouseLeave={handleMouseLeave}
                    />
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Landing