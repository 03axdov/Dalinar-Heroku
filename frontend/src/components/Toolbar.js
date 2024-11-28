import React from "react"
import {useNavigate} from "react-router-dom"

// The default page. Login not required.
function Toolbar() {
    const navigate = useNavigate()

    return (
        <nav id="toolbar">
            <img id="toolbar-logo" src="static/images/logoToolbar.jpg" onClick={() => navigate("/")}/>
            <p className="toolbar-text" onClick={() => navigate("/")}>Solutions</p>
            <p className="toolbar-text" onClick={() => navigate("/home")}>Home</p>

            <p className="toolbar-text toolbar-right" onClick={() => {
                window.location.href = window.location.origin + "/accounts/login/"
                }}>Sign in</p>
            <button className="toolbar-button toolbar-register" onClick={() => {
                window.location.href = window.location.origin + "/accounts/signup/"
                }}>Register</button>
        </nav>
    )
}

export default Toolbar
