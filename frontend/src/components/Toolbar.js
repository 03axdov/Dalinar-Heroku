import React, { useState } from "react"
import {useNavigate} from "react-router-dom"

// The default page. Login not required.
function Toolbar({currentProfile, loadingCurrentProfile, checkLoggedIn, BACKEND_URL, setShowProfileBar}) {
    const navigate = useNavigate()

    const [showMobileToolbar, setShowMobileToolbar] = useState(false)

    const isBaseUrl = window.location.pathname === '/'; // Check if we're at the base URL
    const isGuideUrl = window.location.pathname.replaceAll("/", "") === "guide"

    function externalLink(link) {
        const URL = window.location.origin + link
        var win = window.open(URL, '_blank');
        win.focus();
    }

    return (<>
        <nav id="toolbar" className={(isBaseUrl ? "toolbar-landing" : "") + (isGuideUrl ? "toolbar-guide" : "")}>
            <img id="toolbar-logo" src={BACKEND_URL + "/static/images/logoWhite.svg"} alt="Logo" onClick={() => navigate("/")}/>
            <a href="/" className="toolbar-text toolbar-title" onClick={(e) => {
                e.preventDefault()
                navigate("/")
            }}>Dalinar</a>

            <a href="/home" className={"toolbar-text toolbar-mobile-hide " + (window.location.pathname.replaceAll("/", "") == "home" ? "toolbar-text-activated" : "")} onClick={(e) => {
                e.preventDefault()
                checkLoggedIn("/home")
            }}>Home</a>

            <a href="/explore" className={"toolbar-text toolbar-mobile-hide " + (window.location.pathname.replaceAll("/", "") == "explore" ? "toolbar-text-activated" : "")} onClick={(e) => {
                e.preventDefault()
                navigate("/explore") 
            }}>Explore</a>

            <a href="/guide" className={"toolbar-text toolbar-mobile-hide " + (window.location.pathname.replaceAll("/", "") == "guide" ? "toolbar-text-activated" : "")} onClick={(e) => {
                e.preventDefault()
                externalLink("/guide")
            }}>Guide <img className="toolbar-icon" src={BACKEND_URL + "/static/images/external.png"} alt="External" /></a>

            {!loadingCurrentProfile && currentProfile.user === "" &&
                <div className="toolbar-auth toolbar-mobile-hide">
                    <a className="toolbar-text" href="/accounts/signup" onClick={(e) => {
                        e.preventDefault()
                        window.location.href = window.location.origin + "/accounts/signup/"
                    }}>Register</a>
                    <a href="/accounts/login" className="toolbar-button toolbar-register" onClick={(e) => {
                        e.preventDefault()
                        window.location.href = window.location.origin + "/accounts/login/"
                    }}>Sign in</a>

                </div>
            }
            {!loadingCurrentProfile && currentProfile.user !== "" &&
                <div className="toolbar-auth toolbar-mobile-hide">
                    <img className="toolbar-menu" src={BACKEND_URL + "/static/images/menu.svg"} alt="Menu" onClick={() => {
                        setShowProfileBar(true)
                    }} />
                </div>
            }

            <div className="toolbar-auth toolbar-mobile-show">
                <img className="toolbar-menu" src={BACKEND_URL + "/static/images/menu.svg"} alt="Menu" onClick={() => {
                    setShowMobileToolbar(true)
                }} />
            </div>
            

        </nav>
        {showMobileToolbar && <nav className="toolbar-mobile">
            <img className="close-toolbar-mobile" src={BACKEND_URL + "/static/images/cross.svg"} onClick={() => setShowMobileToolbar(false)}/>

            <a href="/home" className={"toolbar-mobile-text " + (window.location.pathname.replaceAll("/", "") == "home" ? "toolbar-text-activated" : "")} onClick={(e) => {
                e.preventDefault()
                setShowMobileToolbar(false)
                checkLoggedIn("/home")
            }}>Home</a>

            <a href="/explore" className={"toolbar-mobile-text " + (window.location.pathname.replaceAll("/", "") == "explore" ? "toolbar-text-activated" : "")} onClick={(e) => {
                e.preventDefault()
                setShowMobileToolbar(false)
                navigate("/explore") 
            }}>Explore</a>

            <a href="/guide" className={"toolbar-mobile-text " + (window.location.pathname.replaceAll("/", "") == "guide" ? "toolbar-text-activated" : "")} onClick={(e) => {
                e.preventDefault()
                setShowMobileToolbar(false)
                externalLink("/guide")
            }}>Guide <img className="toolbar-icon" src={BACKEND_URL + "/static/images/external.png"} alt="External" /></a>

            {!loadingCurrentProfile && currentProfile.user === "" &&
                <div className="toolbar-mobile-auth">
                    <a className="toolbar-mobile-text" href="/accounts/signup" onClick={(e) => {
                        e.preventDefault()
                        window.location.href = window.location.origin + "/accounts/signup/"
                    }}>Register</a>
                    <a href="/accounts/login" className="toolbar-button no-margin toolbar-register" onClick={(e) => {
                        e.preventDefault()
                        window.location.href = window.location.origin + "/accounts/login/"
                    }}>Sign in</a>

                </div>
            }
            {!loadingCurrentProfile && currentProfile.user !== "" &&
                <div className="toolbar-mobile-auth">
                    <p className="toolbar-mobile-text" onClick={() => {
                        setShowMobileToolbar(false)
                        setShowProfileBar(true)
                    }}>
                        Profile
                    </p>
                </div>
            }
            
        </nav>}
    </>)
}

export default Toolbar
