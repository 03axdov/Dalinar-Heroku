import React, {useState, useEffect} from "react"
import {useNavigate} from "react-router-dom"

function Notification({show, message, type}) {
    

    return (
        <div className={"notification " + (show ? "" : "notification-hidden")}>
            {type == "success" && <img className="notification-icon" src={window.location.origin + "/static/images/blueCheck.png"}/>}
            {type == "failure" && <img className="notification-icon" src={window.location.origin + "/static/images/failure.png"}/>}
            {message}
        </div>
    )
}


export default Notification