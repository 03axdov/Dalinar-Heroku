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

            <p className="toolbar-text toolbar-right" onClick={() => navigate("/login")}>Sign in</p>
            <button className="toolbar-button toolbar-register" onClick={() => navigate("/register")}>Register</button>
        </nav>
    )
}

export default Toolbar
