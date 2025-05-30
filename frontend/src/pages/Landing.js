import React, { useState } from "react"
import { useNavigate } from "react-router-dom";
import LandingImageRow from "../components/LandingImageRow"
import TitleSetter from "../components/minor/TitleSetter";
import { Helmet } from "react-helmet"

// The default page. Login not required.
function Landing({BACKEND_URL}) {
    const navigate = useNavigate()

    const imageUrlsRow1 = [
      BACKEND_URL + "/static/images/landing1.webp",
      BACKEND_URL + "/static/images/landing9.webp",
      BACKEND_URL + "/static/images/landing6.webp",
      BACKEND_URL + "/static/images/landing2.webp",
    ];
    const imageUrlsRow2 = [
        BACKEND_URL + "/static/images/landing5.avif",
        BACKEND_URL + "/static/images/landing7.webp",
        BACKEND_URL + "/static/images/landing4.webp",
        BACKEND_URL + "/static/images/landing8.webp",
    ];
    const imageUrlsRow3 = [
        BACKEND_URL + "/static/images/landing5.avif",
        BACKEND_URL + "/static/images/landing1.webp",
        BACKEND_URL + "/static/images/landing7.webp",
        BACKEND_URL + "/static/images/landing6.webp",
    ];
    const imageUrlsRow4 = [
        BACKEND_URL + "/static/images/landing5.avif",
        BACKEND_URL + "/static/images/landing8.webp",
        BACKEND_URL + "/static/images/landing2.webp",
        BACKEND_URL + "/static/images/landing9.webp",
    ];

    return (<>
        <Helmet>
            <meta
            name="description"
            content="Welcome to Dalinar - Create and train machine learning models without coding. Upload datasets, build models, and explore AI easily."
            />
        </Helmet>
        <div className="landing-container">
            <TitleSetter title="Dalinar | AI made easy" />
            <div className="landing-header">
                <div className="landing-header-left">
                    <h1 className="landing-title">Create datasets and machine learning models without coding.</h1>
                    <p className="landing-description">
                        Dalinar aims to make Artificial Intelligence intuitive.
                        It provides an easier way of handling datasets and a visual interface for model creation that make the machine learning process straightforward.
                    </p>
                    <div className="landing-header-buttons">
                        <button onClick={() => window.location.href = window.location.origin + "/accounts/login/"} type="button" className="landing-header-button landing-header-start">Get started</button>
                        <a href="https://www.youtube.com/watch?v=tQ2lUxumQV4" target="_blank" className="landing-header-button landing-header-video">
                            <span style={{marginRight: "10px", fontSize: "1.2rem"}}>&#9654;</span>
                            Watch video
                        </a>
                    </div>
                </div>
                <div className="landing-header-right">
                    <img className="landing-header-cover" src={BACKEND_URL + "/static/images/landing-cover.png"} alt="Landing cover" />
                    <LandingImageRow imageUrls={imageUrlsRow1} animationDuration={70} offset={15}/>
                    <LandingImageRow imageUrls={imageUrlsRow2} animationDuration={79} offset={30}/>
                    <LandingImageRow imageUrls={imageUrlsRow3} animationDuration={65} offset={5}/>
                    <LandingImageRow imageUrls={imageUrlsRow4} animationDuration={75} offset={25}/>
                </div>
            </div>

        </div>
    </>)
}

export default Landing