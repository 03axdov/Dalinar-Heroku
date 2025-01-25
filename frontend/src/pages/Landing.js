import React from "react"

// The default page. Login not required.
function Landing() {
    return (
        <div className="landing-container">
            <div className="landing-header">
                <div className="landing-header-col landing-header-left">
                    <h1 className="landing-title">Data labeling made easy</h1>
                </div>

                <div className="landing-header-col landing-header-right">
                    <img className="landing-header-image" src={window.location.origin + "/static/images/examplePage.jpg"} alt="Example page" />
                </div>
            </div>
        </div>
    )
}

export default Landing