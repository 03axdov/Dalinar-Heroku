import React, { useState } from "react"
import { useNavigate } from "react-router-dom";

// The default page. Login not required.
function Landing({BACKEND_URL}) {
    const navigate = useNavigate()

    return (
        <div className="landing-container">
            <div className="landing-header">
                <div className="landing-header-left">
                    <h1 className="landing-title">Create datasets and machine learning models without coding.</h1>
                    <p className="landing-description">
                        Dalinar aims to make Artificial Intelligence intuitive.
                        It provides an easier way of handling datasets and a visual interface for model creation that make the machine learning process straightforward.
                    </p>
                    <div className="landing-header-buttons">
                        <button onClick={() => window.location.href = window.location.origin + "/accounts/login/"} type="button" className="landing-header-button landing-header-start">Get started</button>
                        <button onClick={() => navigate("/explore")} type="button" className="landing-header-button landing-header-explore">Explore</button>
                    </div>
                </div>
                <div className="landing-header-right">
                    <img className="landing-header-cover" src={BACKEND_URL + "/static/images/landing-cover.png"} />
                </div>
            </div>

        </div>
    )
}

export default Landing