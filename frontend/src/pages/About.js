import React, { useState } from "react"
import { useNavigate } from "react-router-dom";

// The default page. Login not required.
function About() {
    const navigate = useNavigate()
    return (
        <div className="about-container">
            About
        </div>
    )
}

export default About