import React, { useState } from "react"
import { useNavigate } from "react-router-dom";

// The default page. Login not required.
function Guide() {
    const navigate = useNavigate()
    return (
        <div className="guide-container">
            <div className="home-sidebar">

            </div>
        </div>
    )
}

export default Guide