import React, { useState } from "react"
import { useNavigate } from "react-router-dom";

// The default page. Login not required.
function Landing({BACKEND_URL}) {
    const navigate = useNavigate()

    const [transformMain, setTransformMain] = useState("");
    const [transformDatasets, setTransformDatasets] = useState("");
    const [transformModels, setTransformModels] = useState("");

    const handleMouseMove = (e, i) => {
        const { width, height, left, top } = e.target.getBoundingClientRect();
        const x = e.clientX - left; // Mouse position within the element
        const y = e.clientY - top;

        const rotateX = ((y / height) - 0.5) * -3; // Rotate up/down
        const rotateY = ((x / width) - 0.5) * 3;  // Rotate left/right

        if (i == 1) {
            setTransformMain(`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`);
        } else if (i == 2) {
            setTransformDatasets(`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`);
        } else if (i == 3) {
            setTransformModels(`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`);
        }
        
    };

    const handleMouseLeave = (i) => {
        if (i == 1) {
            setTransformMain(""); // Reset the transform when the mouse leaves
        } else if (i == 2) {
            setTransformDatasets(""); // Reset the transform when the mouse leaves
        } else if (i == 3) {
            setTransformModels(""); // Reset the transform when the mouse leaves
        }
    };

    return (
        <div className="landing-container">
            <div className="landing-header">
                <div className="landing-header-col landing-header-left">
                    <h1 className="landing-title"><img className="landing-logo" src={BACKEND_URL + "/static/images/logoWhite.svg"}/>Dalinar</h1>
                    <p className="landing-description"><span className="landing-pitch">Machine learning made easy.</span> 
                    Dalinar allows users to <span className="landing-description-highlighted">create and discover</span> 
                    both <span className="landing-description-highlighted no-margin">datasets</span> and <span className="landing-description-highlighted no-margin">machine-learning models</span>, while being easy to use and providing clear instructions 
                    how datasets can be loaded into code.
                    </p>
                    

                    <div className="landing-header-buttons">
                        <button type="button" className="landing-header-button landing-header-signup" onClick={() => {
                            window.location.href = window.location.origin + "/accounts/signup/"
                        }}>
                            <img className="landing-header-button-icon" src={BACKEND_URL + "/static/images/rocket.png"} />
                            Get started
                        </button>
                        <button type="button" className="landing-header-button landing-header-explore" onClick={() => navigate("/explore")}>
                            <img className="landing-header-button-icon" src={BACKEND_URL + "/static/images/explore.png"} />
                            Explore
                        </button>
                    </div>

                    <div className="landing-support-container">
                        <p className="landing-support-text">Dalinar currently has code support for 
                            <span className="tensorflow"><img className="landing-support-logo" src={BACKEND_URL + "/static/images/tensorflow.png"} />TensorFlow </span> 
                            and <span className="pytorch"><img className="landing-support-logo" src={BACKEND_URL + "/static/images/pytorch.png"} />PyTorch</span>, but created datasets can be used in any way.</p>

                        <p className="rights-reserved">
                            <img className="copyright-icon" src={BACKEND_URL + "/static/images/copyright.png"}/>
                            2025 All rights reserved.
                        </p>
                    </div>
                </div>

                <div className="landing-header-col landing-header-right">
                    <div className="landing-header-image-container"
                    style={{
                        display: "inline-block",
                        perspective: "1000px",
                    }}
                    >
                    <img
                        src={BACKEND_URL + "/static/images/examplePage.jpg"}
                        className="landing-header-image"
                        alt="Example page"
                        style={{
                        width: "100%",
                        height: "100%",
                        transform: transformMain,
                        transition: "transform 0.1s ease",
                        }}
                        onMouseMove={(e) => {handleMouseMove(e, 1)}}
                        onMouseLeave={() => handleMouseLeave(1)}
                    />
                    </div>
                </div>
            </div>

            <div className="landing-datasets">
                <div className="landing-header-col landing-header-right" style={{border: "1px solid var(--border)", borderLeft: "none"}}>
                    <div className="landing-header-image-container"
                    style={{
                        display: "inline-block",
                        perspective: "1000px",
                    }}
                    >
                    <img
                        src={BACKEND_URL + "/static/images/exampleClassification.jpg"}
                        className="landing-header-image"
                        alt="Example page"
                        style={{
                        width: "100%",
                        height: "100%",
                        transform: transformDatasets,
                        transition: "transform 0.1s ease",
                        }}
                        onMouseMove={(e) => handleMouseMove(e, 2)}
                        onMouseLeave={() => handleMouseLeave(2)}
                    />
                    </div>
                </div>

                <div className="landing-header-col landing-header-left">
                    <h1 className="landing-title"><img className="landing-logo" src={BACKEND_URL + "/static/images/classification.png"}/>Dataset Creation</h1>
                    <p className="landing-description">
                        Dalinar allows users to create both classification (text and image) and area (image) datasets.
                        It's <span className="landing-description-highlighted">straightforward, intuitive and fast.</span>
                        <br></br>
                        <br></br>
                        These datasets can then be downloaded in two different formats for image datasets: folders as labels or filenames as label,
                        and three different formats for text datasets: folders as labels, filenames as labels, or as a .csv file.
                    </p>
                    

                    <div className="landing-header-buttons">
                        <button type="button" className="landing-header-button landing-header-signup" onClick={() => {
                            window.location.href = window.location.origin + "/accounts/signup/"
                        }}>
                            <img className="landing-header-button-icon" src={BACKEND_URL + "/static/images/rocket.png"} />
                            Get started
                        </button>
                        <button type="button" className="landing-header-button landing-header-explore" onClick={() => navigate("/explore")}>
                            <img className="landing-header-button-icon" src={BACKEND_URL + "/static/images/explore.png"} />
                            Explore datasets
                        </button>
                    </div>

                </div>
            </div>

            <div className="landing-models" style={{border: "none"}}>
                <div className="landing-header-col landing-header-left">
                    <h1 className="landing-title"><img className="landing-logo" src={BACKEND_URL + "/static/images/model.svg"}/>Model Creation</h1>
                    <p className="landing-description">
                        Users can also create <span className="landing-description-highlighted">machine-learning</span>
                        models with <span className="landing-description-highlighted">no code</span> required. These models can then be downloaded
                        or directly trained on Dalinar datasets (work in progress).
                        <br></br>
                        <br></br>
                        Dalinar makes it easy to <span className="landing-description-highlighted">visualize models</span> as well as find issues through inbuilt warnings and tips. Several different layer types, activation functions,
                        optimizers, and loss functions are available.
                    </p>
                    

                    <div className="landing-header-buttons">
                        <button type="button" className="landing-header-button landing-header-signup" onClick={() => {
                            window.location.href = window.location.origin + "/accounts/signup/"
                        }}>
                            <img className="landing-header-button-icon" src={BACKEND_URL + "/static/images/rocket.png"} />
                            Get started
                        </button>
                        <button type="button" className="landing-header-button landing-header-explore" onClick={() => navigate("/explore")}>
                            <img className="landing-header-button-icon" src={BACKEND_URL + "/static/images/explore.png"} />
                            Explore models
                        </button>
                    </div>

                </div>

                <div className="landing-header-col landing-header-right" style={{border: "1px solid var(--border)", borderRight: "none"}}>
                    <div className="landing-header-image-container"
                    style={{
                        display: "inline-block",
                        perspective: "1000px",
                    }}
                    >
                    <img
                        src={BACKEND_URL + "/static/images/examplePageModel.jpg"}
                        className="landing-header-image"
                        alt="Example page"
                        style={{
                        width: "100%",
                        height: "100%",
                        transform: transformModels,
                        transition: "transform 0.1s ease",
                        }}
                        onMouseMove={(e) => handleMouseMove(e, 3)}
                        onMouseLeave={() => handleMouseLeave(3)}
                    />
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Landing