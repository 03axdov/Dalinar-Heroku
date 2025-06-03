import React, {useState} from "react"
import {useNavigate} from "react-router-dom"

function AccountElement({account, BACKEND_URL, loading}) {

    if (!loading) {
        return (
            <a target="_blank" href={"/accounts/" + account.name} className="account-element">

                <div className="account-element-left account-element-part">
                    <img className="account-element-image" src={account.image || (BACKEND_URL + "/static/images/default-profile.svg")} />
                    <p className="account-element-name">{account.name}</p>
                </div>

                <p className="account-element-downloads">
                    <span className="account-stat-color account-color-1"></span>
                    {account.total_downloads} total download{account.total_downloads == 1 ? "" : "s"}
                </p>

                <p className="account-element-datasets">
                    <span className="account-stat-color account-color-2"></span>
                    {account.dataset_count} dataset{account.dataset_count == 1 ? "" : "s"}
                </p>
                    
                <p className="account-element-models">
                    <span className="account-stat-color account-color-3"></span>
                    {account.model_count} model{account.model_count == 1 ? "" : "s"}
                </p>

            </a>
        )
    } else {
        return <div style={{marginTop: "40px"}}>
            <img style={{width: "16px", marginRight: "10px"}} src={BACKEND_URL + "/static/images/loading.gif"} />
            Loading users
        </div>
    }
}


export default AccountElement