import React, { useState } from "react"
import { useNavigate } from "react-router-dom";
import LandingImageRow from "../components/LandingImageRow"

// The default page. Login not required.
function Landing({BACKEND_URL}) {
    const navigate = useNavigate()

    const imageUrlsRow1 = [
      BACKEND_URL + "/static/images/examplePage.jpg",
      BACKEND_URL + "/static/images/examplePage.jpg",
      BACKEND_URL + "/static/images/examplePage.jpg",
      BACKEND_URL + "/static/images/examplePage.jpg",
      BACKEND_URL + "/static/images/examplePage.jpg"
    ];

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
                    <LandingImageRow imageUrls={imageUrlsRow1} animationDuration={55} offset={10} />
                    <LandingImageRow imageUrls={imageUrlsRow1} animationDuration={60} offset={7}/>
                    <LandingImageRow imageUrls={imageUrlsRow1} animationDuration={69} offset={-10}/>
                    <LandingImageRow imageUrls={imageUrlsRow1} animationDuration={62} offset={5}/>
                    <LandingImageRow imageUrls={imageUrlsRow1} animationDuration={56} offset={9}/>
                </div>
            </div>

        </div>
    )
}

export default Landing