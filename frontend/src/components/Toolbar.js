import React from "react"
import {useNavigate} from "react-router-dom"

// The default page. Login not required.
function Toolbar({currentProfile, loadingCurrentProfile, checkLoggedIn, BACKEND_URL, setShowProfileBar}) {
    const navigate = useNavigate()

    const isBaseUrl = window.location.pathname === '/'; // Check if we're at the base URL
    const isGuideUrl = window.location.pathname.replaceAll("/", "") === "guide"

    function externalLink(link) {
        const URL = window.location.origin + link
        var win = window.open(URL, '_blank');
        win.focus();
    }

    return (
        <nav id="toolbar" className={(isBaseUrl ? "toolbar-landing" : "") + (isGuideUrl ? "toolbar-guide" : "")}>
            <img id="toolbar-logo" src={BACKEND_URL + "/static/images/logoWhite.svg"} onClick={() => navigate("/")}/>
            <a href="/" className="toolbar-text toolbar-title" onClick={(e) => {
                e.preventDefault()
                navigate("/")
            }}>Dalinar</a>

            <a href="/home" className={"toolbar-text " + (window.location.pathname.replaceAll("/", "") == "home" ? "toolbar-text-activated" : "")} onClick={(e) => {
                e.preventDefault()
                checkLoggedIn("/home")
            }}>Home</a>

            <a href="/explore" className={"toolbar-text " + (window.location.pathname.replaceAll("/", "") == "explore" ? "toolbar-text-activated" : "")} onClick={(e) => {
                e.preventDefault()
                navigate("/explore") 
            }}>Explore</a>

            <a href="/guide" className={"toolbar-text " + (window.location.pathname.replaceAll("/", "") == "guide" ? "toolbar-text-activated" : "")} onClick={(e) => {
                e.preventDefault()
                externalLink("/guide")
            }}>Guide <img className="toolbar-icon" src={BACKEND_URL + "/static/images/external.png"}/></a>

            {!loadingCurrentProfile && currentProfile.user === "" &&
                <div className="toolbar-auth">
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
                <div className="toolbar-auth">
                    <img className="toolbar-menu" src={BACKEND_URL + "/static/images/menu.svg"} onClick={() => {
                        setShowProfileBar(true)
                    }} />
                </div>
            }
            

        </nav>
    )
}

export default Toolbar
