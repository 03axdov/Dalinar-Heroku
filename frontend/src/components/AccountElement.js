import React, {useState} from "react"
import {useNavigate} from "react-router-dom"

function AccountElement({account, BACKEND_URL, idx}) {

    return (
        <div className="account-element">
            <div className="account-element-left account-element-part">
                <img className="account-element-image" src={account.image || (BACKEND_URL + "/static/images/default-profile.svg")} />
                <p className="account-element-name">{account.name}</p>
            </div>
            <div className="account-element-center account-element-part">
                <p className="account-element-downloads">{account.total_downloads} total download{account.total_downloads == 1 ? "" : "s"}</p>
            </div>
            <div className="account-element-end account-element-part">
                <p className="account-element-datasets">{account.dataset_count} dataset{account.dataset_count == 1 ? "" : "s"}</p>
                <p className="account-element-datasets" style={{marginLeft: "40px"}}>{account.model_count} model{account.model_count == 1 ? "" : "s"}</p>
            </div>
        </div>
    )
}


export default AccountElement