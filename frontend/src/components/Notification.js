import React, {useState, useEffect} from "react"
import {useNavigate} from "react-router-dom"

function Notification({show, message, type, BACKEND_URL, notificationHover}) {

    const [hidden, setHidden] = useState(!show)

    useEffect(() => {
        if (!show) {
            setTimeout(() => {
                setHidden(true)
            }, 200)
        } else {
            setHidden(false)
        }
    }, [show])

    return (
        <div className={"notification " + (hidden ? "notification-hidden " : " ") + (show ? "" : "notification-faded")}
        onMouseEnter={() => {
            notificationHover.current = true
        }}
        onMouseLeave={() => notificationHover.current = false}>
            {type == "success" && <img className="notification-icon" src={BACKEND_URL + "/static/images/blueCheck.png"} alt="Blue checkmark" />}
            {type == "warning" && <img className="notification-icon" src={BACKEND_URL + "/static/images/warning.png"} alt="Warning" />}
            {type == "failure" && <img className="notification-icon" src={BACKEND_URL + "/static/images/failure.png"} alt="Failure" />}
            {message}
        </div>
    )
}


export default Notification