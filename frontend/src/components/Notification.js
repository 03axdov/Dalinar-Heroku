import React, {useState, useEffect} from "react"
import {useNavigate} from "react-router-dom"

function Notification({show, message, type, BACKEND_URL}) {
    

    return (
        <div className={"notification " + (show ? "" : "notification-hidden")}>
            {type == "success" && <img className="notification-icon" src={BACKEND_URL + "/static/images/blueCheck.png"}/>}
            {type == "failure" && <img className="notification-icon" src={BACKEND_URL + "/static/images/failure.png"}/>}
            {message}
        </div>
    )
}


export default Notification