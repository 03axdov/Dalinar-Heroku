import React, { useState, useEffect, useRef, useCallback } from "react"
import axios from "axios"
import { useParams, useNavigate } from "react-router-dom";
import DatasetElement from "../components/DatasetElement";
import ModelElement from "../components/ModelElement"

function Account({BACKEND_URL, notification, currentProfile}) {
    const { name } = useParams();

    const [loading, setLoading] = useState(true)
    const [updatingImage, setUpdatingImage] = useState(false)

    const [account, setAccount] = useState(null)

    const [show, setShow] = useState("datasets")

    const [hoveringImage, setHoveringImage] = useState(false)

    const imageInputRef = useRef(null)

    useEffect(() => {
        getAccount()
    }, [])

    const getAccount = () => {
        setLoading(true)

        let URL = window.location.origin + "/api/accounts/" + name

        axios({
            method: 'GET',
            url: URL
        })
        .then((res) => {
            console.log(res.data)

            setAccount(res.data)


        }).catch((err) => {
            notification("An error occured while loading account.", "failure")
            console.log(err)
        }).finally(() => {
            setLoading(false)
        })
        
    }

    function updateImage(file) {
        if (updatingImage) return
        setUpdatingImage(true)

        axios.defaults.withCredentials = true;
        axios.defaults.xsrfHeaderName = 'X-CSRFTOKEN';
        axios.defaults.xsrfCookieName = 'csrftoken'; 

        let formData = new FormData()

        formData.append('image', file)

        const URL = window.location.origin + '/api/update-profile-image/'
        const config = {headers: {'Content-Type': 'multipart/form-data'}}

        axios.post(URL, formData, config)
        .then((res) => {
            
            setAccount((prev) => {
                let temp = {...prev}
                temp.image = res.data.image
                return temp
            })
            
        }).catch((error) => {
            notification("An error occured.", "failure")
            console.log("Error: ", error)
        }).finally(() => {
            setUpdatingImage(false)

        })
    }

    function imageOnClick() {
        if (imageInputRef.current) {
            imageInputRef.current.click()
        }
    }

    return (<div className="account-container">
        {account && !loading && <div className="account-inner">
            {account && <div className="account-left">
                

                <div onMouseEnter={() => setHoveringImage(true)} onMouseLeave={() => setHoveringImage(false)} className="account-image-outer">
                    {((currentProfile.user == account.user && hoveringImage) || updatingImage) && <div className="change-profile-image" onClick={() => {
                        if (!updatingImage) {
                            imageOnClick()
                        }
                    }}>
                        <input type="file" accept="image/png, image/jpeg, image/webp" required className="hidden" ref={imageInputRef} onChange={(e) => {
                            if (e.target.files[0]) {
                                updateImage(e.target.files[0])
                            }
                        }} />
                        <img src={BACKEND_URL + "/static/images/" + (updatingImage ? "loading.gif" : "image.png")} style={{height: "18px", marginRight: "10px"}}/>
                        {updatingImage ? "Updating..." : "Update image"}
                    </div>}
                    <img className="account-image" src={account.image || (BACKEND_URL + "/static/images/default-profile.svg")} />
                </div>
                <p className="account-name" title={account.name}>{account.name}</p>
                <p className="account-stat">
                    <span className="account-stat-color account-color-1"></span>
                    {account.datasets.length} dataset{account.datasets.length == 1 ? "" : "s"}
                </p>
                <p className="account-stat">
                    <span className="account-stat-color account-color-2"></span>
                    {account.models.length} model{account.models.length == 1 ? "" : "s"}
                </p>
            </div>}
            {account && <div className="account-right">
                <div className="account-right-header">
                    <div className={"account-right-datasets " + (show == "datasets" ? "account-right-selected" : "")} onClick={(e) => setShow("datasets")}>Datasets</div>
                    <div className={"account-right-models " + (show == "models" ? "account-right-selected" : "")} onClick={(e) => setShow("models")}>Models</div>
                </div>

                <div className="account-right-elements">
                    {show == "datasets" && account.datasets.map((dataset) => (
                        <DatasetElement dataset={dataset} key={dataset.id} BACKEND_URL={BACKEND_URL} isPublic={true}/>
                    ))}
                    {show == "datasets" && account.datasets.length == 0 && <p>This user does not have any datasets.</p>}
                    {show == "models" && account.models.map((model) => (
                        <ModelElement model={model} key={model.id} BACKEND_URL={BACKEND_URL} isPublic={true}/>
                    ))}
                    {show == "models" && account.models.length == 0 && <p>This user does not have any models.</p>}
                </div>
            </div>}
        </div>}

        {!account && loading && <img style={{height: "30px", width: "30px"}} src={BACKEND_URL + "/static/images/loading.gif"} />}
    </div>)
}

export default Account